'use server';

import { z } from 'zod';
import {
  assertCapability,
  assertFeature,
  assertOrganization,
  assertBranchAccess,
  resolveServerAuthContext,
} from '@/lib/auth/context';
import { chatCompletion } from '@/lib/ai/llm-client';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { writeAuditLog } from '@/lib/services/audit';
import { encryptToken, decryptToken } from '@/lib/social/token-crypto';
import {
  fetchPages,
  publishFacebookPost,
  publishInstagramPost,
  isMetaConfigured,
} from '@/lib/social/meta-client';
import { EntityIdSchema } from '@/lib/validations/schemas';

const GenerateSchema = z.object({
  platform: z.enum(['facebook', 'instagram', 'twitter', 'generic']),
  topic: z.string().min(3).max(500),
  tone: z.enum(['friendly', 'professional', 'playful']).default('friendly'),
});

const SaveSchema = z.object({
  platform: z.enum(['facebook', 'instagram', 'twitter', 'generic']),
  content: z.string().min(10).max(2200),
  branchId: EntityIdSchema,
  imagePath: z.string().optional().nullable(),
  scheduledAt: z.string().datetime().optional().nullable(),
});

const DeleteSchema = z.object({
  postId: EntityIdSchema,
});

const PublishSchema = z.object({
  postId: EntityIdSchema,
});

const DisconnectSchema = z.object({
  branchId: EntityIdSchema,
  platform: z.enum(['facebook', 'instagram']),
});

const SelectPageSchema = z.object({
  pendingId: EntityIdSchema,
  pageId: z.string().min(1),
});

export type SocialConnectionPublic = {
  platform: string;
  page_name: string | null;
  ig_username: string | null;
  connected_at: string;
};

function publicImageUrl(imagePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return `${base}/storage/v1/object/public/social-media/${imagePath}`;
}

function assertSocialAccess(ctx: Awaited<ReturnType<typeof resolveServerAuthContext>>) {
  if (!ctx) throw new Error('Unauthorized');
  assertOrganization(ctx);
  assertCapability(ctx, 'manage_social');
  assertFeature(ctx, 'social_automation');
}

export async function generateSocialPostAction(payload: unknown) {
  try {
    const ctx = await resolveServerAuthContext();
    assertSocialAccess(ctx);
    const parsed = GenerateSchema.parse(payload);
    const orgName = ctx!.organizationName || 'our clinic';

    const charLimit = parsed.platform === 'twitter' ? 280 : parsed.platform === 'instagram' ? 2200 : 500;
    const prompt = `Write a ${parsed.tone} social media post for ${parsed.platform} for a veterinary clinic named "${orgName}".
Topic: ${parsed.topic}
Keep under ${charLimit} characters. Include 2-3 relevant hashtags. No markdown. Return only the post text.`;

    const result = await chatCompletion(
      [
        {
          role: 'system',
          content:
            'You write engaging, compliant veterinary clinic social posts. Never make false medical claims.',
        },
        { role: 'user', content: prompt },
      ],
      { maxTokens: 500, temperature: 0.7 }
    );

    if ('error' in result) return { success: false, error: result.error };
    return { success: true, content: result.content };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to generate post.',
    };
  }
}

export async function saveSocialPostAction(payload: unknown) {
  try {
    const ctx = await resolveServerAuthContext();
    assertSocialAccess(ctx);
    const parsed = SaveSchema.parse(payload);
    assertBranchAccess(ctx!, parsed.branchId);

    const supabase = await createClient();
    const status = parsed.scheduledAt ? 'scheduled' : 'draft';

    const { data, error } = await supabase
      .from('social_posts')
      .insert({
        organization_id: ctx!.organizationId,
        branch_id: parsed.branchId,
        platform: parsed.platform,
        content: parsed.content,
        image_path: parsed.imagePath || null,
        status,
        scheduled_at: parsed.scheduledAt || null,
        created_by: ctx!.userId,
      })
      .select('id, platform, content, status, image_path, scheduled_at, created_at')
      .single();

    if (error || !data) throw new Error(error?.message || 'Failed to save post.');

    await writeAuditLog({
      organizationId: ctx!.organizationId,
      branchId: parsed.branchId,
      actorUserId: ctx!.userId,
      actorRole: ctx!.role || 'clinic_admin',
      action: 'SOCIAL_POST_SAVED',
      resourceType: 'SOCIAL_POST',
      resourceId: data.id,
      afterData: { platform: data.platform, status: data.status },
    });

    return { success: true, post: data };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to save post.',
    };
  }
}

