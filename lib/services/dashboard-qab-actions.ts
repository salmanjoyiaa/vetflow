'use server';

import { createClient } from '@/lib/supabase/server';
import {
  assertActiveBranch,
  assertCapability,
  assertOrganization,
  resolveServerAuthContext,
} from '@/lib/auth/context';

export async function getDoctorTreatmentRecordsTodayAction() {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) throw new Error('Unauthorized');
    assertOrganization(ctx);
    assertCapability(ctx, 'clinical_queue');
    assertActiveBranch(ctx);

    const supabase = await createClient();
    const today = new Date().toISOString().slice(0, 10);

    const { data: visits } = await supabase
      .from('visits')
      .select(`
        id, reason, status, completed_at,
        visit_assignments!inner ( doctor_id ),
        patients ( name, species ),
        clinical_notes ( diagnosis, treatment_plan, visit_type )
      `)
      .eq('branch_id', ctx.activeBranchId!)
      .eq('visit_assignments.doctor_id', ctx.userId)
      .gte('completed_at', `${today}T00:00:00`)
      .in('status', ['ready_for_checkout', 'completed'])
      .order('completed_at', { ascending: false });

    const records = (visits || []).map((v) => {
      const note = Array.isArray(v.clinical_notes) ? v.clinical_notes[0] : v.clinical_notes;
      const pet = Array.isArray(v.patients) ? v.patients[0] : v.patients;
      return {
        visitId: v.id,
        petName: (pet as { name?: string })?.name || 'Unknown',
        species: (pet as { species?: string })?.species || '',
        diagnosis: (note as { diagnosis?: string })?.diagnosis || v.reason,
        treatmentPlan: (note as { treatment_plan?: string })?.treatment_plan || '',
        visitType: (note as { visit_type?: string })?.visit_type || 'standard',
        completedAt: v.completed_at,
      };
    });

    return { success: true, records };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed', records: [] };
  }
}

export async function getFollowUpAppointmentsTodayAction() {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) throw new Error('Unauthorized');
    assertOrganization(ctx);
    assertCapability(ctx, 'manage_appointments');

    const supabase = await createClient();
    const today = new Date().toISOString().slice(0, 10);

    let query = supabase
      .from('appointments')
      .select('id, patient_name, customer_name, preferred_date, preferred_time, status, reason, follow_up_of_visit_id')
      .eq('organization_id', ctx.organizationId)
      .not('follow_up_of_visit_id', 'is', null)
      .in('status', ['requested', 'confirmed', 'rescheduled'])
      .order('preferred_date', { ascending: true })
      .limit(20);

    if (ctx.activeBranchId) {
      query = query.eq('branch_id', ctx.activeBranchId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return { success: true, appointments: data || [] };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed', appointments: [] };
  }
}

export async function getBranchSummaryAction() {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) throw new Error('Unauthorized');
    assertOrganization(ctx);
    assertCapability(ctx, 'manage_branches');

    const supabase = await createClient();
    const { data: branches } = await supabase
      .from('branches')
      .select('id, name')
      .eq('organization_id', ctx.organizationId)
      .eq('is_active', true);

    const today = new Date().toISOString().slice(0, 10);
    const summaries = await Promise.all(
      (branches || []).map(async (b) => {
        const [appt, queue, checkout] = await Promise.all([
          supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('branch_id', b.id).eq('preferred_date', today),
          supabase.from('visits').select('id', { count: 'exact', head: true }).eq('branch_id', b.id).in('status', ['waiting', 'consulting']),
          supabase.from('visits').select('id', { count: 'exact', head: true }).eq('branch_id', b.id).eq('status', 'ready_for_checkout'),
        ]);
        return {
          id: b.id,
          name: b.name,
          todayAppointments: appt.count || 0,
          activeQueue: queue.count || 0,
          readyCheckout: checkout.count || 0,
        };
      })
    );

    return { success: true, branches: summaries };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed', branches: [] };
  }
}

export async function getInventoryForecastAction() {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) throw new Error('Unauthorized');
    assertOrganization(ctx);
    assertCapability(ctx, 'manage_inventory');
    assertActiveBranch(ctx);

    const { getInventoryForecast } = await import('@/lib/inventory/forecast');
    const forecast = await getInventoryForecast(ctx.organizationId, ctx.activeBranchId!);
    return { success: true, forecast };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed', forecast: [] };
  }
}

export async function getLowStockForBranchAction() {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) throw new Error('Unauthorized');
    assertOrganization(ctx);
    assertCapability(ctx, 'manage_inventory');
    assertActiveBranch(ctx);

    const supabase = await createClient();
    const { data } = await supabase
      .from('products')
      .select('id, name, type, stock_quantity, reorder_level')
      .eq('branch_id', ctx.activeBranchId!)
      .eq('is_active', true)
      .neq('type', 'service');

    const low = (data || []).filter((p) => p.stock_quantity <= p.reorder_level);
    return { success: true, items: low };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed', items: [] };
  }
}
