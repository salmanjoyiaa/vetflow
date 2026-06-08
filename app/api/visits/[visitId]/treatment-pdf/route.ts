import { renderToStream } from '@react-pdf/renderer';
import TreatmentPdfDocument from '@/components/pdf/TreatmentPdfDocument';
import { createClient } from '@/lib/supabase/server';
import { assertCapability, resolveServerAuthContext } from '@/lib/auth/context';
import React from 'react';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ visitId: string }> }
) {
  try {
    const { visitId } = await params;

    const ctx = await resolveServerAuthContext();
    if (!ctx) {
      return new Response('Unauthorized', { status: 401 });
    }
    try {
      assertCapability(ctx, 'billing_checkout');
    } catch {
      return new Response('Forbidden', { status: 403 });
    }

    const supabase = await createClient();

    const { data: visit, error } = await supabase
      .from('visits')
      .select(`
        id,
        reason,
        completed_at,
        checked_in_at,
        clinical_notes (
          chief_complaint,
          history,
          examination_findings,
          diagnosis,
          treatment_plan,
          follow_up_recommendation,
          temperature_c,
          heart_rate_bpm,
          respiratory_rate,
          weight_kg
        ),
        patients ( name, species ),
        customers ( first_name, last_name ),
        branches ( name, address, phone ),
        doctor:user_profiles!visits_doctor_id_fkey ( first_name, last_name )
      `)
      .eq('id', visitId)
      .eq('organization_id', ctx.organizationId)
      .single();

    if (error || !visit) {
      return new Response('Visit not found', { status: 404 });
    }

    const notes = (visit.clinical_notes as Array<Record<string, unknown>> | null)?.[0];
    if (!notes) {
      return new Response('No clinical notes for this visit', { status: 404 });
    }

    const pet = visit.patients as { name?: string; species?: string } | null;
    const customer = visit.customers as { first_name?: string; last_name?: string } | null;
    const branch = visit.branches as { name?: string; address?: string; phone?: string } | null;
    const doctor = visit.doctor as { first_name?: string; last_name?: string } | null;

    const visitDate = visit.completed_at || visit.checked_in_at;
    const stream = await renderToStream(
      React.createElement(TreatmentPdfDocument, {
        date: visitDate ? new Date(visitDate as string).toLocaleDateString() : new Date().toLocaleDateString(),
        clinicName: ctx.organizationName || 'ClinixDev Center',
        branchName: branch?.name || 'Main Branch',
        branchAddress: branch?.address || '',
        branchPhone: branch?.phone || '',
        doctorName: `Dr. ${doctor?.first_name || 'Attending'} ${doctor?.last_name || 'Doctor'}`,
        customerName: customer
          ? `${customer.first_name} ${customer.last_name}`.trim()
          : 'Pet Parent',
        petName: pet?.name || 'Patient',
        petSpecies: pet?.species || '',
        reason: (visit.reason as string) || '',
        chiefComplaint: (notes.chief_complaint as string) || '',
        history: (notes.history as string) || undefined,
        examinationFindings: (notes.examination_findings as string) || undefined,
        diagnosis: (notes.diagnosis as string) || '',
        treatmentPlan: (notes.treatment_plan as string) || undefined,
        followUp: (notes.follow_up_recommendation as string) || undefined,
        temperatureC: notes.temperature_c != null ? Number(notes.temperature_c) : null,
        heartRateBpm: notes.heart_rate_bpm != null ? Number(notes.heart_rate_bpm) : null,
        respiratoryRate: notes.respiratory_rate != null ? Number(notes.respiratory_rate) : null,
        weightKg: notes.weight_kg != null ? Number(notes.weight_kg) : null,
      }) as any
    );

    return new Response(stream as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="treatment-${visitId}.pdf"`,
      },
    });
  } catch (err: unknown) {
    console.error('Treatment PDF error:', err);
    return new Response('Failed to generate PDF', { status: 500 });
  }
}
