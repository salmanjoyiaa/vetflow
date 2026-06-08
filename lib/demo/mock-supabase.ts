import { DEMO_USERS, findDemoUserById } from './credentials';
import * as mockData from './mock-data';
import { MOCK_INVOICE_ITEMS } from './mock-data';

// Helper to resolve the correct mock data array based on table name
function getMockDataForTable(table: string): any[] {
  switch (table) {
    case 'appointments':
      return mockData.MOCK_APPOINTMENTS;
    case 'organization_members':
      return mockData.MOCK_STAFF.map(s => ({
        user_id: s.user_id,
        role: s.role,
        is_active: s.is_active,
        organization_id: 'a0000000-0000-0000-0000-000000000000',
        user_profiles: s.user_profiles,
        organizations: { name: 'VetCare Center' }
      }));
    case 'organizations':
      return [
        { id: 'a0000000-0000-0000-0000-000000000000', name: 'VetCare Center', slug: 'vetcare' },
        { id: 'b0000000-0000-0000-0000-000000000000', name: 'Animal Hospital Group', slug: 'animalhospital' }
      ];
    case 'branches':
      return [
        { id: 'a1000000-0000-0000-0000-000000000000', organization_id: 'a0000000-0000-0000-0000-000000000000', name: 'Downtown Clinic', address: '123 Main St', phone: '555-0101', email: 'admin.a@vetcare.com', is_active: true },
        { id: 'a2000000-0000-0000-0000-000000000000', organization_id: 'a0000000-0000-0000-0000-000000000000', name: 'Uptown Branch', address: '456 High St', phone: '555-0102', email: 'admin.a@vetcare.com', is_active: true },
        { id: 'b1000000-0000-0000-0000-000000000000', organization_id: 'b0000000-0000-0000-0000-000000000000', name: 'East Wing Main', address: '789 East Rd', phone: '555-0201', email: 'admin.b@animalhospital.com', is_active: true }
      ];
    case 'branch_members':
      return [
        { id: 'bm1', branch_id: 'a1000000-0000-0000-0000-000000000000', user_id: 'a9000000-0000-0000-0000-000000000000' },
        { id: 'bm2', branch_id: 'a2000000-0000-0000-0000-000000000000', user_id: 'a9000000-0000-0000-0000-000000000000' },
        { id: 'bm3', branch_id: 'a1000000-0000-0000-0000-000000000000', user_id: 'ad000000-0000-0000-0000-000000000000' },
        { id: 'bm4', branch_id: 'a1000000-0000-0000-0000-000000000000', user_id: 'ae000000-0000-0000-0000-000000000000' },
        { id: 'bm5', branch_id: 'b1000000-0000-0000-0000-000000000000', user_id: 'b9000000-0000-0000-0000-000000000000' },
        { id: 'bm6', branch_id: 'b1000000-0000-0000-0000-000000000000', user_id: 'bd000000-0000-0000-0000-000000000000' }
      ];
    case 'visits':
      return mockData.MOCK_RECENT_VISITS;
    case 'walk_ins':
      return mockData.MOCK_WALK_INS;
    case 'customers':
      return mockData.MOCK_CUSTOMERS;
    case 'pets':
    case 'patients':
      return mockData.MOCK_PETS;
    case 'products':
      return mockData.MOCK_PRODUCTS;
    case 'invoices':
      return mockData.MOCK_INVOICES;
    case 'invoice_items':
      return MOCK_INVOICE_ITEMS;
    case 'prescriptions':
      return mockData.MOCK_PRESCRIPTIONS;
    case 'user_profiles':
      return mockData.MOCK_STAFF.map(s => ({
        id: s.user_id,
        first_name: s.user_profiles.first_name,
        last_name: s.user_profiles.last_name,
        phone: s.user_profiles.phone as string | null,
        is_super_admin: s.role === 'super_admin'
      })).concat([
        {
          id: '77777777-7777-7777-7777-777777777777',
          first_name: 'Platform',
          last_name: 'Admin',
          phone: null as string | null,
          is_super_admin: true
        }
      ]);
    case 'impersonation_sessions':
      return [];
    case 'subscription_status':
      return [
        { organization_id: 'a0000000-0000-0000-0000-000000000000', plan_name: 'growth', status: 'active' },
        { organization_id: 'b0000000-0000-0000-0000-000000000000', plan_name: 'trial', status: 'trial' }
      ];
    case 'tax_settings':
      return [
        { organization_id: 'a0000000-0000-0000-0000-000000000000', is_enabled: true, tax_name: 'VAT', tax_percentage: 15.00, applies_to_products: true, applies_to_services: true },
        { organization_id: 'b0000000-0000-0000-0000-000000000000', is_enabled: true, tax_name: 'VAT', tax_percentage: 15.00, applies_to_products: true, applies_to_services: true }
      ];
    case 'app_settings':
      return [
        { organization_id: 'a0000000-0000-0000-0000-000000000000', timezone: 'UTC', currency: 'USD' },
        { organization_id: 'b0000000-0000-0000-0000-000000000000', timezone: 'UTC', currency: 'USD' }
      ];
    default:
      return [];
  }
}

