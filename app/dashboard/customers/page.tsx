import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { resolveServerSession } from '@/lib/services/auth';
import { createClient } from '@/lib/supabase/server';
import CustomerForm from '@/components/forms/CustomerForm';
import Link from 'next/link';
import { Users, Phone, Mail, ChevronRight, Heart } from 'lucide-react';

export const metadata = {
  title: 'VetFlow Customer Directory',
  description: 'Manage clinic customers and review pet registries.',
};

export default async function CustomersPage() {
  const session = await resolveServerSession();
  if (!session) {
    redirect('/login');
  }

  // 1. Resolve branch context
  const cookieStore = await cookies();
  const activeBranchCookie = cookieStore.get('vetflow_branch_id')?.value;
  let activeBranchId = activeBranchCookie;

  if (!activeBranchId && session.branches.length > 0) {
    activeBranchId = session.branches[0].id;
  } else if (activeBranchId && !session.branches.some((b) => b.id === activeBranchId)) {
    activeBranchId = session.branches[0]?.id;
  }

  if (!activeBranchId) {
    return (
      <div className="bg-amber-500/5 border border-amber-500/20 text-amber-700 text-xs p-6 rounded-2xl">
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
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-primary-navy tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-teal" />
            Customer Directory
          </h2>
          <p className="text-xs text-graphite/70 mt-1">
            Review and create customer records for the active branch scope.
          </p>
        </div>

        <CustomerForm branches={session.branches} activeBranchId={activeBranchId} />
      </div>

      {/* CUSTOMER DIRECTORY LIST */}
      {customers && customers.length > 0 ? (
        <div className="bg-white rounded-2xl border border-border/40 overflow-hidden shadow-premium">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-primary-ivory/40 border-b border-border/40 text-[10px] font-semibold text-primary-navy/80 uppercase tracking-wider">
                <th className="px-6 py-4">Customer Name</th>
                <th className="px-6 py-4">Pets Registered</th>
                <th className="px-6 py-4">Contact Info</th>
                <th className="px-6 py-4">Address</th>
                <th className="px-6 py-4 text-right">Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30 text-xs">
              {customers.map((cust) => (
                <tr key={cust.id} className="hover:bg-primary-ivory/10 transition-colors">
                  <td className="px-6 py-4 font-bold text-primary-navy">
                    {cust.first_name} {cust.last_name}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 bg-primary-teal/5 text-primary-teal px-2 py-0.5 rounded-full text-[10px] font-bold">
                      <Heart className="w-3 h-3 text-primary-teal" />
                      {cust.pets?.length || 0} {cust.pets?.length === 1 ? 'Pet' : 'Pets'}
                    </span>
                  </td>
                  <td className="px-6 py-4 space-y-1">
                    <div className="flex items-center gap-1.5 text-graphite/70">
                      <Phone className="w-3.5 h-3.5 text-primary-teal/60" />
                      <span>{cust.phone}</span>
                    </div>
                    {cust.email && (
                      <div className="flex items-center gap-1.5 text-graphite/70">
                        <Mail className="w-3.5 h-3.5 text-primary-teal/60" />
                        <span>{cust.email}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-graphite/80">
                    {cust.address || '—'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/dashboard/customers/${cust.id}`}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-primary-teal hover:underline"
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
        <div className="bg-white rounded-2xl border border-border/40 p-12 text-center">
          <Users className="w-12 h-12 text-graphite/30 mx-auto mb-4" />
          <h4 className="text-sm font-bold text-primary-navy mb-1">No Customers Found</h4>
          <p className="text-xs text-graphite/60">Register your first clinic customer using the button above.</p>
        </div>
      )}

    </div>
  );
}
