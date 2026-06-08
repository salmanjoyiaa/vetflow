'use server';

import { createClient } from '@/lib/supabase/server';
import {
  assertCapability,
  assertOrganization,
  resolveServerAuthContext,
} from '@/lib/auth/context';
import { writeAuditLog } from '@/lib/services/audit';
import { DocumentMetaSchema } from '@/lib/validations/schemas';

const DOCUMENTS_BUCKET = 'clinic-documents';
const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15 MB
const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
  'text/plain',
]);

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
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
    if (file.type && !ALLOWED_MIME.has(file.type)) {
      throw new Error('Unsupported file type.');
    }

    const meta = DocumentMetaSchema.parse({
      visitId: (formData.get('visitId') as string) || null,
      patientId: (formData.get('patientId') as string) || null,
      category: (formData.get('category') as string) || 'other',
      description: (formData.get('description') as string) || '',
    });

    const supabase = await createClient();

    // If a visit is supplied, confirm it belongs to the caller's org and derive
    // branch + patient so the row is correctly scoped.
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
    const { error: uploadError } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .upload(storagePath, arrayBuffer, {
        contentType: file.type || 'application/octet-stream',
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
        mime_type: file.type || null,
        size_bytes: file.size,
        category: meta.category,
        description: meta.description || null,
        uploaded_by: ctx.userId,
      })
      .select()
      .single();

    if (docError || !doc) {
      // Roll back the orphaned storage object on metadata failure.
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

    return { success: true, document: doc };
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
    assertCapability(ctx, 'clinical_queue');

    const supabase = await createClient();
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('id, organization_id, branch_id, bucket_id, storage_path, file_name')
      .eq('id', documentId)
      .eq('organization_id', ctx.organizationId)
      .single();

    if (docError || !doc) {
      throw new Error('Document not found or access denied.');
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