class MockSupabaseQueryBuilder {
  private isSingle = false;
  private filters: Array<(item: any) => boolean> = [];
  private payload: any = null;

  constructor(private table: string) {}

  select(fields?: string) { return this; }

  insert(values: any) {
    this.payload = values;
    return this;
  }

  update(values: any) {
    this.payload = values;
    return this;
  }

  delete() { return this; }

  eq(column: string, value: any) {
    this.filters.push((item) => {
      // Special check for user_profiles and organizational filtering
      if (this.table === 'user_profiles' && column === 'id') {
        return item.id === value;
      }
      if (item[column] === undefined) {
        return true; // Bypass filter if the column is not present on the mock object
      }
      return item[column] === value;
    });
    return this;
  }

  neq(column: string, value: any) {
    this.filters.push((item) => item[column] !== value);
    return this;
  }

  is(column: string, value: any) {
    this.filters.push((item) => {
      if (item[column] === undefined) return true;
      return item[column] === value;
    });
    return this;
  }

  in(column: string, values: any[]) {
    this.filters.push((item) => values.includes(item[column]));
    return this;
  }

  ilike(column: string, pattern: string) {
    const term = pattern.replace(/^%|%$/g, '').toLowerCase();
    this.filters.push((item) => {
      if (item[column] === undefined) return false;
      return String(item[column]).toLowerCase().includes(term);
    });
    return this;
  }

  or(filterString: string) {
    const clauses = filterString.split(',').map((c) => c.trim());
    this.filters.push((item) =>
      clauses.some((clause) => {
        const ilikeMatch = clause.match(/^(\w+)\.ilike\.%(.+)%$/);
        if (ilikeMatch) {
          const col = ilikeMatch[1];
          const term = ilikeMatch[2].toLowerCase();
          if (item[col] === undefined) return false;
          return String(item[col]).toLowerCase().includes(term);
        }
        const eqMatch = clause.match(/^(\w+)\.eq\.(.+)$/);
        if (eqMatch) {
          return item[eqMatch[1]] === eqMatch[2];
        }
        return false;
      })
    );
    return this;
  }

  order(column: string, options?: any) { return this; }
  private limitCount: number | null = null;
  limit(num: number) {
    this.limitCount = num;
    return this;
  }

  single() { this.isSingle = true; return this; }
  maybeSingle() { this.isSingle = true; return this; }

  async then(resolve: (value: any) => void) {
    if (this.payload) {
      let result = this.payload;
      const generateId = () => `mock-${Math.random().toString(36).substr(2, 9)}`;
      if (Array.isArray(result)) {
        result = result.map(item => ({ id: generateId(), ...item }));
      } else {
        result = { id: generateId(), ...result };
      }
      if (this.isSingle && Array.isArray(result)) {
        result = result[0] || null;
      }
      return resolve({ data: result, error: null });
    }

    let data = getMockDataForTable(this.table);

    // Apply filters
    for (const filterFn of this.filters) {
      data = data.filter(filterFn);
    }

    if (this.limitCount != null) {
      data = data.slice(0, this.limitCount);
    }

    if (this.isSingle) {
      data = data[0] || null;
    }
    resolve({ data, error: null });
  }
}

export const mockSupabaseClient = {
  from(table: string) {
    return new MockSupabaseQueryBuilder(table);
  },
  // Minimal RPC shim for demo mode. Returns a synthetic id for the public
  // booking flow so the UI success path works without a live database.
  async rpc(fn: string, _args?: Record<string, unknown>) {
    if (fn === 'submit_public_appointment') {
      return { data: `mock-${Math.random().toString(36).slice(2, 11)}`, error: null };
    }
    return { data: null, error: null };
  },
  storage: {
    from(_bucket: string) {
      return {
        async upload() {
          return { data: { path: `mock/${Date.now()}` }, error: null };
        },
        async createSignedUrl() {
          return { data: { signedUrl: 'https://example.com/mock-signed-url' }, error: null };
        },
        async remove() {
          return { data: [], error: null };
        },
      };
    },
  },
  auth: {
    async getUser() {
      // Get active demo user from cookie isn't available directly in client.ts
      // fallback to returning the first demo user (Super Admin)
      const user = DEMO_USERS[0];
      return {
        data: {
          user: {
            id: user.id,
            email: user.email,
            user_metadata: {
              first_name: user.firstName,
              last_name: user.lastName,
              is_super_admin: user.isSuperAdmin,
            }
          }
        },
        error: null
      };
    },
    async signInWithPassword() {
      return { data: { user: {} }, error: null };
    },
    async signOut() {
      return { error: null };
    }
  }
};
