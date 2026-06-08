import { renderToStream } from '@react-pdf/renderer';
import PrescriptionPdfDocument from '@/components/pdf/PrescriptionPdfDocument';
import { createClient } from '@/lib/supabase/server';
import {
  assertCapability,
  resolveServerAuthContext,
} from '@/lib/auth/context';
import React from 'react';

/**
 * GET route returning the rendered prescription PDF stream.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const ctx = await resolveServerAuthContext();
    if (!ctx) {
      return new Response('Unauthorized: Session is invalid.', { status: 401 });
    }
    try {
      assertCapability(ctx, 'manage_prescriptions');
    } catch {
      return new Response('Forbidden: Insufficient permissions.', { status: 403 });
    }
    const session = ctx;

    const supabase = await createClient();

    // 2. Fetch prescription details
    const { data: prescription, error } = await supabase
      .from('prescriptions')
      .select(`
        *,
        prescription_items ( * ),
        pets ( name, species, breed ),
        visits ( 
          reason,
          clinical_notes ( diagnosis, treatment_plan, follow_up_recommendation )
        ),
        branches ( name, address, phone ),
        doctor:user_profiles!prescriptions_doctor_id_fkey ( first_name, last_name )
      `)
      .eq('id', id)
      .eq('organization_id', session.organizationId)
      .single();

    if (error || !prescription) {
      return new Response('Prescription record not found or access denied.', { status: 404 });
    }

    const petObj = prescription.pets as any;
    const branchObj = prescription.branches as any;
    const doctorObj = prescription.doctor as any;
    const visitObj = prescription.visits as any;
    const noteObj = visitObj?.clinical_notes?.[0];

    // Fetch customer details using customer id from visits table
    // Wait! A visit has a customer_id. Let's query customer details
    const { data: customer } = await supabase
      .from('customers')
      .select('first_name, last_name')
      .eq('id', visitObj?.customer_id || '')
      .maybeSingle();

    // 3. Render React-pdf component directly to stream
    const stream = await renderToStream(
      React.createElement(PrescriptionPdfDocument, {
        date: new Date(prescription.created_at).toLocaleDateString(),
        clinicName: session.organizationName || 'ClinixDev Center',
        branchName: branchObj?.name || 'Main Branch',
        branchAddress: branchObj?.address || '',
        branchPhone: branchObj?.phone || '',
        doctorName: `${doctorObj?.first_name || 'Attending'} ${doctorObj?.last_name || 'Doctor'}`,
        customerName: customer ? `${customer.first_name} ${customer.last_name}` : 'Pet Parent',
        petName: petObj?.name || 'Patient',
        petSpecies: petObj?.species || 'Canine',
        petBreed: petObj?.breed || '',
        diagnosis: noteObj?.diagnosis || 'General checkup',
        treatmentPlan: noteObj?.treatment_plan || '',
        followUp: noteObj?.follow_up_recommendation || '',
        items: prescription.prescription_items || [],
      }) as any
    );

    // 4. Return stream response
    return new Response(stream as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="prescription-${prescription.id.substring(0, 8)}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error('PDF Prescription Generation Failure:', err);
    return new Response(`PDF generation failed: ${err.message}`, { status: 500 });
  }
}
