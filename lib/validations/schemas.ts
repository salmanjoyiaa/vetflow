import { z } from 'zod';

/** Postgres uuid strings, including deterministic seed IDs (Zod 4 uuid() rejects some fixtures). */
const UUID_LIKE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
export const EntityIdSchema = z.string().regex(UUID_LIKE, { message: 'Invalid ID' });

// --- INVENTORY / PRODUCTS ---
export const ProductSchema = z.object({
  name: z.string().min(1, { message: 'Product name is required' }),
  brand: z.string().optional().or(z.literal('')),
  sku: z.string().optional().or(z.literal('')),
  unit: z.string().min(1, { message: 'Unit is required' }),
  type: z.enum(['medicine', 'food', 'accessory', 'service', 'treats'], { message: 'Invalid type' }),
  purchasePrice: z.number().nonnegative(),
  sellingPrice: z.number().nonnegative(),
  stockQuantity: z.number().int().nonnegative(),
  reorderLevel: z.number().int().nonnegative(),
  categoryId: EntityIdSchema.nullable().optional(),
  categoryName: z.string().max(100).optional().or(z.literal('')),
  branchId: EntityIdSchema,
});

export const StockAdjustmentSchema = z.object({
  productId: EntityIdSchema,
  branchId: EntityIdSchema,
  quantity: z.number().int(),
  type: z.enum(['purchase_added', 'manual_adjustment', 'expired_removed', 'return']),
  reason: z.string().min(1, { message: 'Reason is required' }),
});

// --- PATIENTS (vet MVP: patient_type = 'pet') ---
export const PetSchema = z.object({
  name: z.string().min(1, { message: 'Patient name is required' }),
  species: z.string().min(1, { message: 'Species is required' }), // e.g. Dog, Cat, etc.
  breed: z.string().optional().or(z.literal('')),
  color: z.string().optional().or(z.literal('')),
  gender: z.string().min(1, { message: 'Gender is required' }), // Male, Female, Spayed, Neutered
  dateOfBirth: z.string().optional().or(z.literal('')),
  weightKg: z.number().nonnegative().optional().or(z.nan()),
  microchipNumber: z.string().optional().or(z.literal('')),
  allergies: z.string().optional().or(z.literal('')),
  medicalNotes: z.string().optional().or(z.literal('')),
  customerId: EntityIdSchema,
});
export const PatientSchema = PetSchema;

// --- CUSTOMERS ---
export const CustomerSchema = z.object({
  firstName: z.string().min(1, { message: 'First name is required' }),
  lastName: z.string().min(1, { message: 'Last name is required' }),
  email: z.string().email({ message: 'Invalid email address' }).optional().or(z.literal('')),
  phone: z.string().min(5, { message: 'Phone number is required' }),
  address: z.string().optional().or(z.literal('')),
  branchId: z.string().uuid({ message: 'Invalid branch selection' }),
});

// --- STAFF ---
export const StaffSchema = z.object({
  firstName: z.string().min(1, { message: 'First name is required' }),
  lastName: z.string().min(1, { message: 'Last name is required' }),
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  phone: z.string().min(5, { message: 'Phone number is required' }),
  role: z.enum(['doctor', 'receptionist'], { message: 'Invalid role' }),
  branchIds: z.array(z.string().uuid()).min(1, { message: 'Assign at least one branch' }),
});

// --- LAB ORDERS (per visit) ---
export const LabOrderSchema = z.object({
  visitId: z.string().uuid(),
  labTestId: z.string().uuid().nullable().optional(),
  testName: z.string().min(1, { message: 'Test name is required' }),
  notes: z.string().max(500).optional().or(z.literal('')),
});
export type LabOrderInput = z.infer<typeof LabOrderSchema>;

export const LabResultSchema = z.object({
  labOrderId: z.string().uuid(),
  status: z.enum(['ordered', 'in_progress', 'completed', 'cancelled']),
  resultText: z.string().max(4000).optional().or(z.literal('')),
  resultDocumentId: z.string().uuid().nullable().optional(),
});
export type LabResultInput = z.infer<typeof LabResultSchema>;

// --- DOCUMENT METADATA (file upload handled via FormData) ---
export const DocumentMetaSchema = z.object({
  visitId: z.string().uuid().nullable().optional(),
  patientId: z.string().uuid().nullable().optional(),
  category: z
    .enum(['lab_result', 'imaging', 'consent', 'referral', 'other'])
    .default('other'),
  description: z.string().max(500).optional().or(z.literal('')),
});
export type DocumentMetaInput = z.infer<typeof DocumentMetaSchema>;

