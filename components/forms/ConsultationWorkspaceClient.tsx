'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CompleteConsultationSchema, type CompleteConsultationInput, completeConsultationAction } from '@/lib/services/clinical-actions';
import { 
  Heart, 
  User, 
  Calendar, 
  Weight, 
  AlertTriangle,
  Stethoscope,
  ClipboardList,
  Plus,
  Trash2,
  Loader2,
  FileCheck2,
  History,
  CheckCircle
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  type: string;
  sellingPrice: number;
}

interface VisitHistory {
  id: string;
  checkedInAt: string;
  reason: string;
  clinicalNotes: { diagnosis: string; treatmentPlan: string | null } | null;
}

interface ConsultationWorkspaceClientProps {
  visitId: string;
  pet: {
    id: string;
    name: string;
    species: string;
    breed: string | null;
    gender: string;
    allergies: string | null;
    weightKg: number | null;
  };
  customer: {
    firstName: string;
    lastName: string;
    phone: string;
  };
  history: VisitHistory[];
  products: Product[];
  visitReason: string;
}

export default function ConsultationWorkspaceClient({
  visitId,
  pet,
  customer,
  history,
  products,
  visitReason,
}: ConsultationWorkspaceClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'consult' | 'history'>('consult');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CompleteConsultationInput>({
    resolver: zodResolver(CompleteConsultationSchema),
    defaultValues: {
      visitId,
      chiefComplaint: visitReason,
      history: '',
      examinationFindings: '',
      diagnosis: '',
      treatmentPlan: '',
      internalNotes: '',
      followUpRecommendation: '',
      prescriptionItems: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'prescriptionItems',
  });

  const prescriptionItemsWatch = watch('prescriptionItems');

  const handleSelectProduct = (index: number, productId: string) => {
    const selected = products.find((p) => p.id === productId);
    if (selected) {
      setValue(`prescriptionItems.${index}.medicineName`, selected.name, { shouldValidate: true });
      setValue(`prescriptionItems.${index}.productId`, selected.id, { shouldValidate: true });
    }
  };

  const onSubmit = async (data: CompleteConsultationInput) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await completeConsultationAction(data);
      if (res.success) {
        router.push('/dashboard/doctors');
        router.refresh();
      } else {
        setError(res.error || 'Failed to complete consultation');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid md:grid-cols-12 gap-8 items-start">
      
      {/* LEFT: MEDICAL BRIEF / TABS */}
      <div className="md:col-span-4 space-y-6">
        
        {/* PATIENT PROFILE BRIEF */}
        <div className="bg-white rounded-2xl border border-border/40 p-5 shadow-premium">
          <div className="flex items-center justify-between border-b border-border/35 pb-4 mb-4">
            <div>
              <span className="text-[9px] font-black text-primary-teal uppercase tracking-wider block">Patient Brief</span>
              <h3 className="text-base font-black text-primary-navy">{pet.name}</h3>
            </div>
            <span className="bg-primary-teal/5 text-primary-teal text-[10px] font-bold px-2 py-0.5 rounded-full capitalize">
              {pet.species}
            </span>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="flex items-center justify-between text-graphite/70">
              <span className="font-semibold text-primary-navy">Breed</span>
              <span>{pet.breed || 'Unknown'}</span>
            </div>
            <div className="flex items-center justify-between text-graphite/70">
              <span className="font-semibold text-primary-navy">Gender</span>
              <span>{pet.gender}</span>
            </div>
            {pet.weightKg && (
              <div className="flex items-center justify-between text-graphite/70">
                <span className="font-semibold text-primary-navy flex items-center gap-1">
                  <Weight className="w-3.5 h-3.5 text-primary-teal/70" />
                  Weight
                </span>
                <span>{pet.weightKg} kg</span>
              </div>
            )}
            <div className="flex items-center justify-between text-graphite/70">
              <span className="font-semibold text-primary-navy flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-primary-teal/70" />
                Owner
              </span>
              <span>{customer.firstName} {customer.lastName}</span>
            </div>
          </div>

          {pet.allergies && pet.allergies !== 'None' && (
            <div className="mt-4 p-3.5 bg-destructive/5 border border-destructive/20 text-destructive text-[11px] font-bold rounded-xl flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <span>ALLERGY WARNING:</span>
                <p className="mt-0.5 font-medium">{pet.allergies}</p>
              </div>
            </div>
          )}
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex bg-white p-1 rounded-xl border border-border/40 shadow-sm">
          <button
            onClick={() => setActiveTab('consult')}
            className={`w-1/2 py-2.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'consult' 
                ? 'bg-primary-teal text-white shadow-sm' 
                : 'text-graphite/60 hover:text-primary-navy'
            }`}
          >
            Clinical Workspace
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`w-1/2 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'history' 
                ? 'bg-primary-teal text-white shadow-sm' 
                : 'text-graphite/60 hover:text-primary-navy'
            }`}
          >
            <History className="w-4 h-4" />
            Medical History ({history.length})
          </button>
        </div>

        {/* TABS INNER: VISIT HISTORY */}
        {activeTab === 'history' && (
          <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
            {history.length > 0 ? (
              history.map((h) => (
                <div key={h.id} className="bg-white rounded-xl border border-border/40 p-4 shadow-sm space-y-2">
                  <div className="flex justify-between items-center border-b border-border/30 pb-2">
                    <span className="text-[10px] text-graphite/50 font-bold">
                      {new Date(h.checkedInAt).toLocaleDateString()}
                    </span>
                    <span className="bg-primary-teal/5 text-primary-teal text-[9px] font-bold px-1.5 py-0.5 rounded">
                      Consult Completed
                    </span>
                  </div>
                  <div className="text-xs space-y-1.5">
                    <p className="font-semibold text-primary-navy">
                      Reason: <span className="font-normal text-graphite/80">{h.reason}</span>
                    </p>
                    {h.clinicalNotes && (
                      <>
                        <p className="font-semibold text-primary-navy">
                          Diagnosis: <span className="text-primary-teal">{h.clinicalNotes.diagnosis}</span>
                        </p>
                        {h.clinicalNotes.treatmentPlan && (
                          <p className="font-semibold text-primary-navy">
                            Plan: <span className="font-normal text-graphite/70">{h.clinicalNotes.treatmentPlan}</span>
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white rounded-xl border border-border/40 p-8 text-center text-xs text-graphite/50 italic">
                No past consultations logged.
              </div>
            )}
          </div>
        )}

      </div>

      {/* RIGHT/CENTER: WORKSPACE FORM (Only shown when activeTab === 'consult') */}
      {activeTab === 'consult' && (
        <form onSubmit={handleSubmit(onSubmit)} className="md:col-span-8 space-y-6 pb-12">
          
          {error && (
            <div className="p-4 bg-destructive/5 border border-destructive/20 text-destructive text-xs rounded-xl">
              {error}
            </div>
          )}

          {/* CLINICAL NOTE EDITING BOARD */}
          <div className="bg-white rounded-2xl border border-border/40 p-6 shadow-premium space-y-5">
            <h3 className="text-sm font-bold text-primary-navy uppercase tracking-wider flex items-center gap-1.5 border-b border-border/30 pb-4">
              <Stethoscope className="w-4 h-4 text-primary-teal" />
              Clinical Consultation Notes
            </h3>

            <div>
              <label className="block text-[10px] font-semibold text-primary-navy/80 uppercase tracking-wider mb-1.5">
                Chief Complaint / Reason for Visit
              </label>
              <input
                type="text"
                {...register('chiefComplaint')}
                className="w-full px-3 py-2 bg-primary-ivory/20 border border-border focus:border-primary-teal focus:ring-1 focus:ring-primary-teal rounded-xl text-xs text-primary-navy outline-none"
              />
              {errors.chiefComplaint && (
                <span className="text-[10px] text-destructive mt-1 block">{errors.chiefComplaint.message}</span>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-primary-navy/80 uppercase tracking-wider mb-1.5">
                  Anamnesis / History
                </label>
                <textarea
                  {...register('history')}
                  placeholder="Record anamnesis details, signs onset, symptoms..."
                  rows={4}
                  className="w-full px-3 py-2 bg-primary-ivory/20 border border-border focus:border-primary-teal focus:ring-1 focus:ring-primary-teal rounded-xl text-xs text-primary-navy outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-primary-navy/80 uppercase tracking-wider mb-1.5">
                  Examination Findings
                </label>
                <textarea
                  {...register('examinationFindings')}
                  placeholder="Record clinical checks (temperature, cardiac, visual check)..."
                  rows={4}
                  className="w-full px-3 py-2 bg-primary-ivory/20 border border-border focus:border-primary-teal focus:ring-1 focus:ring-primary-teal rounded-xl text-xs text-primary-navy outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-primary-navy/80 uppercase tracking-wider mb-1.5">
                Diagnosis / Assessment
              </label>
              <input
                type="text"
                {...register('diagnosis')}
                placeholder="e.g. Feline Infectious Enteritis, Otitis Externa"
                className="w-full px-3 py-2 bg-primary-ivory/20 border border-border focus:border-primary-teal focus:ring-1 focus:ring-primary-teal rounded-xl text-xs text-primary-navy outline-none font-bold"
              />
              {errors.diagnosis && (
                <span className="text-[10px] text-destructive mt-1 block">{errors.diagnosis.message}</span>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-primary-navy/80 uppercase tracking-wider mb-1.5">
                Treatment Plan & Recommendations
              </label>
              <textarea
                {...register('treatmentPlan')}
                placeholder="Specify general directions, clinical advice, or home care details..."
                rows={3}
                className="w-full px-3 py-2 bg-primary-ivory/20 border border-border focus:border-primary-teal focus:ring-1 focus:ring-primary-teal rounded-xl text-xs text-primary-navy outline-none"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-primary-navy/80 uppercase tracking-wider mb-1.5">
                  Internal Notes (Doctor Only)
                </label>
                <input
                  type="text"
                  {...register('internalNotes')}
                  placeholder="Private findings not visible on client receipts"
                  className="w-full px-3 py-2 bg-primary-ivory/20 border border-border focus:border-primary-teal focus:ring-1 focus:ring-primary-teal rounded-xl text-xs text-primary-navy outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-primary-navy/80 uppercase tracking-wider mb-1.5">
                  Follow-up Recommendation
                </label>
                <input
                  type="text"
                  {...register('followUpRecommendation')}
                  placeholder="e.g. Return in 7 days for ear recheck"
                  className="w-full px-3 py-2 bg-primary-ivory/20 border border-border focus:border-primary-teal focus:ring-1 focus:ring-primary-teal rounded-xl text-xs text-primary-navy outline-none"
                />
              </div>
            </div>
          </div>

          {/* PRESCRIPTION BUILDER PANEL */}
          <div className="bg-white rounded-2xl border border-border/40 p-6 shadow-premium space-y-5">
            <div className="flex items-center justify-between border-b border-border/30 pb-4">
              <h3 className="text-sm font-bold text-primary-navy uppercase tracking-wider flex items-center gap-1.5">
                <FileCheck2 className="w-4 h-4 text-primary-teal" />
                Prescription Builder
              </h3>
              <button
                type="button"
                onClick={() => append({ medicineName: '', dosage: '', frequency: '', duration: '', instructions: '', quantityRequested: 1 })}
                className="inline-flex items-center gap-1 text-[10px] font-bold text-primary-teal border border-primary-teal/20 px-2.5 py-1.5 rounded-lg hover:bg-primary-teal/5 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Medicine
              </button>
            </div>

            {fields.length > 0 ? (
              <div className="space-y-4">
                {fields.map((field, idx) => (
                  <div 
                    key={field.id} 
                    className="p-4 bg-primary-ivory/20 border border-border/40 rounded-xl grid grid-cols-12 gap-3 items-end relative"
                  >
                    {/* Catalog linker selection */}
                    <div className="col-span-12 sm:col-span-4">
                      <label className="block text-[9px] font-bold text-graphite/40 uppercase mb-1">
                        Link Inventory Product
                      </label>
                      <select
                        onChange={(e) => handleSelectProduct(idx, e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-border rounded-lg text-[10px] font-bold text-primary-navy outline-none"
                      >
                        <option value="">-- Custom/Free-text --</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (${p.sellingPrice})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-12 sm:col-span-8 grid grid-cols-4 gap-2">
                      <div className="col-span-2">
                        <label className="block text-[9px] font-bold text-graphite/40 uppercase mb-1">
                          Medicine Name
                        </label>
                        <input
                          type="text"
                          {...register(`prescriptionItems.${idx}.medicineName`)}
                          placeholder="e.g. Amoxicillin"
                          className="w-full px-2.5 py-1.5 bg-white border border-border rounded-lg text-[10px] text-primary-navy outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-graphite/40 uppercase mb-1">
                          Dosage
                        </label>
                        <input
                          type="text"
                          {...register(`prescriptionItems.${idx}.dosage`)}
                          placeholder="e.g. 5ml"
                          className="w-full px-2.5 py-1.5 bg-white border border-border rounded-lg text-[10px] text-primary-navy outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-graphite/40 uppercase mb-1">
                          Qty
                        </label>
                        <input
                          type="number"
                          {...register(`prescriptionItems.${idx}.quantityRequested`, { valueAsNumber: true })}
                          className="w-full px-2.5 py-1.5 bg-white border border-border rounded-lg text-[10px] text-primary-navy outline-none font-bold"
                          min={1}
                          required
                        />
                      </div>
                    </div>

                    <div className="col-span-12 grid grid-cols-12 gap-2 mt-2 pt-2 border-t border-border/25">
                      <div className="col-span-5">
                        <label className="block text-[9px] font-bold text-graphite/40 uppercase mb-1">
                          Frequency
                        </label>
                        <input
                          type="text"
                          {...register(`prescriptionItems.${idx}.frequency`)}
                          placeholder="e.g. Twice daily"
                          className="w-full px-2 py-1 bg-white border border-border rounded-lg text-[10px] text-primary-navy outline-none"
                          required
                        />
                      </div>
                      <div className="col-span-4">
                        <label className="block text-[9px] font-bold text-graphite/40 uppercase mb-1">
                          Duration
                        </label>
                        <input
                          type="text"
                          {...register(`prescriptionItems.${idx}.duration`)}
                          placeholder="e.g. 7 days"
                          className="w-full px-2 py-1 bg-white border border-border rounded-lg text-[10px] text-primary-navy outline-none"
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[9px] font-bold text-graphite/40 uppercase mb-1">
                          Instructions
                        </label>
                        <input
                          type="text"
                          {...register(`prescriptionItems.${idx}.instructions`)}
                          placeholder="With food"
                          className="w-full px-2 py-1 bg-white border border-border rounded-lg text-[10px] text-primary-navy outline-none"
                        />
                      </div>
                      <div className="col-span-1 flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => remove(idx)}
                          className="text-destructive hover:bg-destructive/5 p-1 rounded transition-all mt-3"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-graphite/50 italic text-center py-4 bg-primary-ivory/10 rounded-xl border border-border/20">
                No items prescribed. Click "Add Medicine" to prescribe items.
              </p>
            )}
          </div>

          {/* ACTION SUBMIT BUTTON */}
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary-navy hover:bg-primary-teal text-white py-3 px-8 rounded-2xl font-bold text-sm shadow-premium flex items-center gap-2 transition-all disabled:opacity-75"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Finalizing consult...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Complete Consultation & Discharge
                </>
              )}
            </button>
          </div>

        </form>
      )}

    </div>
  );
}
