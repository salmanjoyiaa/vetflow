import { redirect } from 'next/navigation';
import { resolveServerAuthContext } from '@/lib/auth/context';
import { guardRoute } from '@/lib/auth/page-guards';
import { getActiveBranchId } from '@/lib/dashboard/resolve-active-branch';
import { createClient } from '@/lib/supabase/server';
import CustomerForm from '@/components/forms/CustomerForm';
import CustomersListClient from '@/components/dashboard/CustomersListClient';
import PageHeader from '@/components/ui/premium/PageHeader';
import { Users } from 'lucide-react';

export const metadata = {
  title: 'Customer Directory',
  description: 'Manage clinic customers and review pet registries.',
};

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string; focus?: string }>;
}) {
  const { phone, focus } = await searchParams;
  const ctx = await resolveServerAuthContext();
  if (!ctx) redirect('/login');

  const denied = guardRoute(ctx, '/dashboard/customers');
  if (denied) return denied;

  const session = ctx;
  const activeBranchId = getActiveBranchId(ctx);

  if (!activeBranchId) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs p-6 rounded-2xl">
        You must be assigned to a clinic branch to view the customer directory.
      </div>
    );
  }

  const supabase = await createClient();
  const { data: customers, error } = await supabase
    .from('customers')
    .select(`
      id,
      first_name,
      last_name,
      email,
      phone,
      address,
      pets ( id )
    `)
    .eq('branch_id', activeBranchId)
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="bg-destructive/5 border border-destructive/20 text-destructive text-sm p-6 rounded-2xl">
        Failed to load customer profiles: {error.message}
      </div>
    );
  }

  const rows = (customers || []).map((cust) => ({
    id: cust.id,
    first_name: cust.first_name,
    last_name: cust.last_name,
    email: cust.email,
    phone: cust.phone,
    address: cust.address,
    petCount: cust.pets?.length || 0,
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Customer directory"
        description="Search by phone to find owners and their pets. Register new clients from the intake flows."
        icon={Users}
        actions={
          <CustomerForm
            branches={session.branches}
            activeBranchId={activeBranchId}
            defaultPhone={phone}
          />
        }
      />

      <CustomersListClient
        customers={rows}
        initialPhone={phone || ''}
        focusPhone={focus === 'phone'}
      />
    </div>
  );
}
