'use server';

import { createClient } from '@/lib/supabase/server';
import {
  assertCapability,
  assertOrganization,
  resolveServerAuthContext,
} from '@/lib/auth/context';
import { writeAuditLog } from '@/lib/services/audit';
import { DocumentMetaSchema, UpdateDocumentSchema } from '@/lib/validations/schemas';
import { ZodError } from 'zod';

const DOCUMENTS_BUCKET = 'clinic-documents';
const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15 MB
const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
  'text/plain',
  'application/octet-stream',
]);
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.heic', '.txt']);

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
}

function fileExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot).toLowerCase() : '';
}

function isAllowedFile(file: File): boolean {
  if (file.type && ALLOWED_MIME.has(file.type)) {
    if (file.type === 'application/octet-stream') {
      return ALLOWED_EXTENSIONS.has(fileExtension(file.name));
    }
    return true;
  }
  return ALLOWED_EXTENSIONS.has(fileExtension(file.name));
}

function formatZodError(err: ZodError): string {
  const first = err.issues[0];
  return first?.message || 'Invalid input.';
}

function canEditDocument(
  ctx: NonNullable<Awaited<ReturnType<typeof resolveServerAuthContext>>>,
  doc: { uploaded_by: string | null }
): boolean {
  if (ctx.role === 'clinic_admin' || ctx.role === 'doctor') return true;
  if (ctx.role === 'receptionist') return doc.uploaded_by === ctx.userId;
  return false;
}

/**
 * Uploads a medical document to the org-scoped storage bucket and records a
 * documents row. The storage path is prefixed with the organization id so that
 * storage.objects RLS policies enforce tenant isolation.
 */
export async function uploadVisitDocumentAction(formData: FormData) {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) throw new Error('Unauthorized: Session is invalid.');
    assertOrganization(ctx);
    assertCapability(ctx, 'clinical_queue');

    const file = formData.get('file');
    if (!(file instanceof File) || file.size === 0) {
      throw new Error('No file provided.');
    }
    if (file.size > MAX_FILE_BYTES) {
      throw new Error('File exceeds the 15 MB limit.');
    }
    if (!isAllowedFile(file)) {
      throw new Error('Unsupported file type. Use PDF, JPG, PNG, or text.');
    }

    let meta;
    try {
      meta = DocumentMetaSchema.parse({
        visitId: (formData.get('visitId') as string) || null,
        patientId: (formData.get('patientId') as string) || null,
        category: (formData.get('category') as string) || 'other',
        description: (formData.get('description') as string) || '',
      });
    } catch (err) {
      if (err instanceof ZodError) throw new Error(formatZodError(err));
      throw err;
    }

    const supabase = await createClient();

    let branchId: string | null = ctx.activeBranchId;
    let patientId: string | null = meta.patientId ?? null;
    if (meta.visitId) {
      const { data: visit, error: visitError } = await supabase
        .from('visits')
        .select('id, organization_id, branch_id, patient_id')
        .eq('id', meta.visitId)
        .eq('organization_id', ctx.organizationId)
        .single();
      if (visitError || !visit) {
        throw new Error('Visit record not found or access denied.');
      }
      branchId = visit.branch_id;
      patientId = visit.patient_id;
    }

    const safeName = sanitizeFileName(file.name);
    const storagePath = `${ctx.organizationId}/${meta.visitId || 'general'}/${Date.now()}-${safeName}`;

    const arrayBuffer = await file.arrayBuffer();
    const contentType =
      file.type && file.type !== 'application/octet-stream'
        ? file.type
        : fileExtension(safeName) === '.pdf'
          ? 'application/pdf'
          : file.type || 'application/octet-stream';

    const { error: uploadError } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .upload(storagePath, arrayBuffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(uploadError.message || 'Failed to upload document.');
    }

    const { data: doc, error: docError } = await supabase
      .from('documents')
      .insert({
        organization_id: ctx.organizationId,
        branch_id: branchId,
        patient_id: patientId,
        visit_id: meta.visitId || null,
        bucket_id: DOCUMENTS_BUCKET,
        storage_path: storagePath,
        file_name: safeName,
        mime_type: contentType,
        size_bytes: file.size,
        category: meta.category,
        description: meta.description || null,
        uploaded_by: ctx.userId,
      })
      .select()
      .single();

    if (docError || !doc) {
      await supabase.storage.from(DOCUMENTS_BUCKET).remove([storagePath]);
      throw new Error(docError?.message || 'Failed to record document.');
    }

    await writeAuditLog({
      organizationId: ctx.organizationId,
      branchId,
      actorUserId: ctx.userId,
      actorRole: ctx.role || 'doctor',
      action: 'DOCUMENT_UPLOADED',
      resourceType: 'DOCUMENT',
      resourceId: doc.id,
      category: 'data',
      afterData: { file_name: safeName, category: meta.category, visit_id: meta.visitId },
    });

    return {
      success: true,
      document: {
        id: doc.id,
        fileName: doc.file_name,
        category: doc.category,
        mimeType: doc.mime_type,
        sizeBytes: doc.size_bytes,
        createdAt: doc.created_at,
        description: doc.description,
      },
    };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

