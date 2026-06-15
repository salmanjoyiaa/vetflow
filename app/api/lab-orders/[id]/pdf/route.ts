import { createClient } from '@/lib/supabase/server';
import {
  assertCapability,
  resolveServerAuthContext,
} from '@/lib/auth/context';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await resolveServerAuthContext();
    if (!ctx) return new Response('Unauthorized', { status: 401 });

    try {
      assertCapability(ctx, 'clinical_queue');
    } catch {
      try {
        assertCapability(ctx, 'view_reports');
      } catch {
        return new Response('Forbidden', { status: 403 });
      }
    }

    const supabase = await createClient();
    const { data: order, error } = await supabase
      .from('lab_orders')
      .select(`
        id, test_name, result_text, status, created_at,
        patients ( name, species ),
        visits ( reason )
      `)
      .eq('id', id)
      .eq('organization_id', ctx.organizationId)
      .single();

    if (error || !order) {
      return new Response('Lab order not found', { status: 404 });
    }

    const pet = order.patients as { name?: string; species?: string } | null;
    const visit = order.visits as { reason?: string } | null;
    const lines = [
      `Lab Result Report`,
      `Clinic: ${ctx.organizationName || 'Clinic'}`,
      `Date: ${new Date(order.created_at as string).toLocaleDateString()}`,
      ``,
      `Patient: ${pet?.name || 'Unknown'} (${pet?.species || ''})`,
      `Test: ${order.test_name}`,
      `Visit reason: ${visit?.reason || '—'}`,
      `Status: ${order.status}`,
      ``,
      `Results:`,
      (order.result_text as string) || 'No result text recorded.',
    ];

    const body = lines.join('\n');
    return new Response(body, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="lab-result-${id}.txt"`,
      },
    });
  } catch {
    return new Response('Failed to generate lab report', { status: 500 });
  }
}
