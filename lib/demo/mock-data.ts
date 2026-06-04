/**
 * Mock data for demo mode dashboards.
 * Provides realistic-looking data for all dashboard pages without a database.
 */

// ─── Dashboard Overview KPIs ───────────────────────────────────────────────────

export const MOCK_DASHBOARD_KPIS = {
  todayAppointments: 8,
  waitingWalkIns: 3,
  unpaidInvoices: 5,
  totalCustomers: 142,
  totalPets: 187,
};

export const MOCK_LOW_STOCK_ITEMS = [
  { id: '1', name: 'Amoxicillin 250mg', stock_quantity: 12, reorder_level: 20 },
  { id: '2', name: 'Rabies Vaccine', stock_quantity: 3, reorder_level: 10 },
  { id: '3', name: 'Flea Treatment Spot-On', stock_quantity: 5, reorder_level: 15 },
];

export const MOCK_RECENT_VISITS = [
  {
    id: 'v1',
    reason: 'Severe ear irritation and scratching',
    status: 'waiting',
    checked_in_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    pets: { name: 'Bella', species: 'Cat' },
    customers: { first_name: 'Jane', last_name: 'Smith' },
  },
  {
    id: 'v2',
    reason: 'Limping on right hind leg after park visit',
    status: 'consulting',
    checked_in_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    pets: { name: 'Max', species: 'Dog' },
    customers: { first_name: 'John', last_name: 'Doe' },
  },
  {
    id: 'v3',
    reason: 'Annual vaccination booster',
    status: 'ready_for_checkout',
    checked_in_at: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    pets: { name: 'Rocky', species: 'Dog' },
    customers: { first_name: 'Bob', last_name: 'Johnson' },
  },
  {
    id: 'v4',
    reason: 'Dental cleaning and checkup',
    status: 'completed',
    checked_in_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    pets: { name: 'Luna', species: 'Cat' },
    customers: { first_name: 'Alice', last_name: 'Williams' },
  },
  {
    id: 'v5',
    reason: 'Skin allergy follow-up',
    status: 'completed',
    checked_in_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    pets: { name: 'Buddy', species: 'Dog' },
    customers: { first_name: 'Charlie', last_name: 'Brown' },
  },
];

// ─── Appointments ──────────────────────────────────────────────────────────────

export const MOCK_APPOINTMENTS = [
  {
    id: 'ap1',
    customer_name: 'John Doe',
    customer_email: 'john.doe@gmail.com',
    customer_phone: '555-9090',
    pet_name: 'Max',
    pet_species: 'Dog',
    preferred_date: new Date().toISOString().split('T')[0],
    preferred_time: '10:00:00',
    reason: 'Routine checkup & vaccinations',
    status: 'confirmed',
    doctor: { id: 'ad1', user_profiles: { first_name: 'Alexander', last_name: 'Fleming' } },
  },
  {
    id: 'ap2',
    customer_name: 'Jane Smith',
    customer_email: 'jane.smith@gmail.com',
    customer_phone: '555-8080',
    pet_name: 'Bella',
    pet_species: 'Cat',
    preferred_date: new Date().toISOString().split('T')[0],
    preferred_time: '14:30:00',
    reason: 'Ear scratching check',
    status: 'confirmed',
    doctor: { id: 'ad1', user_profiles: { first_name: 'Alexander', last_name: 'Fleming' } },
  },
  {
    id: 'ap3',
    customer_name: 'Bob Johnson',
    customer_email: 'bob.j@gmail.com',
    customer_phone: '555-7070',
    pet_name: 'Rocky',
    pet_species: 'Dog',
    preferred_date: new Date().toISOString().split('T')[0],
    preferred_time: '16:00:00',
    reason: 'Hip joint evaluation',
    status: 'pending',
    doctor: null,
  },
  {
    id: 'ap4',
    customer_name: 'Alice Williams',
    customer_email: 'alice.w@gmail.com',
    customer_phone: '555-6060',
    pet_name: 'Luna',
    pet_species: 'Cat',
    preferred_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    preferred_time: '09:00:00',
    reason: 'Dental cleaning scheduled',
    status: 'confirmed',
    doctor: { id: 'ad1', user_profiles: { first_name: 'Alexander', last_name: 'Fleming' } },
  },
];

// ─── Walk-ins ──────────────────────────────────────────────────────────────────

