'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { searchCustomersAction } from '@/lib/services/customer-actions';
import { createWalkInVisitAction } from '@/lib/services/visit-actions';
import { 
  Search, 
  User, 
  Heart, 
  Loader2, 
  MapPin, 
  Clock, 
  UserCheck, 
  BriefcaseMedical, 
  Play,
  ArrowRight,
  ClipboardList
} from 'lucide-react';

interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
}

interface Visit {
  id: string;
  reason: string;
  status: string;
  checkedInAt: string;
  pet: { id: string; name: string; species: string; breed: string | null };
  customer: { first_name: string; last_name: string; phone: string };
  doctor: { first_name: string; last_name: string } | null;
}

interface WalkInDashboardClientProps {
  doctors: Doctor[];
  activeBranchId: string;
  initialVisits: Visit[];
}

export default function WalkInDashboardClient({
  doctors,
  activeBranchId,
  initialVisits,
}: WalkInDashboardClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPet, setSelectedPet] = useState<any | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);

  // Form states
  const [reason, setReason] = useState('');
  const [doctorId, setDoctorId] = useState(doctors.length > 0 ? doctors[0].id : '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (val: string) => {
    setSearchQuery(val);
    if (val.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await searchCustomersAction(val);
      if (res.success && res.customers) {
        setSearchResults(res.customers);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectPet = (customer: any, pet: any) => {
    setSelectedCustomer(customer);
    setSelectedPet(pet);
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPet || !doctorId || !reason) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await createWalkInVisitAction({
        petId: selectedPet.id,
        customerId: selectedCustomer.id,
        doctorId,
        reason,
        branchId: activeBranchId,
      });

      if (res.success) {
        setSelectedPet(null);
        setSelectedCustomer(null);
        setReason('');
        router.refresh();
      } else {
        setError(res.error || 'Failed to check-in patient');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group visits
  const waitingVisits = initialVisits.filter((v) => v.status === 'waiting');
  const consultingVisits = initialVisits.filter((v) => v.status === 'consulting');

  return (
    <div className="grid md:grid-cols-12 gap-8 items-start">
      
      {/* LEFT: INTAKE & PATIENT SELECTOR */}
      <div className="md:col-span-4 space-y-6">
        
        {/* PATIENT INTAKE CARD */}
        <div className="bg-white rounded-2xl border border-border/40 p-6 shadow-premium">
          <span className="text-[10px] font-black text-primary-teal uppercase tracking-wider block mb-1">
            Intake Console
          </span>
          <h3 className="text-base font-bold text-primary-navy mb-4">Patient Check-In</h3>

          {!selectedPet ? (
            <div className="space-y-4">
              <label className="block text-xs font-semibold text-graphite/70">
                Search Customer (Name or Phone)
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-graphite/40" />
                <input
                  type="text"
                  placeholder="e.g. John Doe or 555-9090"
                  className="w-full pl-9 pr-4 py-2 bg-primary-ivory/40 border border-border/70 rounded-xl text-xs text-primary-navy outline-none focus:border-primary-teal focus:ring-1 focus:ring-primary-teal"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>

              {/* SEARCH RESULTS DROPDOWN */}
              {isSearching && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 text-primary-teal animate-spin" />
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="border border-border/50 rounded-xl divide-y divide-border/30 max-h-56 overflow-y-auto bg-primary-ivory/10">
                  {searchResults.map((cust) => (
                    <div key={cust.id} className="p-3">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-primary-navy">
                        <User className="w-3.5 h-3.5 text-primary-teal/70" />
                        <span>{cust.firstName} {cust.lastName}</span>
                        <span className="text-graphite/40 font-normal">({cust.phone})</span>
                      </div>
                      
                      {/* Pets list */}
                      <div className="mt-2 pl-4 space-y-1">
                        {cust.pets.map((pet: any) => (
                          <button
                            key={pet.id}
                            onClick={() => handleSelectPet(cust, pet)}
                            className="w-full text-left flex items-center justify-between text-[10px] font-semibold text-primary-teal hover:underline py-1"
                          >
                            <span>{pet.name} ({pet.species} • {pet.breed || 'Unknown breed'})</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        ))}
                        {cust.pets.length === 0 && (
                          <span className="text-[9px] text-graphite/40 italic block">No pets registered</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* INTAKE FORM (When pet is selected) */
            <form onSubmit={handleCheckIn} className="space-y-4">
              
              {/* Patient brief info card */}
              <div className="bg-primary-ivory/30 p-3 rounded-xl border border-border/35 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-bold text-graphite/40 uppercase block">Selected Patient</span>
                  <span className="text-xs font-bold text-primary-navy">{selectedPet.name}</span>
                  <span className="text-[10px] text-graphite/60 block">Owner: {selectedCustomer.firstName} {selectedCustomer.lastName}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPet(null)}
                  className="text-[10px] text-destructive font-bold hover:underline"
                >
                  Cancel
                </button>
              </div>

              {error && (
                <div className="p-2.5 bg-destructive/5 border border-destructive/20 text-destructive text-[11px] rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-semibold text-primary-navy/80 uppercase tracking-wider mb-1.5">
                  Reason for Visit
                </label>
                <input
                  type="text"
                  placeholder="e.g. Vaccination, skin rash, ear infection"
                  className="w-full px-3 py-2 bg-primary-ivory/20 border border-border focus:border-primary-teal focus:ring-1 focus:ring-primary-teal rounded-xl text-xs text-primary-navy outline-none"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-primary-navy/80 uppercase tracking-wider mb-1.5">
                  Assign Attending Vet
                </label>
                <select
                  className="w-full px-3 py-2 bg-primary-ivory/20 border border-border focus:border-primary-teal focus:ring-1 focus:ring-primary-teal rounded-xl text-xs text-primary-navy font-semibold outline-none"
                  value={doctorId}
                  onChange={(e) => setDoctorId(e.target.value)}
                  required
                >
                  {doctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      Dr. {doc.firstName} {doc.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary-teal hover:bg-primary-teal/95 text-white py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-75"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Checking in...
                  </>
                ) : (
                  'Check-In Patient'
                )}
              </button>

            </form>
          )}

        </div>

      </div>

      {/* RIGHT: QUEUE MONITOR (WAITING / CONSULTING) */}
      <div className="md:col-span-8 space-y-6">
        
        {/* WAITING QUEUE */}
        <div className="bg-white rounded-2xl border border-border/40 overflow-hidden shadow-premium">
          <div className="p-5 border-b border-border/30 bg-primary-ivory/20 flex items-center justify-between">
            <h3 className="text-sm font-bold text-primary-navy uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              Waiting Queue ({waitingVisits.length})
            </h3>
            <span className="text-[10px] text-graphite/50 font-semibold">Sorted by arrival time</span>
          </div>

          {waitingVisits.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-primary-ivory/10 border-b border-border/40 text-[9px] font-bold text-primary-navy/80 uppercase tracking-wider">
                  <th className="px-6 py-3">Patient / Owner</th>
                  <th className="px-6 py-3">Reason</th>
                  <th className="px-6 py-3">Assigned Vet</th>
                  <th className="px-6 py-3">Check-In Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20 text-xs">
                {waitingVisits.map((v) => (
                  <tr key={v.id} className="hover:bg-primary-ivory/10">
                    <td className="px-6 py-4">
                      <span className="font-bold text-primary-navy block">{v.pet.name}</span>
                      <span className="text-[10px] text-graphite/60">{(v.pet.species)} • Owner: {v.customer.first_name} {v.customer.last_name}</span>
                    </td>
                    <td className="px-6 py-4 text-graphite/80 font-medium">
                      {v.reason}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-primary-navy">
                        {v.doctor ? `Dr. ${v.doctor.first_name} ${v.doctor.last_name}` : 'Unassigned'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-graphite/50 font-semibold">
                      {new Date(v.checkedInAt).toLocaleTimeString(undefined, {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-xs text-graphite/50 italic">
              No patients currently waiting.
            </div>
          )}
        </div>

        {/* CONSULTING BOARD */}
        <div className="bg-white rounded-2xl border border-border/40 overflow-hidden shadow-premium">
          <div className="p-5 border-b border-border/30 bg-primary-ivory/20">
            <h3 className="text-sm font-bold text-primary-navy uppercase tracking-wider flex items-center gap-2">
              <BriefcaseMedical className="w-4 h-4 text-primary-teal" />
              Attending consultations ({consultingVisits.length})
            </h3>
          </div>

          {consultingVisits.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-primary-ivory/10 border-b border-border/40 text-[9px] font-bold text-primary-navy/80 uppercase tracking-wider">
                  <th className="px-6 py-3">Patient / Owner</th>
                  <th className="px-6 py-3">attending Vet</th>
                  <th className="px-6 py-3">reason</th>
                  <th className="px-6 py-3">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20 text-xs">
                {consultingVisits.map((v) => (
                  <tr key={v.id} className="hover:bg-primary-ivory/10">
                    <td className="px-6 py-4">
                      <span className="font-bold text-primary-navy block">{v.pet.name}</span>
                      <span className="text-[10px] text-graphite/60">Owner: {v.customer.first_name} {v.customer.last_name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-primary-teal">
                        Dr. {v.doctor?.first_name} {v.doctor?.last_name}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-graphite/80">
                      {v.reason}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 bg-primary-teal/10 text-primary-teal px-2 py-0.5 rounded-full text-[10px] font-bold">
                        <Play className="w-2.5 h-2.5 fill-current" />
                        In Consult
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-xs text-graphite/50 italic">
              No consultations currently active in rooms.
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
