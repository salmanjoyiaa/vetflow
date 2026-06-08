/**
 * Hardcoded demo credentials for local testing without a running Supabase instance.
 * Each credential maps to a specific role, organization, and branch context.
 *
 * Enable demo mode by setting NEXT_PUBLIC_DEMO_MODE=true in .env.local
 */

export interface DemoUser {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'super_admin' | 'clinic_admin' | 'doctor' | 'receptionist' | null;
  isSuperAdmin: boolean;
  organizationId: string | null;
  organizationName: string | null;
  branches: { id: string; name: string }[];
}

export const DEMO_USERS: DemoUser[] = [
  {
    id: '77777777-7777-7777-7777-777777777777',
    email: 'salmanjoyiaa@gmail.com',
    password: 'password123',
    firstName: 'Platform',
    lastName: 'Admin',
    role: 'super_admin',
    isSuperAdmin: true,
    organizationId: null,
    organizationName: null,
    branches: [],
  },
  {
    id: 'a9000000-0000-0000-0000-000000000000',
    email: 'admin.a@vetcare.com',
    password: 'password123',
    firstName: 'Sarah',
    lastName: 'Owner',
    role: 'clinic_admin',
    isSuperAdmin: false,
    organizationId: 'a0000000-0000-0000-0000-000000000000',
    organizationName: 'VetCare Center',
    branches: [
      { id: 'a1000000-0000-0000-0000-000000000000', name: 'Downtown Clinic' },
      { id: 'a2000000-0000-0000-0000-000000000000', name: 'Uptown Branch' },
    ],
  },
  {
    id: 'ad000000-0000-0000-0000-000000000000',
    email: 'doctor.a@vetcare.com',
    password: 'password123',
    firstName: 'Alexander',
    lastName: 'Fleming',
    role: 'doctor',
    isSuperAdmin: false,
    organizationId: 'a0000000-0000-0000-0000-000000000000',
    organizationName: 'VetCare Center',
    branches: [
      { id: 'a1000000-0000-0000-0000-000000000000', name: 'Downtown Clinic' },
    ],
  },
  {
    id: 'ae000000-0000-0000-0000-000000000000',
    email: 'receptionist.a@vetcare.com',
    password: 'password123',
    firstName: 'Emily',
    lastName: 'Desk',
    role: 'receptionist',
    isSuperAdmin: false,
    organizationId: 'a0000000-0000-0000-0000-000000000000',
    organizationName: 'VetCare Center',
    branches: [
      { id: 'a1000000-0000-0000-0000-000000000000', name: 'Downtown Clinic' },
    ],
  },
  {
    id: 'b9000000-0000-0000-0000-000000000000',
    email: 'admin.b@animalhospital.com',
    password: 'password123',
    firstName: 'Michael',
    lastName: 'Admin',
    role: 'clinic_admin',
    isSuperAdmin: false,
    organizationId: 'b0000000-0000-0000-0000-000000000000',
    organizationName: 'Animal Hospital Group',
    branches: [
      { id: 'b1000000-0000-0000-0000-000000000000', name: 'East Wing Main' },
    ],
  },
  {
    id: 'bd000000-0000-0000-0000-000000000000',
    email: 'doctor.b@animalhospital.com',
    password: 'password123',
    firstName: 'Gregory',
    lastName: 'House',
    role: 'doctor',
    isSuperAdmin: false,
    organizationId: 'b0000000-0000-0000-0000-000000000000',
    organizationName: 'Animal Hospital Group',
    branches: [
      { id: 'b1000000-0000-0000-0000-000000000000', name: 'East Wing Main' },
    ],
  },
  {
    id: 'c9000000-0000-0000-0000-000000000000',
    email: 'setup.demo@clinixdev.com',
    password: 'password123',
    firstName: 'New',
    lastName: 'User',
    role: null,
    isSuperAdmin: false,
    organizationId: null,
    organizationName: null,
    branches: [],
  },
];

export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
}

export function findDemoUser(email: string, password: string): DemoUser | null {
  return DEMO_USERS.find(
    (u) => u.email === email && u.password === password
  ) ?? null;
}

export function findDemoUserById(id: string): DemoUser | null {
  return DEMO_USERS.find((u) => u.id === id) ?? null;
}
