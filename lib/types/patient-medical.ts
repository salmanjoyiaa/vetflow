import type { MedicalActivityRow } from '@/components/dashboard/MedicalRecordActivityPanel';

export type PatientDocumentRow = {
  id: string;
  file_name: string;
  category: string;
  created_at: string;
  mime_type?: string | null;
};

export type ClinicalNoteRow = {
  id: string;
  visit_type: string | null;
  chief_complaint: string | null;
  history: string | null;
  examination_findings: string | null;
  diagnosis: string | null;
  treatment_plan: string | null;
  procedure_notes: string | null;
  post_op_medication: string | null;
  internal_notes: string | null;
  follow_up_recommendation: string | null;
  follow_up_days: number[] | null;
  temperature_c: number | null;
  heart_rate_bpm: number | null;
  respiratory_rate: number | null;
  weight_kg: number | null;
};

export type PrescriptionItemRow = {
  medicine_name: string;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  instructions: string | null;
};

export type VisitPrescriptionRow = {
  id: string;
  is_finalized: boolean;
  items: PrescriptionItemRow[];
};

export type LabOrderRow = {
  id: string;
  visit_id: string;
  test_name: string;
  status: string;
  result_text: string | null;
  result_document_id: string | null;
  created_at: string;
};

export type InvoiceRow = {
  id: string;
  invoice_number: string;
  total: number;
  payment_status: string;
  created_at: string;
  visit_id: string | null;
};

export type PatientVisitRow = {
  id: string;
  reason: string | null;
  status: string;
  checked_in_at: string | null;
  completed_at: string | null;
  is_emergency: boolean;
  doctorName: string | null;
  notes: ClinicalNoteRow | null;
  prescriptions: VisitPrescriptionRow | null;
  labOrders: LabOrderRow[];
  documents: PatientDocumentRow[];
};

export type PatientOwnerRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
};

export type PatientMedicalProfileData = {
  petId: string;
  patientNumber: string | null;
  petName: string;
  species: string;
  breed: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  weightKg: number | null;
  allergies: string | null;
  medicalNotes: string | null;
  photoUrl: string | null;
  latestVisitStatus: string | null;
  owner: PatientOwnerRow | null;
  visits: PatientVisitRow[];
  invoices: InvoiceRow[];
  activities: MedicalActivityRow[];
  allDocuments: PatientDocumentRow[];
};

/** @deprecated Use PatientMedicalProfileData */
export type PatientMedicalHistoryData = Pick<
  PatientMedicalProfileData,
  'petId' | 'petName' | 'species' | 'breed' | 'allergies' | 'visits'
> & {
  ownerName: string | null;
  visits: Array<{
    id: string;
    reason: string | null;
    status: string;
    checked_in_at: string | null;
    doctorName: string | null;
    notes: {
      id: string;
      chief_complaint: string | null;
      diagnosis: string | null;
      treatment_plan: string | null;
    } | null;
    documents: PatientDocumentRow[];
  }>;
};