export const MOCK_WALK_INS = [
  {
    id: 'w1',
    reason: 'Severe ear irritation and scratching',
    status: 'waiting',
    checked_in_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    pets: { name: 'Bella', species: 'Cat' },
    customers: { first_name: 'Jane', last_name: 'Smith' },
    visit_assignments: [],
  },
  {
    id: 'w2',
    reason: 'Limping on right hind leg',
    status: 'consulting',
    checked_in_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    pets: { name: 'Max', species: 'Dog' },
    customers: { first_name: 'John', last_name: 'Doe' },
    visit_assignments: [{ doctor_id: 'ad1', user_profiles: { first_name: 'Dr. Fleming' } }],
  },
  {
    id: 'w3',
    reason: 'Annual vaccination booster',
    status: 'ready_for_checkout',
    checked_in_at: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    pets: { name: 'Rocky', species: 'Dog' },
    customers: { first_name: 'Bob', last_name: 'Johnson' },
    visit_assignments: [{ doctor_id: 'ad1', user_profiles: { first_name: 'Dr. Fleming' } }],
  },
];

// ─── Customers ─────────────────────────────────────────────────────────────────

export const MOCK_CUSTOMERS = [
  {
    id: 'c1',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@gmail.com',
    phone: '555-9090',
    address: '101 Elm St, New York',
    created_at: '2026-01-15T10:00:00Z',
    pets: [{ id: 'p1', name: 'Max' }],
  },
  {
    id: 'c2',
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'jane.smith@gmail.com',
    phone: '555-8080',
    address: '202 Oak St, New York',
    created_at: '2026-02-20T14:30:00Z',
    pets: [{ id: 'p2', name: 'Bella' }],
  },
  {
    id: 'c3',
    first_name: 'Bob',
    last_name: 'Johnson',
    email: 'bob.johnson@gmail.com',
    phone: '555-7070',
    address: '303 Maple St, Boston',
    created_at: '2026-03-10T09:15:00Z',
    pets: [{ id: 'p3', name: 'Rocky' }],
  },
  {
    id: 'c4',
    first_name: 'Alice',
    last_name: 'Williams',
    email: 'alice.w@gmail.com',
    phone: '555-6060',
    address: '404 Pine St, New York',
    created_at: '2026-04-01T11:45:00Z',
    pets: [{ id: 'p4', name: 'Luna' }],
  },
  {
    id: 'c5',
    first_name: 'Charlie',
    last_name: 'Brown',
    email: 'charlie.b@gmail.com',
    phone: '555-5050',
    address: '505 Cedar Ave, New York',
    created_at: '2026-05-15T16:00:00Z',
    pets: [{ id: 'p5', name: 'Buddy' }],
  },
];

// ─── Pets ──────────────────────────────────────────────────────────────────────

export const MOCK_PETS = [
  {
    id: 'p1',
    name: 'Max',
    species: 'Dog',
    breed: 'Golden Retriever',
    gender: 'Male',
    date_of_birth: '2022-01-15',
    weight_kg: 32.5,
    allergies: 'None',
    medical_notes: 'Healthy active pet',
    customers: { first_name: 'John', last_name: 'Doe' },
  },
  {
    id: 'p2',
    name: 'Bella',
    species: 'Cat',
    breed: 'Siamese',
    gender: 'Spayed Female',
    date_of_birth: '2023-04-10',
    weight_kg: 4.2,
    allergies: 'Penicillin',
    medical_notes: 'Allergic to specific antibiotics',
    customers: { first_name: 'Jane', last_name: 'Smith' },
  },
  {
    id: 'p3',
    name: 'Rocky',
    species: 'Dog',
    breed: 'German Shepherd',
    gender: 'Neutered Male',
    date_of_birth: '2021-09-01',
    weight_kg: 38.0,
    allergies: 'None',
    medical_notes: 'Hip problems',
    customers: { first_name: 'Bob', last_name: 'Johnson' },
  },
  {
    id: 'p4',
    name: 'Luna',
    species: 'Cat',
    breed: 'Persian',
    gender: 'Female',
    date_of_birth: '2024-02-14',
    weight_kg: 3.8,
    allergies: 'None',
    medical_notes: 'Indoor cat, regular dental checks needed',
    customers: { first_name: 'Alice', last_name: 'Williams' },
  },
  {
    id: 'p5',
    name: 'Buddy',
    species: 'Dog',
    breed: 'Labrador',
    gender: 'Male',
    date_of_birth: '2023-07-20',
    weight_kg: 28.3,
    allergies: 'Chicken protein',
    medical_notes: 'Seasonal skin allergies',
    customers: { first_name: 'Charlie', last_name: 'Brown' },
  },
];

// ─── Inventory ─────────────────────────────────────────────────────────────────

