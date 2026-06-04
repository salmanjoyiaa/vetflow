import { z } from 'zod';

// --- INVENTORY / PRODUCTS ---
export const ProductSchema = z.object({
  name: z.string().min(1, { message: 'Product name is required' }),
  brand: z.string().optional().or(z.literal('')),
  sku: z.string().optional().or(z.literal('')),
  unit: z.string().min(1, { message: 'Unit is required' }),
  type: z.enum(['medicine', 'food', 'accessory', 'service'], { message: 'Invalid type' }),
  purchasePrice: z.number().nonnegative(),
  sellingPrice: z.number().nonnegative(),
  stockQuantity: z.number().int().nonnegative(),
  reorderLevel: z.number().int().nonnegative(),
  categoryId: z.string().uuid().nullable().optional(),
  branchId: z.string().uuid({ message: 'Invalid branch' }),
});

export const StockAdjustmentSchema = z.object({
  productId: z.string().uuid(),
  branchId: z.string().uuid(),
  quantity: z.number().int(),
  type: z.enum(['purchase_added', 'manual_adjustment', 'expired_removed', 'return']),
  reason: z.string().min(1, { message: 'Reason is required' }),
});

// --- PETS ---
export const PetSchema = z.object({
  name: z.string().min(1, { message: 'Pet name is required' }),
  species: z.string().min(1, { message: 'Species is required' }), // e.g. Dog, Cat, etc.
  breed: z.string().optional().or(z.literal('')),
  gender: z.string().min(1, { message: 'Gender is required' }), // Male, Female, Spayed, Neutered
  dateOfBirth: z.string().optional().or(z.literal('')),
  weightKg: z.number().nonnegative().optional().or(z.nan()),
  allergies: z.string().optional().or(z.literal('')),
  medicalNotes: z.string().optional().or(z.literal('')),
  customerId: z.string().uuid({ message: 'Invalid customer selection' }),
});

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

// --- CLINIC / APP SETTINGS ---
export const SettingsSchema = z.object({
  timezone: z.string().min(1, { message: 'Timezone is required' }),
  currency: z.string().min(1, { message: 'Currency is required' }),
  isTaxEnabled: z.boolean(),
  taxName: z.string().min(1, { message: 'Tax name is required' }),
  taxPercentage: z.number().min(0).max(100),
  appliesToProducts: z.boolean(),
  appliesToServices: z.boolean(),
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
  planName: z.enum(['trial', 'growth', 'enterprise']),
  status: z.enum(['active', 'trial', 'suspended', 'cancelled']),
  trialEnd: z.string(),
  renewalDate: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});

// --- BILLING / CHECKOUT ---
export const CheckoutSchema = z.object({
  visitId: z.string().uuid(),
  discount: z.number().nonnegative(),
  paymentMethod: z.enum(['cash', 'card', 'bank_transfer']),
  paymentReference: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
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

export const CompleteConsultationSchema = z.object({
  visitId: z.string().uuid(),
  chiefComplaint: z.string().min(1, { message: 'Chief complaint is required' }),
  history: z.string().optional().or(z.literal('')),
  examinationFindings: z.string().optional().or(z.literal('')),
  diagnosis: z.string().min(1, { message: 'Diagnosis is required' }),
  treatmentPlan: z.string().optional().or(z.literal('')),
  internalNotes: z.string().optional().or(z.literal('')),
  followUpRecommendation: z.string().optional().or(z.literal('')),
  prescriptionItems: z.array(PrescriptionItemSchema),
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
  petId: z.string().uuid({ message: 'Select a valid pet' }),
  customerId: z.string().uuid({ message: 'Select a valid customer' }),
  doctorId: z.string().uuid({ message: 'Select a valid doctor' }),
  reason: z.string().min(1, { message: 'Reason for visit is required' }),
  branchId: z.string().uuid({ message: 'Select a valid branch' }),
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

