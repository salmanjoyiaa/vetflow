import { redirect } from 'next/navigation';
import { resolveServerSession } from '@/lib/services/auth';
import { createClient } from '@/lib/supabase/server';
import PetForm from '@/components/forms/PetForm';
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
  title: 'VetFlow Customer Profile',
  description: 'View customer details and registered pets.',
};

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: customerId } = await params;
  const session = await resolveServerSession();
  if (!session) {
    redirect('/login');
  }

  // 1. Fetch customer details with strict tenant boundaries
  const supabase = await createClient();
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .eq('organization_id', session.organizationId)
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
    .from('pets')
    .select('*')
    .eq('customer_id', customerId)
    .eq('organization_id', session.organizationId)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-8">
      
      {/* BACK BUTTON AND TITLE */}
      <div className="space-y-2">
        <Link 
          href="/dashboard/customers" 
          className="inline-flex items-center gap-1.5 text-xs text-graphite/60 hover:text-primary-teal font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Directory
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-xl font-black text-primary-navy tracking-tight flex items-center gap-2">
            <User className="w-5 h-5 text-primary-teal" />
            Customer Profile
          </h2>
          <PetForm customerId={customer.id} />
        </div>
      </div>

      {/* CORE DETAILS MATRIX */}
      <div className="grid md:grid-cols-3 gap-8">
        
        {/* CUSTOMER CARD */}
        <div className="md:col-span-1 bg-white rounded-2xl border border-border/40 p-6 shadow-premium space-y-6">
          <div>
            <span className="text-[10px] font-bold text-primary-teal uppercase tracking-wider block mb-1">
              Pet Owner
            </span>
            <h3 className="text-lg font-bold text-primary-navy">
              {customer.first_name} {customer.last_name}
            </h3>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-center gap-2.5 text-graphite/70">
              <Phone className="w-4 h-4 text-primary-teal/70" />
              <span>{customer.phone}</span>
            </div>
            
            {customer.email && (
              <div className="flex items-center gap-2.5 text-graphite/70">
                <Mail className="w-4 h-4 text-primary-teal/70" />
                <span className="truncate">{customer.email}</span>
              </div>
            )}

            {customer.address && (
              <div className="flex items-start gap-2.5 text-graphite/70">
                <MapPin className="w-4 h-4 text-primary-teal/70 mt-0.5" />
                <span>{customer.address}</span>
              </div>
            )}
          </div>
        </div>

        {/* PET LIST CARD */}
        <div className="md:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-primary-navy uppercase tracking-wider">
            Registered Patients ({pets?.length || 0})
          </h3>

          {pets && pets.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {pets.map((pet) => (
                <div 
                  key={pet.id} 
                  className="bg-white rounded-2xl border border-border/40 p-5 shadow-premium hover:shadow-premium-hover transition-all duration-200 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-primary-navy">{pet.name}</h4>
                      <span className="bg-primary-teal/5 text-primary-teal text-[9px] font-bold px-2 py-0.5 rounded-full capitalize">
                        {pet.species}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-graphite/70">
                      {pet.breed && (
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-primary-navy">Breed:</span>
                          <span>{pet.breed}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-primary-navy">Gender:</span>
                        <span>{pet.gender}</span>
                      </div>
                      {pet.date_of_birth && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-primary-teal/60" />
                          <span>{pet.date_of_birth}</span>
                        </div>
                      )}
                      {pet.weight_kg && (
                        <div className="flex items-center gap-1.5">
                          <Weight className="w-3.5 h-3.5 text-primary-teal/60" />
                          <span>{pet.weight_kg} kg</span>
                        </div>
                      )}
                    </div>

                    {pet.allergies && pet.allergies !== 'None' && (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200/50 p-2 rounded-lg">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Allergies: {pet.allergies}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-border/40 mt-4 flex justify-end">
                    <Link
                      href={`/dashboard/pets/${pet.id}`}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-primary-teal hover:underline"
                    >
                      View Medical File
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-border/40 p-12 text-center">
              <Heart className="w-12 h-12 text-graphite/30 mx-auto mb-4" />
              <h4 className="text-xs font-bold text-primary-navy mb-1">No Registered Pets</h4>
              <p className="text-[10px] text-graphite/60">This customer has no pet profiles registered.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