export const MOCK_PRODUCTS = [
  {
    id: 'pr1',
    name: 'Amoxicillin 250mg',
    brand: 'VetMed',
    sku: 'AMX-250',
    unit: 'tablet',
    type: 'medicine',
    purchase_price: 0.5,
    selling_price: 1.5,
    stock_quantity: 200,
    reorder_level: 20,
    is_active: true,
    category: { name: 'Medicines' },
  },
  {
    id: 'pr2',
    name: 'Premium Puppy Food',
    brand: 'Purina',
    sku: 'PUR-PPF-10',
    unit: 'pack',
    type: 'food',
    purchase_price: 12.0,
    selling_price: 25.0,
    stock_quantity: 15,
    reorder_level: 3,
    is_active: true,
    category: { name: 'Nutrition' },
  },
  {
    id: 'pr3',
    name: 'General Consultation',
    brand: 'VetFlow',
    sku: 'SVC-CONSULT',
    unit: 'session',
    type: 'service',
    purchase_price: 0.0,
    selling_price: 50.0,
    stock_quantity: 9999,
    reorder_level: 0,
    is_active: true,
    category: { name: 'Services' },
  },
  {
    id: 'pr4',
    name: 'Rabies Vaccine (Canine)',
    brand: 'Merial',
    sku: 'VAX-RAB-C',
    unit: 'dose',
    type: 'medicine',
    purchase_price: 8.0,
    selling_price: 25.0,
    stock_quantity: 3,
    reorder_level: 10,
    is_active: true,
    category: { name: 'Medicines' },
  },
  {
    id: 'pr5',
    name: 'Flea Treatment Spot-On',
    brand: 'Frontline',
    sku: 'FLT-SPOT',
    unit: 'pipette',
    type: 'medicine',
    purchase_price: 5.0,
    selling_price: 15.0,
    stock_quantity: 5,
    reorder_level: 15,
    is_active: true,
    category: { name: 'Medicines' },
  },
  {
    id: 'pr6',
    name: 'Wound Dressing Pack',
    brand: 'VetWrap',
    sku: 'WND-DRS',
    unit: 'pack',
    type: 'supply',
    purchase_price: 3.0,
    selling_price: 8.0,
    stock_quantity: 45,
    reorder_level: 10,
    is_active: true,
    category: { name: 'Supplies' },
  },
];

// ─── Invoices ──────────────────────────────────────────────────────────────────

export const MOCK_INVOICES = [
  {
    id: 'i1',
    invoice_number: 'INV-2026-0001',
    subtotal: 75.0,
    discount: 0.0,
    tax_percentage: 15.0,
    tax_amount: 11.25,
    total: 86.25,
    payment_status: 'unpaid',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    customers: { first_name: 'John', last_name: 'Doe' },
    pets: { name: 'Max' },
  },
  {
    id: 'i2',
    invoice_number: 'INV-2026-0002',
    subtotal: 71.0,
    discount: 0.0,
    tax_percentage: 15.0,
    tax_amount: 10.65,
    total: 81.65,
    payment_status: 'paid',
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    customers: { first_name: 'John', last_name: 'Doe' },
    pets: { name: 'Max' },
  },
  {
    id: 'i3',
    invoice_number: 'INV-2026-0003',
    subtotal: 50.0,
    discount: 5.0,
    tax_percentage: 15.0,
    tax_amount: 6.75,
    total: 51.75,
    payment_status: 'unpaid',
    created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    customers: { first_name: 'Jane', last_name: 'Smith' },
    pets: { name: 'Bella' },
  },
  {
    id: 'i4',
    invoice_number: 'INV-2026-0004',
    subtotal: 125.0,
    discount: 0.0,
    tax_percentage: 15.0,
    tax_amount: 18.75,
    total: 143.75,
    payment_status: 'paid',
    created_at: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    customers: { first_name: 'Bob', last_name: 'Johnson' },
    pets: { name: 'Rocky' },
  },
  {
    id: 'i5',
    invoice_number: 'INV-2026-0005',
    subtotal: 40.0,
    discount: 0.0,
    tax_percentage: 15.0,
    tax_amount: 6.0,
    total: 46.0,
    payment_status: 'unpaid',
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    customers: { first_name: 'Alice', last_name: 'Williams' },
    pets: { name: 'Luna' },
  },
];

// ─── Prescriptions ─────────────────────────────────────────────────────────────

