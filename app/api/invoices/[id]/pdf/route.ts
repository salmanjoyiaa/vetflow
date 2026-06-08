import { renderToStream } from '@react-pdf/renderer';
import InvoicePdfDocument from '@/components/pdf/InvoicePdfDocument';
import { createClient } from '@/lib/supabase/server';
import { resolveServerSession } from '@/lib/services/auth';
import React from 'react';

/**
 * GET route returning the rendered invoice PDF stream.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // 1. Authenticate user session
    const session = await resolveServerSession();
    if (!session) {
      return new Response('Unauthorized: Session is invalid.', { status: 401 });
    }

    const supabase = await createClient();

    // 2. Fetch invoice with joins
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(`
        *,
        invoice_items ( * ),
        customers ( first_name, last_name, phone ),
        pets ( name ),
        branches ( name, address, phone ),
        payments ( payment_method )
      `)
      .eq('id', id)
      .eq('organization_id', session.organizationId)
      .single();

    if (error || !invoice) {
      return new Response('Invoice record not found or access denied.', { status: 404 });
    }

    const customerObj = invoice.customers as any;
    const petObj = invoice.pets as any;
    const branchObj = invoice.branches as any;
    const paymentsArr = invoice.payments as any[] || [];
    const paymentMethod = paymentsArr[0]?.payment_method || 'cash';

    // 3. Render React-pdf component directly to stream
    const stream = await renderToStream(
      React.createElement(InvoicePdfDocument, {
        invoiceNumber: invoice.invoice_number,
        date: new Date(invoice.created_at).toLocaleDateString(),
        clinicName: session.organizationName || 'ClinixDev Center',
        branchName: branchObj?.name || 'Main Branch',
        branchAddress: branchObj?.address || '',
        branchPhone: branchObj?.phone || '',
        customerName: `${customerObj?.first_name || ''} ${customerObj?.last_name || ''}`,
        customerPhone: customerObj?.phone || '',
        petName: petObj?.name || 'Patient',
        items: invoice.invoice_items || [],
        subtotal: Number(invoice.subtotal),
        discount: Number(invoice.discount),
        taxPercentage: Number(invoice.tax_percentage),
        taxAmount: Number(invoice.tax_amount),
        total: Number(invoice.total),
        paymentMethod: paymentMethod,
      }) as any
    );

    // 4. Return stream response
    return new Response(stream as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="invoice-${invoice.invoice_number}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error('PDF Invoice Generation Failure:', err);
    return new Response(`PDF generation failed: ${err.message}`, { status: 500 });
  }
}