export async function deleteSocialPostAction(payload: unknown) {
  try {
    const ctx = await resolveServerAuthContext();
    assertSocialAccess(ctx);
    const { postId } = DeleteSchema.parse(payload);
    const supabase = await createClient();

    const { error } = await supabase
      .from('social_posts')
      .delete()
      .eq('id', postId)
      .eq('organization_id', ctx!.organizationId);

    if (error) throw new Error(error.message);
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete post.',
    };
  }
}

export async function listSocialPostsAction(branchId: string) {
  try {
    const ctx = await resolveServerAuthContext();
    assertSocialAccess(ctx);
    assertBranchAccess(ctx!, branchId);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('social_posts')
      .select(
        'id, platform, content, status, image_path, scheduled_at, created_at, published_at, external_post_id, publish_error'
      )
      .eq('organization_id', ctx!.organizationId)
      .eq('branch_id', branchId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);
    return { success: true, posts: data ?? [] };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to load posts.',
      posts: [],
    };
  }
}

export async function listSocialConnectionsAction(branchId: string) {
  try {
    const ctx = await resolveServerAuthContext();
    assertSocialAccess(ctx);
    assertBranchAccess(ctx!, branchId);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('social_connections')
      .select('platform, page_name, ig_username, connected_at')
      .eq('organization_id', ctx!.organizationId)
      .eq('branch_id', branchId);

    if (error) throw new Error(error.message);

    return {
      success: true,
      connections: (data ?? []) as SocialConnectionPublic[],
      metaConfigured: isMetaConfigured(),
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to load connections.',
      connections: [] as SocialConnectionPublic[],
      metaConfigured: isMetaConfigured(),
    };
  }
}

export async function disconnectSocialAction(payload: unknown) {
  try {
    const ctx = await resolveServerAuthContext();
    assertSocialAccess(ctx);
    const parsed = DisconnectSchema.parse(payload);
    assertBranchAccess(ctx!, parsed.branchId);

    const supabase = await createClient();
    const { error } = await supabase
      .from('social_connections')
      .delete()
      .eq('organization_id', ctx!.organizationId)
      .eq('branch_id', parsed.branchId)
      .eq('platform', parsed.platform);

    if (error) throw new Error(error.message);

    await writeAuditLog({
      organizationId: ctx!.organizationId,
      branchId: parsed.branchId,
      actorUserId: ctx!.userId,
      actorRole: ctx!.role || 'clinic_admin',
      action: 'SOCIAL_CONNECTION_REMOVED',
      resourceType: 'SOCIAL_CONNECTION',
      afterData: { platform: parsed.platform },
    });

    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to disconnect.',
    };
  }
}

export async function listPendingMetaPagesAction(pendingId: string) {
  try {
    const ctx = await resolveServerAuthContext();
    assertSocialAccess(ctx);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('social_oauth_pending')
      .select('id, platform, branch_id, pages_json, expires_at')
      .eq('id', pendingId)
      .eq('user_id', ctx!.userId)
      .single();

    if (error || !data) throw new Error('Page selection session expired. Please connect again.');
    if (new Date(data.expires_at) < new Date()) {
      throw new Error('Page selection session expired. Please connect again.');
    }

    return {
      success: true,
      pendingId: data.id,
      platform: data.platform as 'facebook' | 'instagram',
      branchId: data.branch_id,
      pages: data.pages_json as Array<{ id: string; name: string; ig_username?: string }>,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to load pages.',
      pages: [],
    };
  }
}

export async function selectMetaPageAction(payload: unknown) {
  try {
    const ctx = await resolveServerAuthContext();
    assertSocialAccess(ctx);
    const parsed = SelectPageSchema.parse(payload);

    const admin = await createAdminClient();
    const { data: pending, error: pendingErr } = await admin
      .from('social_oauth_pending')
      .select('*')
      .eq('id', parsed.pendingId)
      .eq('user_id', ctx!.userId)
      .single();

    if (pendingErr || !pending) {
      throw new Error('Page selection session expired. Please connect again.');
    }
    if (new Date(pending.expires_at) < new Date()) {
      throw new Error('Page selection session expired. Please connect again.');
    }

    const userToken = decryptToken(pending.user_token_enc);
    const pages = await fetchPages(userToken);
    const page = pages.find((p) => p.id === parsed.pageId);
    if (!page) throw new Error('Selected Page not found.');

    const platform = pending.platform as 'facebook' | 'instagram';
    if (platform === 'instagram' && !page.instagram_business_account?.id) {
      throw new Error('Selected Page has no linked Instagram Business account.');
    }

    const row = {
      organization_id: pending.organization_id,
      branch_id: pending.branch_id,
      platform,
      page_id: page.id,
      page_name: page.name,
      ig_account_id:
        platform === 'instagram' ? page.instagram_business_account!.id : page.instagram_business_account?.id ?? null,
      ig_username:
        platform === 'instagram'
          ? page.instagram_business_account!.username ?? null
          : page.instagram_business_account?.username ?? null,
      access_token_enc: encryptToken(page.access_token),
      token_expires_at: null,
      connected_by: ctx!.userId,
    };

    const { error: upsertErr } = await admin.from('social_connections').upsert(row, {
      onConflict: 'branch_id,platform',
    });
    if (upsertErr) throw new Error(upsertErr.message);

    await admin.from('social_oauth_pending').delete().eq('id', parsed.pendingId);

    await writeAuditLog({
      organizationId: pending.organization_id,
      branchId: pending.branch_id,
      actorUserId: ctx!.userId,
      actorRole: ctx!.role || 'clinic_admin',
      action: 'SOCIAL_CONNECTION_CREATED',
      resourceType: 'SOCIAL_CONNECTION',
      afterData: { platform, page_id: page.id, page_name: page.name },
    });

    return { success: true, platform };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to connect Page.',
    };
  }
}