export const MOCK_PRESCRIPTIONS = [
  {
    id: 'rx1',
    revision_number: 1,
    notes: 'Standard antibiotic course for skin scratch prevention',
    is_finalized: true,
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    pets: { name: 'Max' },
    doctor: { first_name: 'Alexander', last_name: 'Fleming' },
    prescription_items: [
      { medicine_name: 'Amoxicillin 250mg', dosage: '1 tablet', frequency: 'Twice daily', duration: '7 days', quantity_requested: 14 },
    ],
  },
  {
    id: 'rx2',
    revision_number: 1,
    notes: 'Anti-inflammatory for hip joint pain management',
    is_finalized: true,
    created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    pets: { name: 'Rocky' },
    doctor: { first_name: 'Alexander', last_name: 'Fleming' },
    prescription_items: [
      { medicine_name: 'Meloxicam 1.5mg', dosage: '0.5 tablet', frequency: 'Once daily', duration: '14 days', quantity_requested: 7 },
    ],
  },
  {
    id: 'rx3',
    revision_number: 1,
    notes: 'Ear drops for otitis externa',
    is_finalized: false,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    pets: { name: 'Bella' },
    doctor: { first_name: 'Alexander', last_name: 'Fleming' },
    prescription_items: [
      { medicine_name: 'Otomax Ear Drops', dosage: '5 drops', frequency: 'Twice daily', duration: '10 days', quantity_requested: 1 },
    ],
  },
];

// ─── Staff ─────────────────────────────────────────────────────────────────────

export const MOCK_STAFF = [
  {
    id: 's1',
    user_id: 'a9000000-0000-0000-0000-000000000000',
    role: 'clinic_admin',
    is_active: true,
    user_profiles: { first_name: 'Sarah', last_name: 'Owner', phone: '555-0101' },
  },
  {
    id: 's2',
    user_id: 'ad000000-0000-0000-0000-000000000000',
    role: 'doctor',
    is_active: true,
    user_profiles: { first_name: 'Alexander', last_name: 'Fleming', phone: '555-0201' },
  },
  {
    id: 's3',
    user_id: 'ae000000-0000-0000-0000-000000000000',
    role: 'receptionist',
    is_active: true,
    user_profiles: { first_name: 'Emily', last_name: 'Desk', phone: '555-0301' },
  },
];

// ─── Doctor Queue ──────────────────────────────────────────────────────────────

export const MOCK_DOCTOR_QUEUE = [
  {
    id: 'dq1',
    reason: 'Severe ear irritation and scratching',
    status: 'waiting',
    checked_in_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    pets: { name: 'Bella', species: 'Cat', breed: 'Siamese' },
    customers: { first_name: 'Jane', last_name: 'Smith' },
    clinical_notes: [],
  },
  {
    id: 'dq2',
    reason: 'Limping on right hind leg',
    status: 'consulting',
    checked_in_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    pets: { name: 'Max', species: 'Dog', breed: 'Golden Retriever' },
    customers: { first_name: 'John', last_name: 'Doe' },
    clinical_notes: [{ id: 'cn1', chief_complaint: 'Limping', diagnosis: 'Mild sprain' }],
  },
];

// ─── Reports ───────────────────────────────────────────────────────────────────

export const MOCK_REPORTS = {
  totalRevenue: 4850.0,
  paidInvoices: 12,
  unpaidInvoices: 5,
  totalVisits: 47,
  averageConsultationTime: 22, // minutes
  topServices: [
    { name: 'General Consultation', count: 28 },
    { name: 'Vaccination', count: 15 },
    { name: 'Dental Cleaning', count: 8 },
    { name: 'Surgery', count: 3 },
  ],
};

// ─── Super Admin ───────────────────────────────────────────────────────────────

export const MOCK_SUPER_ADMIN_DATA = {
  subscriptions: [
    { status: 'active', plan_name: 'growth' },
    { status: 'trial', plan_name: 'trial' },
    { status: 'active', plan_name: 'enterprise' },
    { status: 'active', plan_name: 'starter' },
    { status: 'trial', plan_name: 'trial' },
    { status: 'suspended', plan_name: 'growth' },
  ],
  totalUsers: 24,
  totalBranches: 8,
  recentOrgs: [
    { id: 'o1', name: 'VetCare Center', slug: 'vetcare', created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
    { id: 'o2', name: 'Animal Hospital Group', slug: 'animalhospital', created_at: new Date(Date.now() - 5 * 86400000).toISOString() },
    { id: 'o3', name: 'PawPrint Veterinary', slug: 'pawprint', created_at: new Date(Date.now() - 8 * 86400000).toISOString() },
    { id: 'o4', name: 'City Pet Clinic', slug: 'citypet', created_at: new Date(Date.now() - 12 * 86400000).toISOString() },
    { id: 'o5', name: 'Sunset Animal Care', slug: 'sunsetac', created_at: new Date(Date.now() - 15 * 86400000).toISOString() },
  ],
};
