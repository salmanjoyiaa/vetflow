import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;

export async function sendEmail({
  to,
  subject,
  html,
  from = 'ClinixDev Notification <noreply@clinixdev.com>',
}: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}) {
  if (!resendApiKey || resendApiKey === 'placeholder-resend-key' || resendApiKey === '') {
    console.log(`\n--- [EMAIL DISPATCH MOCK] ---`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body Snippet: ${html.substring(0, 300)}...`);
    console.log(`-----------------------------\n`);
    return { success: true, mock: true };
  }

  try {
    const resend = new Resend(resendApiKey);
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });

    if (error) {
      console.error('Email Dispatch Error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error('Email Dispatch Exception:', err);
    return { success: false, error: err.message };
  }
}

// ====================================================================
// EMAIL HTML TEMPLATES COMPILERS
// ====================================================================

export function compileAppointmentRequestTemplate(clinicName: string, petName: string, date: string, time: string) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #faf9f6; border-radius: 16px;">
      <h2 style="color: #0b132b;">Appointment Request Received</h2>
      <p>Dear Pet Parent,</p>
      <p>We have received your appointment request at <strong>${clinicName}</strong> for <strong>${petName}</strong>.</p>
      <div style="background-color: #ffffff; padding: 15px; border-radius: 12px; margin: 20px 0; border: 1px solid #e3e2de;">
        <p style="margin: 0; font-size: 14px;"><strong>Preferred Date:</strong> ${date}</p>
        <p style="margin: 5px 0 0 0; font-size: 14px;"><strong>Preferred Time:</strong> ${time}</p>
      </div>
      <p style="font-size: 13px; color: #5a5a5a;">Attending staff will review and confirm this request shortly. You will receive an email confirmation containing branch directions.</p>
      <hr style="border: 0; border-top: 1px solid #e3e2de; margin: 20px 0;" />
      <p style="font-size: 10px; color: #a1a1a1; text-align: center;">Powered by ClinixDev Clinic Operations</p>
    </div>
  `;
}

export function compileAppointmentConfirmedTemplate(clinicName: string, petName: string, date: string, time: string, branchAddress: string) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #faf9f6; border-radius: 16px;">
      <h2 style="color: #17403a;">Appointment Confirmed</h2>
      <p>Dear Pet Parent,</p>
      <p>Your appointment for <strong>${petName}</strong> at <strong>${clinicName}</strong> is now officially confirmed.</p>
      <div style="background-color: #ffffff; padding: 15px; border-radius: 12px; margin: 20px 0; border: 1px solid #e3e2de;">
        <p style="margin: 0; font-size: 14px;"><strong>Confirmed Date:</strong> ${date}</p>
        <p style="margin: 5px 0 0 0; font-size: 14px;"><strong>Confirmed Time:</strong> ${time}</p>
        <p style="margin: 10px 0 0 0; font-size: 14px;"><strong>Branch Address:</strong> ${branchAddress}</p>
      </div>
      <p style="font-size: 13px; color: #5a5a5a;">Please arrive 10 minutes before your scheduled slot. We look forward to seeing you and your pet.</p>
      <hr style="border: 0; border-top: 1px solid #e3e2de; margin: 20px 0;" />
      <p style="font-size: 10px; color: #a1a1a1; text-align: center;">Powered by ClinixDev Clinic Operations</p>
    </div>
  `;
}

export function compilePrescriptionDeliveryTemplate(clinicName: string, petName: string, doctorName: string) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #faf9f6; border-radius: 16px;">
      <h2 style="color: #0b132b;">Prescription Issued</h2>
      <p>Dear Pet Parent,</p>
      <p>Dr. ${doctorName} has finalized the medical prescription for <strong>${petName}</strong> at <strong>${clinicName}</strong>.</p>
      <p>You can find the prescription details in your ClinixDev patient folder, or download the official prescription PDF attached directly to this message.</p>
      <hr style="border: 0; border-top: 1px solid #e3e2de; margin: 20px 0;" />
      <p style="font-size: 10px; color: #a1a1a1; text-align: center;">Powered by ClinixDev Clinic Operations</p>
    </div>
  `;
}

export function compileThankYouTemplate(
  clinicName: string,
  invoiceNumber: string,
  total: string,
  customerName?: string
) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #faf9f6; border-radius: 16px;">
      <h2 style="color: #17403a;">Thank you for your payment</h2>
      <p>Dear ${customerName || 'Valued Client'},</p>
      <p>We have received your payment for invoice <strong>${invoiceNumber}</strong> at <strong>${clinicName}</strong>. Thank you for trusting us with your care.</p>
      <div style="background-color: #ffffff; padding: 15px; border-radius: 12px; margin: 20px 0; border: 1px solid #e3e2de;">
        <p style="margin: 0; font-size: 14px;"><strong>Invoice:</strong> ${invoiceNumber}</p>
        <p style="margin: 5px 0 0 0; font-size: 14px;"><strong>Amount Paid:</strong> $${total}</p>
      </div>
      <p style="font-size: 13px; color: #5a5a5a;">We hope to see you again. If you have any questions about this payment, please contact our front-desk.</p>
      <hr style="border: 0; border-top: 1px solid #e3e2de; margin: 20px 0;" />
      <p style="font-size: 10px; color: #a1a1a1; text-align: center;">Powered by ClinixDev Clinic Operations</p>
    </div>
  `;
}

export function compileInvoiceDeliveryTemplate(clinicName: string, invoiceNumber: string, total: string) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #faf9f6; border-radius: 16px;">
      <h2 style="color: #0b132b;">Invoice Statement</h2>
      <p>Dear Valued Client,</p>
      <p>Thank you for choosing <strong>${clinicName}</strong>. A billing invoice has been generated for your recent visit.</p>
      <div style="background-color: #ffffff; padding: 15px; border-radius: 12px; margin: 20px 0; border: 1px solid #e3e2de;">
        <p style="margin: 0; font-size: 14px;"><strong>Invoice Code:</strong> ${invoiceNumber}</p>
        <p style="margin: 5px 0 0 0; font-size: 14px;"><strong>Amount Paid:</strong> $${total}</p>
      </div>
      <p style="font-size: 13px; color: #5a5a5a;">The receipt is attached to this email. If you have any questions, please contact our front-desk.</p>
      <hr style="border: 0; border-top: 1px solid #e3e2de; margin: 20px 0;" />
      <p style="font-size: 10px; color: #a1a1a1; text-align: center;">Powered by ClinixDev Clinic Operations</p>
    </div>
  `;
}
