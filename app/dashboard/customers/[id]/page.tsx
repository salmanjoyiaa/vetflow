import { redirect } from 'next/navigation';
import { resolveServerAuthContext } from '@/lib/auth/context';
import { guardRoute } from '@/lib/auth/page-guards';
import { createClient } from '@/lib/supabase/server';
import PetForm from '@/components/forms/PetForm';
import CustomerDetailAdminBar, { PetRowAdminActions } from '@/components/dashboard/CustomerDetailAdminBar';
import PageHeader from '@/components/ui/premium/PageHeader';
import Link from 'next/link';
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Heart, 
  ChevronRight, 
  ArrowLeft,
  Calendar,
  Weight,
  AlertTriangle
} from 'lucide-react';

export const metadata = {
  title: 'Customer Profile',
  description: 'View customer details and registered pets.',
};

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: customerId } = await params;
  const ctx = await resolveServerAuthContext();
  if (!ctx) redirect('/login');

  const denied = guardRoute(ctx, '/dashboard/customers');
  if (denied) return denied;

  const session = ctx;

  // 1. Fetch customer details with strict tenant boundaries
  const supabase = await createClient();
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .eq('organization_id', session.organizationId)
    .is('deleted_at', null)
    .single();

  if (customerError || !customer) {
    return (
      <div className="bg-destructive/5 border border-destructive/20 text-destructive text-sm p-6 rounded-2xl">
        Customer profile not found or access denied.
      </div>
    );
  }

  // 2. Fetch pets registered for this customer
  const { data: pets, error: petsError } = await supabase
    .from('patients')
    .select('*')
    .eq('customer_id', customerId)
    .eq('organization_id', session.organizationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  const isAdmin = session.role === 'clinic_admin';

  return (
    <div className="space-y-8">
      
      <Link
        href="/dashboard/customers"
        className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant/60 hover:text-primary font-semibold transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Directory
      </Link>

      <PageHeader
        title="Customer Profile"
        icon={User}
        actions={
          <div className="flex items-center gap-2">
            {isAdmin && (
              <CustomerDetailAdminBar
                isAdmin={isAdmin}
                branches={session.branches}
                customer={customer}
              />
            )}
            <PetForm customerId={customer.id} />
          </div>
        }
      />

      {/* CORE DETAILS MATRIX */}
      <div className="grid md:grid-cols-3 gap-8">
        
        {/* CUSTOMER CARD */}
        <div className="md:col-span-1 glass-panel p-6 space-y-6">
          <div>
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider block mb-1">
              Pet Owner
            </span>
            <h3 className="text-lg font-bold text-on-surface">
              {customer.first_name} {customer.last_name}
            </h3>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-center gap-2.5 text-on-surface-variant/70">
              <Phone className="w-4 h-4 text-primary/70" />
              <span>{customer.phone}</span>
            </div>
            
            {customer.email && (
              <div className="flex items-center gap-2.5 text-on-surface-variant/70">
                <Mail className="w-4 h-4 text-primary/70" />
                <span className="truncate">{customer.email}</span>
              </div>
            )}

            {customer.address && (
              <div className="flex items-start gap-2.5 text-on-surface-variant/70">
                <MapPin className="w-4 h-4 text-primary/70 mt-0.5" />
                <span>{customer.address}</span>
              </div>
            )}
          </div>
        </div>

        {/* PET LIST CARD */}
        <div className="md:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">
            Registered Patients ({pets?.length || 0})
          </h3>

          {pets && pets.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {pets.map((pet) => (
                <div 
                  key={pet.id} 
                  className="glass-panel p-5 hover:shadow-premium-hover transition-all duration-200 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-on-surface">{pet.name}</h4>
                      <span className="bg-primary/10 text-primary text-[9px] font-bold px-2 py-0.5 rounded-full capitalize">
                        {pet.species}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-on-surface-variant/70">
                      {pet.breed && (
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-on-surface">Breed:</span>
                          <span>{pet.breed}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-on-surface">Gender:</span>
                        <span>{pet.gender}</span>
                      </div>
                      {pet.date_of_birth && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-primary/60" />
                          <span>{pet.date_of_birth}</span>
                        </div>
                      )}
                      {pet.weight_kg && (
                        <div className="flex items-center gap-1.5">
                          <Weight className="w-3.5 h-3.5 text-primary/60" />
                          <span>{pet.weight_kg} kg</span>
                        </div>
                      )}
                    </div>

                    {pet.allergies && pet.allergies !== 'None' && (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 p-2 rounded-lg">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Allergies: {pet.allergies}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-outline-variant/40 mt-4 flex flex-wrap justify-end gap-2">
                    <Link
                      href={`/dashboard/appointments?new=1&customerId=${customer.id}&petId=${pet.id}`}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-primary border border-primary/20 px-2 py-1 rounded-lg hover:bg-primary/5"
                    >
                      <Calendar className="w-3 h-3" />
                      Book appointment
                    </Link>
                    <Link
                      href={`/dashboard/walk-ins?petId=${pet.id}`}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 border border-emerald-500/30 px-2 py-1 rounded-lg hover:bg-emerald-500/5"
                    >
                      Check in walk-in
                    </Link>
                    <Link
                      href={`/dashboard/pets/${pet.id}`}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:underline"
                    >
                      Medical file
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                    <PetRowAdminActions isAdmin={isAdmin} pet={pet} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-panel p-12 text-center">
              <Heart className="w-12 h-12 text-on-surface-variant/30 mx-auto mb-4" />
              <h4 className="text-xs font-bold text-on-surface mb-1">No Registered Pets</h4>
              <p className="text-[10px] text-on-surface-variant/60">This customer has no pet profiles registered.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