// --- CLINIC / APP SETTINGS ---
export const SettingsSchema = z.object({
  timezone: z.string().min(1, { message: 'Timezone is required' }),
  currency: z.string().min(1, { message: 'Currency is required' }),
  isTaxEnabled: z.boolean(),
  taxName: z.string().min(1, { message: 'Tax name is required' }),
  taxPercentage: z.number().min(0).max(100),
  appliesToProducts: z.boolean(),
  appliesToServices: z.boolean(),
  // Branding / PDF
  clinicLogoUrl: z.string().url().optional().or(z.literal('')),
  clinicAddress: z.string().optional().or(z.literal('')),
  clinicPhone: z.string().optional().or(z.literal('')),
  clinicEmail: z.string().email({ message: 'Invalid email address' }).optional().or(z.literal('')),
  pdfBrandingEnabled: z.boolean(),
  pdfAccentColor: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, { message: 'Use a hex color like #0b132b' })
    .optional()
    .or(z.literal('')),
  pdfFooterText: z.string().max(300).optional().or(z.literal('')),
});

// --- BRANCHES ---
export const BranchSchema = z.object({
  name: z.string().min(1, { message: 'Branch name is required' }),
  address: z.string().min(1, { message: 'Branch address is required' }),
  phone: z.string().min(5, { message: 'Branch phone number is required' }),
  email: z.string().email({ message: 'Invalid email address' }).optional().or(z.literal('')),
});

// --- SUPER ADMIN / TENANT SUBSCRIPTION ---
export const SubscriptionSchema = z.object({
  organizationId: z.string().uuid(),
  planName: z.string().min(1, { message: 'Plan is required' }),
  status: z.enum(['active', 'trial', 'suspended', 'cancelled']),
  trialEnd: z.string().optional().or(z.literal('')),
  renewalDate: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});

// --- BILLING / CHECKOUT ---
export const CheckoutSchema = z
  .object({
    visitId: EntityIdSchema,
    discount: z.number().nonnegative(),
    paymentStatus: z.enum(['paid', 'unpaid', 'partial']),
    amountPaid: z.number().nonnegative().optional(),
    paymentMethod: z.enum(['cash', 'card', 'bank_transfer']),
    paymentReference: z.string().optional().or(z.literal('')),
    notes: z.string().optional().or(z.literal('')),
    sendEmailReceipt: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.paymentStatus === 'partial' && (data.amountPaid == null || data.amountPaid <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Enter the amount paid for a partial payment',
        path: ['amountPaid'],
      });
    }
  });

export const StockIntakeLineSchema = z.object({
  name: z.string().min(1),
  sku: z.string().optional().or(z.literal('')),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  unit: z.string().optional().or(z.literal('')),
  productId: z.string().uuid().nullable().optional(),
  createNew: z.boolean().optional(),
});

export const ConfirmStockIntakeSchema = z.object({
  branchId: z.string().uuid(),
  supplierName: z.string().optional().or(z.literal('')),
  invoiceNumber: z.string().optional().or(z.literal('')),
  invoiceDate: z.string().optional().or(z.literal('')),
  lines: z.array(StockIntakeLineSchema).min(1),
});

export const UpdateInvoicePaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  paymentMethod: z.enum(['cash', 'card', 'bank_transfer']),
  paymentReference: z.string().optional().or(z.literal('')),
  amount: z.number().positive().optional(),
});

// --- CLINICAL WORKSPACE ---
export const PrescriptionItemSchema = z.object({
  productId: z.string().uuid().nullable().optional(),
  medicineName: z.string().min(1, { message: 'Medicine name is required' }),
  dosage: z.string().min(1, { message: 'Dosage is required' }),
  frequency: z.string().min(1, { message: 'Frequency is required' }),
  duration: z.string().min(1, { message: 'Duration is required' }),
  instructions: z.string().optional().or(z.literal('')),
  quantityRequested: z.number().int().positive(),
});

export const VisitServiceItemSchema = z.object({
  serviceId: z.string().uuid().nullable().optional(),
  name: z.string().min(1, { message: 'Service name is required' }),
  unitPrice: z.number().nonnegative(),
  quantity: z.number().int().positive(),
});

export const CompleteConsultationSchema = z.object({
  visitId: EntityIdSchema,
  visitType: z.enum(['standard', 'lab', 'surgery']),
  chiefComplaint: z.string().min(1, { message: 'Chief complaint is required' }),
  history: z.string().optional().or(z.literal('')),
  examinationFindings: z.string().optional().or(z.literal('')),
  diagnosis: z.string().min(1, { message: 'Diagnosis is required' }),
  treatmentPlan: z.string().optional().or(z.literal('')),
  procedureNotes: z.string().optional().or(z.literal('')),
  postOpMedication: z.string().optional().or(z.literal('')),
  internalNotes: z.string().optional().or(z.literal('')),
  followUpRecommendation: z.string().optional().or(z.literal('')),
  followUpDays: z.array(z.number().int().positive()),
  temperatureC: z.number().nonnegative().optional().or(z.nan()),
  heartRateBpm: z.number().int().nonnegative().optional().or(z.nan()),
  respiratoryRate: z.number().int().nonnegative().optional().or(z.nan()),
  weightKg: z.number().nonnegative().optional().or(z.nan()),
  prescriptionItems: z.array(PrescriptionItemSchema),
  serviceItems: z.array(VisitServiceItemSchema),
});

export const RescheduleAppointmentSchema = z.object({
  appointmentId: z.string().uuid(),
  preferredDate: z.string().min(1, { message: 'Date is required' }),
  preferredTime: z.string().min(1, { message: 'Time is required' }),
});