/**
 * Updates safe metadata fields on a document (title, category, notes).
 */
export async function updateDocumentAction(payload: unknown) {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) throw new Error('Unauthorized: Session is invalid.');
    assertOrganization(ctx);

    let parsed;
    try {
      parsed = UpdateDocumentSchema.parse(payload);
    } catch (err) {
      if (err instanceof ZodError) throw new Error(formatZodError(err));
      throw err;
    }

    const supabase = await createClient();
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('id, organization_id, branch_id, file_name, category, description, uploaded_by')
      .eq('id', parsed.documentId)
      .eq('organization_id', ctx.organizationId)
      .is('deleted_at', null)
      .single();

    if (docError || !doc) {
      throw new Error('Document not found or access denied.');
    }

    if (!canEditDocument(ctx, doc)) {
      throw new Error('You do not have permission to edit this document.');
    }

    const safeName = sanitizeFileName(parsed.fileName);
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        file_name: safeName,
        category: parsed.category,
        description: parsed.description || null,
      })
      .eq('id', doc.id);

    if (updateError) {
      throw new Error(updateError.message || 'Failed to update document.');
    }

    await writeAuditLog({
      organizationId: ctx.organizationId,
      branchId: doc.branch_id,
      actorUserId: ctx.userId,
      actorRole: ctx.role || 'doctor',
      action: 'DOCUMENT_UPDATED',
      resourceType: 'DOCUMENT',
      resourceId: doc.id,
      category: 'data',
      beforeData: {
        file_name: doc.file_name,
        category: doc.category,
        description: doc.description,
      },
      afterData: {
        file_name: safeName,
        category: parsed.category,
        description: parsed.description || null,
      },
    });

    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

/**
 * Deletes a document (storage object + metadata row) and writes an audit log.
 */
export async function deleteDocumentAction(documentId: string) {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) throw new Error('Unauthorized: Session is invalid.');
    assertOrganization(ctx);

    const supabase = await createClient();
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('id, organization_id, branch_id, bucket_id, storage_path, file_name, uploaded_by')
      .eq('id', documentId)
      .eq('organization_id', ctx.organizationId)
      .single();

    if (docError || !doc) {
      throw new Error('Document not found or access denied.');
    }

    if (ctx.role === 'receptionist' && doc.uploaded_by !== ctx.userId) {
      throw new Error('You can only delete documents you uploaded.');
    }

    if (ctx.role !== 'clinic_admin' && ctx.role !== 'doctor' && ctx.role !== 'receptionist') {
      throw new Error('You do not have permission to delete documents.');
    }

    await supabase.storage.from(doc.bucket_id).remove([doc.storage_path]);
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', doc.id);

    if (deleteError) {
      throw new Error(deleteError.message || 'Failed to delete document.');
    }

    await writeAuditLog({
      organizationId: ctx.organizationId,
      branchId: doc.branch_id,
      actorUserId: ctx.userId,
      actorRole: ctx.role || 'doctor',
      action: 'DOCUMENT_DELETED',
      resourceType: 'DOCUMENT',
      resourceId: doc.id,
      category: 'data',
      severity: 'warning',
      beforeData: { file_name: doc.file_name, storage_path: doc.storage_path },
    });

    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}
