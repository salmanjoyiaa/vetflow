import { redirect } from 'next/navigation';
import { resolveServerAuthContext } from '@/lib/auth/context';
import { guardRoute } from '@/lib/auth/page-guards';
import { getActiveBranchId } from '@/lib/dashboard/resolve-active-branch';
import { createClient } from '@/lib/supabase/server';
import CustomerForm from '@/components/forms/CustomerForm';
import PageHeader from '@/components/ui/premium/PageHeader';
import Link from 'next/link';
import { Users, Phone, Mail, ChevronRight, Heart } from 'lucide-react';

export const metadata = {
  title: 'VetFlow Customer Directory',
  description: 'Manage clinic customers and review pet registries.',
};

export default async function CustomersPage() {
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

  // 2. Fetch customers within the active branch scope
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

  return (
    <div className="space-y-8">
      
      <PageHeader
        title="Customer directory"
        description="Review and create customer records for the active branch scope."
        icon={Users}
        actions={
          <CustomerForm branches={session.branches} activeBranchId={activeBranchId} />
        }
      />

      {/* CUSTOMER DIRECTORY LIST */}
      {customers && customers.length > 0 ? (
        <div className="glass-panel rounded-2xl border border-outline-variant/40 overflow-hidden shadow-premium">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container/40 border-b border-outline-variant/40 text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider">
                <th className="px-6 py-4">Customer Name</th>
                <th className="px-6 py-4">Pets Registered</th>
                <th className="px-6 py-4">Contact Info</th>
                <th className="px-6 py-4">Address</th>
                <th className="px-6 py-4 text-right">Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30 text-xs">
              {customers.map((cust) => (
                <tr key={cust.id} className="hover:bg-surface-container/10 transition-colors">
                  <td className="px-6 py-4 font-bold text-on-surface">
                    {cust.first_name} {cust.last_name}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 bg-primary/5 text-primary px-2 py-0.5 rounded-full text-[10px] font-bold">
                      <Heart className="w-3 h-3 text-primary" />
                      {cust.pets?.length || 0} {cust.pets?.length === 1 ? 'Pet' : 'Pets'}
                    </span>
                  </td>
                  <td className="px-6 py-4 space-y-1">
                    <div className="flex items-center gap-1.5 text-on-surface-variant/70">
                      <Phone className="w-3.5 h-3.5 text-primary/60" />
                      <span>{cust.phone}</span>
                    </div>
                    {cust.email && (
                      <div className="flex items-center gap-1.5 text-on-surface-variant/70">
                        <Mail className="w-3.5 h-3.5 text-primary/60" />
                        <span>{cust.email}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant/80">
                    {cust.address || '—'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/dashboard/customers/${cust.id}`}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:underline"
                    >
                      View Profile
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl border border-outline-variant/40 p-12 text-center">
          <Users className="w-12 h-12 text-on-surface-variant/30 mx-auto mb-4" />
          <h4 className="text-sm font-bold text-on-surface mb-1">No Customers Found</h4>
          <p className="text-xs text-on-surface-variant/60">Register your first clinic customer using the button above.</p>
        </div>
      )}

    </div>
  );
}

