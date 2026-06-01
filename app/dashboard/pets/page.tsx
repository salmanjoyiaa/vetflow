import { redirect } from 'next/navigation';
import { resolveServerSession } from '@/lib/services/auth';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Heart, ChevronRight, User, Calendar, Weight } from 'lucide-react';

export const metadata = {
  title: 'VetFlow Pet Registry',
  description: 'Manage registered pets and review active patient cases.',
};

export default async function PetsPage() {
  const session = await resolveServerSession();
  if (!session) {
    redirect('/login');
  }

  // Fetch all pets registered in the organization
  const supabase = await createClient();
  const { data: pets, error } = await supabase
    .from('pets')
    .select(`
      id,
      name,
      species,
      breed,
      gender,
      date_of_birth,
      weight_kg,
      customer_id,
      customers (
        first_name,
        last_name
      )
    `)
    .eq('organization_id', session.organizationId)
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="bg-destructive/5 border border-destructive/20 text-destructive text-sm p-6 rounded-2xl">
        Failed to load pet profiles: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      
      {/* HEADER */}
      <div>
        <h2 className="text-xl font-black text-primary-navy tracking-tight flex items-center gap-2">
          <Heart className="w-5 h-5 text-primary-teal" />
          Patient Registry
        </h2>
        <p className="text-xs text-graphite/70 mt-1">
          Review and inspect registered animals across the organization.
        </p>
      </div>

      {/* PET TABLE */}
      {pets && pets.length > 0 ? (
        <div className="bg-white rounded-2xl border border-border/40 overflow-hidden shadow-premium">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-primary-ivory/40 border-b border-border/40 text-[10px] font-semibold text-primary-navy/80 uppercase tracking-wider">
                <th className="px-6 py-4">Pet Name</th>
                <th className="px-6 py-4">Owner Name</th>
                <th className="px-6 py-4">Species & Breed</th>
                <th className="px-6 py-4">Gender</th>
                <th className="px-6 py-4">Metrics</th>
                <th className="px-6 py-4 text-right">Medical History</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30 text-xs">
              {pets.map((pet) => (
                <tr key={pet.id} className="hover:bg-primary-ivory/10 transition-colors">
                  <td className="px-6 py-4 font-bold text-primary-navy">
                    {pet.name}
                  </td>
                  <td className="px-6 py-4 text-graphite/80">
                    {pet.customers ? (
                      <Link 
                        href={`/dashboard/customers/${pet.customer_id}`}
                        className="flex items-center gap-1 hover:text-primary-teal hover:underline"
                      >
                        <User className="w-3.5 h-3.5 text-primary-teal/65" />
                        <span>{(pet.customers as any).first_name} {(pet.customers as any).last_name}</span>
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-6 py-4 text-graphite/80 capitalize">
                    <span className="font-bold text-primary-navy">{pet.species}</span>
                    {pet.breed && <span className="text-graphite/60"> • {pet.breed}</span>}
                  </td>
                  <td className="px-6 py-4 text-graphite/70">
                    {pet.gender}
                  </td>
                  <td className="px-6 py-4 space-y-1 text-[11px] text-graphite/65">
                    {pet.date_of_birth && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>DOB: {pet.date_of_birth}</span>
                      </div>
                    )}
                    {pet.weight_kg && (
                      <div className="flex items-center gap-1">
                        <Weight className="w-3 h-3" />
                        <span>Weight: {pet.weight_kg} kg</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/dashboard/pets/${pet.id}`}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-primary-teal hover:underline"
                    >
                      Medical File
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
          <Heart className="w-12 h-12 text-graphite/30 mx-auto mb-4" />
          <h4 className="text-sm font-bold text-primary-navy mb-1">No Registered Patients</h4>
          <p className="text-xs text-graphite/60">
            To register a pet, open a customer profile and click the "Register Pet" button.
          </p>
        </div>
      )}

    </div>
  );
}
