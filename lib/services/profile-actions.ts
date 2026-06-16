'use server';

import { createClient } from '@/lib/supabase/server';
import { resolveServerAuthContext } from '@/lib/auth/context';
import {
  ChangePasswordSchema,
  UpdateMyProfileSchema,
} from '@/lib/validations/auth';
import { ZodError } from 'zod';

const DOCUMENTS_BUCKET = 'clinic-documents';
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const PHOTO_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/heic']);
const PHOTO_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.heic']);

function formatZodError(err: ZodError): string {
  return err.issues.map((e) => e.message).join(', ');
}

function fileExtension(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i).toLowerCase() : '';
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
}

function isPhotoFile(file: File): boolean {
  if (PHOTO_MIME.has(file.type)) return true;
  return PHOTO_EXTENSIONS.has(fileExtension(file.name));
}

export async function getMyProfileAction() {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) {
      return { success: false as const, error: 'Unauthorized' };
    }

    const supabase = await createClient();
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('first_name, last_name, phone, avatar_url')
      .eq('id', ctx.userId)
      .single();

    if (error || !profile) {
      return { success: false as const, error: 'Profile not found.' };
    }

    let photoUrl: string | null = null;
    if (profile.avatar_url) {
      photoUrl = '/api/profile/photo';
    }

    return {
      success: true as const,
      profile: {
        email: ctx.email,
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        phone: profile.phone || '',
        role: ctx.role,
        photoUrl,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load profile.';
    return { success: false as const, error: message };
  }
}

export async function updateMyProfileAction(payload: unknown) {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) {
      return { success: false as const, error: 'Unauthorized' };
    }

    const parsed = UpdateMyProfileSchema.parse(payload);
    const supabase = await createClient();

    const { error } = await supabase
      .from('user_profiles')
      .update({
        first_name: parsed.firstName.trim(),
        last_name: parsed.lastName.trim(),
        phone: parsed.phone.trim(),
      })
      .eq('id', ctx.userId);

    if (error) {
      return { success: false as const, error: error.message || 'Failed to update profile.' };
    }

    return { success: true as const };
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      return { success: false as const, error: formatZodError(err) };
    }
    const message = err instanceof Error ? err.message : 'Failed to update profile.';
    return { success: false as const, error: message };
  }
}

export async function changeMyPasswordAction(payload: unknown) {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) {
      return { success: false as const, error: 'Unauthorized' };
    }

    const parsed = ChangePasswordSchema.parse(payload);
    const supabase = await createClient();

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: ctx.email,
      password: parsed.currentPassword,
    });

    if (signInError) {
      return { success: false as const, error: 'Current password is incorrect.' };
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: parsed.newPassword,
    });

    if (updateError) {
      return { success: false as const, error: updateError.message || 'Failed to change password.' };
    }

    return { success: true as const };
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      return { success: false as const, error: formatZodError(err) };
    }
    const message = err instanceof Error ? err.message : 'Failed to change password.';
    return { success: false as const, error: message };
  }
}

export async function uploadMyAvatarAction(formData: FormData) {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) {
      return { success: false as const, error: 'Unauthorized' };
    }
    if (!ctx.organizationId) {
      return { success: false as const, error: 'Organization context required.' };
    }

    const file = formData.get('file');
    if (!(file instanceof File) || file.size === 0) {
      return { success: false as const, error: 'No file provided.' };
    }
    if (file.size > MAX_PHOTO_BYTES) {
      return { success: false as const, error: 'Photo exceeds the 8 MB limit.' };
    }
    if (!isPhotoFile(file)) {
      return { success: false as const, error: 'Unsupported image type. Use JPG, PNG, or WebP.' };
    }

    const supabase = await createClient();
    const safeName = sanitizeFileName(file.name);
    const storagePath = `${ctx.organizationId}/user-avatars/${ctx.userId}/${Date.now()}-${safeName}`;

    const { data: existing } = await supabase
      .from('user_profiles')
      .select('avatar_url')
      .eq('id', ctx.userId)
      .single();

    if (existing?.avatar_url) {
      await supabase.storage.from(DOCUMENTS_BUCKET).remove([existing.avatar_url]);
    }

    const arrayBuffer = await file.arrayBuffer();
    const contentType =
      file.type && file.type !== 'application/octet-stream'
        ? file.type
        : fileExtension(safeName) === '.png'
          ? 'image/png'
          : 'image/jpeg';

    const { error: uploadError } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .upload(storagePath, arrayBuffer, { contentType, upsert: true });

    if (uploadError) {
      return { success: false as const, error: uploadError.message || 'Failed to upload photo.' };
    }

    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({ avatar_url: storagePath })
      .eq('id', ctx.userId);

    if (profileError) {
      await supabase.storage.from(DOCUMENTS_BUCKET).remove([storagePath]);
      return { success: false as const, error: profileError.message || 'Failed to save profile photo.' };
    }

    return { success: true as const, photoUrl: `/api/profile/photo?v=${Date.now()}` };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to upload photo.';
    return { success: false as const, error: message };
  }
}
