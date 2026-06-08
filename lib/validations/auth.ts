import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters long' }),
});

export const RegisterSchema = z.object({
  firstName: z.string().min(1, { message: 'First name is required' }),
  lastName: z.string().min(1, { message: 'Last name is required' }),
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters long' }),
  phone: z.string().min(5, { message: 'Phone number is required' }),
  orgName: z.string().min(1, { message: 'Clinic name is required' }),
  orgSlug: z
    .string()
    .min(3, { message: 'Slug must be at least 3 characters' })
    .regex(/^[a-z0-9-]+$/, { message: 'Slug can only contain lowercase letters, numbers, and hyphens' }),
  branchName: z.string().min(1, { message: 'Initial branch name is required' }),
  branchAddress: z.string().min(1, { message: 'Branch address is required' }),
  branchPhone: z.string().min(5, { message: 'Branch phone number is required' }),
});
export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;

/**
 * Superadmin-only clinic provisioning. Adds clinic type + plan selection on top
 * of the base registration fields.
 */
export const ProvisionClinicSchema = RegisterSchema.extend({
  phone: z.string().optional().or(z.literal('')),
  clinicTypeId: z.string().min(1, { message: 'Clinic type is required' }),
  planId: z.enum(['trial', 'starter', 'pro', 'enterprise'], { message: 'Invalid plan' }),
});
export type ProvisionClinicInput = z.infer<typeof ProvisionClinicSchema>;

/**
 * Public "request access" lead capture (no account is created).
 */
export const RequestAccessSchema = z.object({
  fullName: z.string().min(1, { message: 'Your name is required' }),
  email: z.string().email({ message: 'Invalid email address' }),
  clinicName: z.string().min(1, { message: 'Clinic name is required' }),
  clinicType: z.string().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  message: z.string().max(1000).optional().or(z.literal('')),
});
export type RequestAccessInput = z.infer<typeof RequestAccessSchema>;
