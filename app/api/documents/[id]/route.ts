import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { resolveServerAuthContext } from '@/lib/auth/context';
import { writeAuditLog } from '@/lib/services/audit';

/**
 * Audited document download. Resolves a short-lived signed URL for the
 * org-scoped storage object and records an access audit log before redirecting.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await resolveServerAuthContext();
    if (!ctx || !ctx.organizationId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const supabase = await createClient();

    // RLS ensures the document belongs to the caller's organization.
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('id, organization_id, branch_id, bucket_id, storage_path, file_name')
      .eq('id', id)
      .eq('organization_id', ctx.organizationId)
      .single();

    if (docError || !doc) {
      return new NextResponse('Document not found', { status: 404 });
    }

    const { data: signed, error: signError } = await supabase.storage
      .from(doc.bucket_id)
      .createSignedUrl(doc.storage_path, 60, { download: doc.file_name });

    if (signError || !signed?.signedUrl) {
      return new NextResponse('Unable to generate download link', { status: 500 });
    }

    const hdrs = await headers();
    await writeAuditLog({
      organizationId: ctx.organizationId,
      branchId: doc.branch_id,
      actorUserId: ctx.userId,
      actorRole: ctx.role || 'clinic_admin',
      action: 'DOCUMENT_DOWNLOADED',
      resourceType: 'DOCUMENT',
      resourceId: doc.id,
      category: 'access',
      afterData: { file_name: doc.file_name },
      ipAddress:
        hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        hdrs.get('x-real-ip') ||
        undefined,
      userAgent: hdrs.get('user-agent') || undefined,
    });

    return NextResponse.redirect(signed.signedUrl);
  } catch (err: any) {
    return new NextResponse(`Download failed: ${err.message}`, { status: 500 });
  }
}