export async function uploadSocialImageAction(formData: FormData) {
  try {
    const ctx = await resolveServerAuthContext();
    assertSocialAccess(ctx);

    const branchId = formData.get('branchId') as string;
    const file = formData.get('image') as File | null;
    if (!branchId || !file?.size) throw new Error('Branch and image file are required.');
    assertBranchAccess(ctx!, branchId);

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      throw new Error('Supported formats: JPG, PNG, WebP.');
    }
    if (file.size > 8 * 1024 * 1024) {
      throw new Error('Image must be under 8MB.');
    }

    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `${ctx!.organizationId}/${branchId}/${crypto.randomUUID()}.${ext}`;

    const supabase = await createClient();
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error } = await supabase.storage.from('social-media').upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

    if (error) throw new Error(error.message);

    return { success: true, imagePath: path, imageUrl: publicImageUrl(path) };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to upload image.',
    };
  }
}

export async function publishSocialPostAction(payload: unknown) {
  try {
    const ctx = await resolveServerAuthContext();
    assertSocialAccess(ctx);
    const { postId } = PublishSchema.parse(payload);

    const admin = await createAdminClient();
    const { data: post, error: postErr } = await admin
      .from('social_posts')
      .select('*')
      .eq('id', postId)
      .eq('organization_id', ctx!.organizationId)
      .single();

    if (postErr || !post) throw new Error('Post not found.');
    assertBranchAccess(ctx!, post.branch_id);

    if (post.platform !== 'facebook' && post.platform !== 'instagram') {
      throw new Error('Only Facebook and Instagram support direct publishing.');
    }

    const { data: conn, error: connErr } = await admin
      .from('social_connections')
      .select('*')
      .eq('branch_id', post.branch_id)
      .eq('platform', post.platform)
      .single();

    if (connErr || !conn) {
      throw new Error(`Connect your ${post.platform} account for this branch first.`);
    }

    const pageToken = decryptToken(conn.access_token_enc);
    let externalId: string;

    if (post.platform === 'instagram') {
      if (!post.image_path) {
        throw new Error('Instagram requires an image. Upload one before publishing.');
      }
      if (!conn.ig_account_id) {
        throw new Error('Instagram account ID missing. Reconnect Instagram.');
      }
      externalId = await publishInstagramPost(conn.ig_account_id, pageToken, {
        caption: post.content,
        imageUrl: publicImageUrl(post.image_path),
      });
    } else {
      externalId = await publishFacebookPost(conn.page_id, pageToken, {
        message: post.content,
        imageUrl: post.image_path ? publicImageUrl(post.image_path) : undefined,
      });
    }

    const { error: updateErr } = await admin
      .from('social_posts')
      .update({
        status: 'published',
        external_post_id: externalId,
        published_at: new Date().toISOString(),
        publish_error: null,
      })
      .eq('id', postId);

    if (updateErr) throw new Error(updateErr.message);

    await writeAuditLog({
      organizationId: ctx!.organizationId,
      branchId: post.branch_id,
      actorUserId: ctx!.userId,
      actorRole: ctx!.role || 'clinic_admin',
      action: 'SOCIAL_POST_PUBLISHED',
      resourceType: 'SOCIAL_POST',
      resourceId: postId,
      afterData: { platform: post.platform, external_post_id: externalId },
    });

    return { success: true, externalPostId: externalId };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Publish failed.';
    try {
      const parsed = PublishSchema.safeParse(payload);
      if (parsed.success) {
        const admin = await createAdminClient();
        await admin
          .from('social_posts')
          .update({ status: 'failed', publish_error: message })
          .eq('id', parsed.data.postId);
      }
    } catch {
      /* ignore audit update failure */
    }
    return { success: false, error: message };
  }
}