export const StaffAppointmentSchema = z.object({
  customerId: z.string().uuid({ message: 'Select a valid customer' }),
  petId: z.string().uuid({ message: 'Select a valid pet' }),
  branchId: z.string().uuid({ message: 'Select a valid branch' }),
  doctorId: z.string().uuid().optional().or(z.literal('')),
  preferredDate: z.string().min(1, { message: 'Date is required' }),
  preferredTime: z.string().min(1, { message: 'Time is required' }),
  reason: z.string().min(1, { message: 'Reason for visit is required' }),
  isEmergency: z.boolean().default(false),
  intakeNotes: z.string().optional().or(z.literal('')),
});

const AppointmentCustomerFieldsSchema = z.object({
  firstName: z.string().min(1, { message: 'First name is required' }),
  lastName: z.string().min(1, { message: 'Last name is required' }),
  phone: z.string().min(5, { message: 'Phone number is required' }),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
});

const AppointmentPetFieldsSchema = z.object({
  name: z.string().min(1, { message: 'Pet name is required' }),
  species: z.string().min(1, { message: 'Species is required' }),
  breed: z.string().optional().or(z.literal('')),
  gender: z.string().optional().or(z.literal('')),
});

export const AppointmentWithPatientSchema = z
  .object({
    branchId: z.string().uuid({ message: 'Invalid branch' }),
    customerId: z.string().uuid().optional(),
    customer: AppointmentCustomerFieldsSchema.optional(),
    petId: z.string().uuid().optional(),
    pet: AppointmentPetFieldsSchema.optional(),
    doctorId: z.string().uuid().optional().or(z.literal('')),
    preferredDate: z.string().min(1, { message: 'Date is required' }),
    preferredTime: z.string().min(1, { message: 'Time is required' }),
    reason: z.string().min(1, { message: 'Reason for visit is required' }),
    isEmergency: z.boolean().default(false),
    intakeNotes: z.string().optional().or(z.literal('')),
  })
  .refine((data) => data.customerId || data.customer, {
    message: 'Customer details are required',
    path: ['customer'],
  })
  .refine((data) => data.petId || data.pet, {
    message: 'Pet details are required',
    path: ['pet'],
  });

export const MarkEmergencySchema = z.object({
  appointmentId: z.string().uuid(),
  isEmergency: z.boolean(),
});

export const OrganizationFeaturesSchema = z.object({
  organizationId: z.string().uuid(),
  features: z.record(z.string(), z.boolean()),
});

// --- PUBLIC BOOKINGS ---
export const AppointmentRequestSchema = z.object({
  orgSlug: z.string().min(1),
  branchId: z.string().uuid({ message: 'Select a valid branch' }),
  customerName: z.string().min(1, { message: 'Name is required' }),
  customerEmail: z.string().email({ message: 'Invalid email address' }),
  customerPhone: z.string().min(5, { message: 'Phone number is required' }),
  petName: z.string().min(1, { message: 'Pet name is required' }),
  petSpecies: z.string().min(1, { message: 'Pet species is required' }),
  preferredDate: z.string().min(1, { message: 'Select a preferred date' }),
  preferredTime: z.string().min(1, { message: 'Select a preferred time' }),
  reason: z.string().min(1, { message: 'Reason for visit is required' }),
});

// --- WALK-INS ---
export const WalkInSchema = z.object({
  petId: EntityIdSchema,
  customerId: EntityIdSchema,
  doctorId: EntityIdSchema,
  reason: z.string().min(1, { message: 'Reason for visit is required' }),
  branchId: EntityIdSchema,
  isEmergency: z.boolean().default(false),
  triageNotes: z.string().optional().or(z.literal('')),
});

// --- TYPE INFERENCES ---
export type ProductInput = z.infer<typeof ProductSchema>;
export type StockAdjustmentInput = z.infer<typeof StockAdjustmentSchema>;
export type PetInput = z.infer<typeof PetSchema>;
export type CustomerInput = z.infer<typeof CustomerSchema>;
export type StaffInput = z.infer<typeof StaffSchema>;
export type SettingsInput = z.infer<typeof SettingsSchema>;
export type BranchInput = z.infer<typeof BranchSchema>;
export type SubscriptionInput = z.infer<typeof SubscriptionSchema>;
export type CheckoutInput = z.infer<typeof CheckoutSchema>;
export type CompleteConsultationInput = z.infer<typeof CompleteConsultationSchema>;
export type AppointmentRequestInput = z.infer<typeof AppointmentRequestSchema>;
export type WalkInInput = z.infer<typeof WalkInSchema>;
export type StaffAppointmentInput = z.infer<typeof StaffAppointmentSchema>;
export type AppointmentWithPatientInput = z.infer<typeof AppointmentWithPatientSchema>;
export type MarkEmergencyInput = z.infer<typeof MarkEmergencySchema>;
export type RescheduleAppointmentInput = z.infer<typeof RescheduleAppointmentSchema>;
export type OrganizationFeaturesInput = z.infer<typeof OrganizationFeaturesSchema>;

