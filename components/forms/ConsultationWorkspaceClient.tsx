'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CompleteConsultationSchema, type CompleteConsultationInput } from '@/lib/validations/schemas';
import { completeConsultationAction } from '@/lib/services/clinical-actions';
import ConsultationLabsDocsPanel from '@/components/forms/ConsultationLabsDocsPanel';
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
  CheckCircle,
  FlaskConical
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  type: string;
  sellingPrice: number;
}

interface CatalogService {
  id: string;
  name: string;
  description: string | null;
  price: number;
}

const FOLLOW_UP_PRESETS = [3, 5, 7, 14] as const;

interface LabCatalogItem {
  id: string;
  name: string;
}
interface LabOrder {
  id: string;
  testName: string;
  status: string;
  resultText: string | null;
  resultDocumentId: string | null;
  createdAt: string;
}
interface DocumentItem {
  id: string;
  fileName: string;
  category: string;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string;
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
  catalogServices?: CatalogService[];
  visitReason: string;
  isEmergency?: boolean;
  triageNotes?: string | null;
  patientId: string;
  labCatalog: LabCatalogItem[];
  labOrders: LabOrder[];
  documents: DocumentItem[];
}

export default function ConsultationWorkspaceClient({
  visitId,
  pet,
  customer,
  history,
  products,
  catalogServices = [],
  visitReason,
  isEmergency = false,
  triageNotes,
  patientId,
  labCatalog,
  labOrders,
  documents,
}: ConsultationWorkspaceClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'consult' | 'history' | 'labs'>('consult');
  const [visitType, setVisitType] = useState<'standard' | 'lab' | 'surgery'>('standard');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [followUpDays, setFollowUpDays] = useState<number[]>([]);
  const [customFollowUpDay, setCustomFollowUpDay] = useState('');

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
      visitType: 'standard',
      chiefComplaint: visitReason,
      history: '',
      examinationFindings: '',
      diagnosis: '',
      treatmentPlan: '',
      internalNotes: '',
      followUpRecommendation: '',
      followUpDays: [],
      temperatureC: undefined,
      heartRateBpm: undefined,
      respiratoryRate: undefined,
      weightKg: pet.weightKg ?? undefined,
      prescriptionItems: [],
      serviceItems: catalogServices.length > 0
        ? [{
            serviceId: catalogServices.find((s) => s.name.toLowerCase().includes('consult'))?.id || catalogServices[0].id,
            name: catalogServices.find((s) => s.name.toLowerCase().includes('consult'))?.name || catalogServices[0].name,
            unitPrice: catalogServices.find((s) => s.name.toLowerCase().includes('consult'))?.price || catalogServices[0].price,
            quantity: 1,
          }]
        : [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'prescriptionItems',
  });

  const {
    fields: serviceFields,
    append: appendService,
    remove: removeService,
  } = useFieldArray({
    control,
    name: 'serviceItems',
  });

  const prescriptionItemsWatch = watch('prescriptionItems');

  const toggleFollowUpDay = (day: number) => {
    setFollowUpDays((prev) => {
      const next = prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b);
      setValue('followUpDays', next);
      return next;
    });
  };

  const addCustomFollowUpDay = () => {
    const day = parseInt(customFollowUpDay, 10);
    if (!day || day < 1) return;
    if (!followUpDays.includes(day)) {
      const next = [...followUpDays, day].sort((a, b) => a - b);
      setFollowUpDays(next);
      setValue('followUpDays', next);
    }
    setCustomFollowUpDay('');
  };

  const handleSelectService = (index: number, serviceId: string) => {
    const selected = catalogServices.find((s) => s.id === serviceId);
    if (selected) {
      setValue(`serviceItems.${index}.serviceId`, selected.id, { shouldValidate: true });
      setValue(`serviceItems.${index}.name`, selected.name, { shouldValidate: true });
      setValue(`serviceItems.${index}.unitPrice`, selected.price, { shouldValidate: true });
    }
  };

  const handleSelectProduct = (index: number, productId: string) => {
    const selected = products.find((p) => p.id === productId);
    if (selected) {
      setValue(`prescriptionItems.${index}.medicineName`, selected.name, { shouldValidate: true });
      setValue(`prescriptionItems.${index}.productId`, selected.id, { shouldValidate: true });
    }
  };

  const handleVisitTypeChange = (type: 'standard' | 'lab' | 'surgery') => {
    setVisitType(type);
    setValue('visitType', type);
    if (type === 'lab') {
      setActiveTab('labs');
    }
    if (type === 'surgery') {
      const surgerySvc = catalogServices.find((s) => s.name.toLowerCase().includes('surgery'));
      if (surgerySvc && serviceFields.length > 0) {
        setValue('serviceItems.0.serviceId', surgerySvc.id);
        setValue('serviceItems.0.name', surgerySvc.name);
        setValue('serviceItems.0.unitPrice', surgerySvc.price);
      }
    }
  };

  const onSubmit = async (data: CompleteConsultationInput) => {
    if (visitType === 'lab' && labOrders.length === 0) {
      setError('Lab-focused visit: order at least one lab test before completing.');
      setActiveTab('labs');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await completeConsultationAction(data);
      if (res.success) {
        router.push('/dashboard/doctors');
        // Receptionist dashboards poll every 20s for ready_for_checkout
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
    <div className="space-y-6">
      {isEmergency && (
        <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-2xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
          <div>
            <p className="text-sm font-black text-destructive uppercase tracking-wide">Emergency patient</p>
            <p className="text-xs text-destructive/80">This visit was flagged as an emergency at intake.</p>
          </div>
        </div>
      )}

      {triageNotes && (
        <div className="glass-panel rounded-2xl border border-outline-variant/40 p-5 shadow-premium">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardList className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-on-surface">Intake / initial history</h3>
          </div>
          <p className="text-xs text-on-surface-variant/80 whitespace-pre-wrap">{triageNotes}</p>
        </div>
      )}

    <div className="grid md:grid-cols-12 gap-8 items-start">
      
      {/* LEFT: MEDICAL BRIEF / TABS */}
      <div className="md:col-span-4 space-y-6">
        
        {/* PATIENT PROFILE BRIEF */}
        <div className="glass-panel rounded-2xl border border-outline-variant/40 p-5 shadow-premium">
          <div className="flex items-center justify-between border-b border-outline-variant/35 pb-4 mb-4">
            <div>
              <span className="text-[9px] font-black text-primary uppercase tracking-wider block">Patient Brief</span>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-black text-on-surface">{pet.name}</h3>
                <Link
                  href={`/dashboard/doctors/patients/${patientId}`}
                  className="text-[10px] font-semibold text-primary hover:underline shrink-0"
                >
                  Full patient history
                </Link>
              </div>
            </div>
            <span className="bg-primary/5 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full capitalize">
              {pet.species}
            </span>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="flex items-center justify-between text-on-surface-variant/70">
              <span className="font-semibold text-on-surface">Breed</span>
              <span>{pet.breed || 'Unknown'}</span>
            </div>
            <div className="flex items-center justify-between text-on-surface-variant/70">
              <span className="font-semibold text-on-surface">Gender</span>
              <span>{pet.gender}</span>
            </div>
            {pet.weightKg && (
              <div className="flex items-center justify-between text-on-surface-variant/70">
                <span className="font-semibold text-on-surface flex items-center gap-1">
                  <Weight className="w-3.5 h-3.5 text-primary/70" />
                  Weight
                </span>
                <span>{pet.weightKg} kg</span>
              </div>
            )}
            <div className="flex items-center justify-between text-on-surface-variant/70">
              <span className="font-semibold text-on-surface flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-primary/70" />
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
        <div className="flex glass-panel p-1 rounded-xl border border-outline-variant/40 shadow-sm">
          <button
            onClick={() => setActiveTab('consult')}
            className={`flex-1 py-2.5 text-[11px] font-bold rounded-lg transition-all ${
              activeTab === 'consult' 
                ? 'bg-primary text-white shadow-sm' 
                : 'text-on-surface-variant/60 hover:text-on-surface'
            }`}
          >
            Workspace
          </button>
          <button
            onClick={() => setActiveTab('labs')}
            className={`flex-1 py-2.5 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
              activeTab === 'labs' 
                ? 'bg-primary text-white shadow-sm' 
                : 'text-on-surface-variant/60 hover:text-on-surface'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            Labs/Docs ({labOrders.length + documents.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2.5 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
              activeTab === 'history' 
                ? 'bg-primary text-white shadow-sm' 
                : 'text-on-surface-variant/60 hover:text-on-surface'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            History ({history.length})
          </button>
        </div>

        {/* TABS INNER: VISIT HISTORY */}
        {activeTab === 'history' && (
          <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
            {history.length > 0 ? (
              history.map((h) => (
                <div key={h.id} className="glass-panel rounded-xl border border-outline-variant/40 p-4 shadow-sm space-y-2">
                  <div className="flex justify-between items-center border-b border-outline-variant/30 pb-2">
                    <span className="text-[10px] text-on-surface-variant/50 font-bold">
                      {new Date(h.checkedInAt).toLocaleDateString()}
                    </span>
                    <span className="bg-primary/5 text-primary text-[9px] font-bold px-1.5 py-0.5 rounded">
                      Consult Completed
                    </span>
                  </div>
                  <div className="text-xs space-y-1.5">
                    <p className="font-semibold text-on-surface">
                      Reason: <span className="font-normal text-on-surface-variant/80">{h.reason}</span>
                    </p>
                    {h.clinicalNotes && (
                      <>
                        <p className="font-semibold text-on-surface">
                          Diagnosis: <span className="text-primary">{h.clinicalNotes.diagnosis}</span>
                        </p>
                        {h.clinicalNotes.treatmentPlan && (
                          <p className="font-semibold text-on-surface">
                            Plan: <span className="font-normal text-on-surface-variant/70">{h.clinicalNotes.treatmentPlan}</span>
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="glass-panel rounded-xl border border-outline-variant/40 p-8 text-center text-xs text-on-surface-variant/50 italic">
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

          {/* VISIT TYPE SELECTOR */}
          <div className="glass-panel rounded-2xl border border-outline-variant/40 p-4 shadow-premium">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase block mb-2">Visit type</span>
            <div className="flex flex-wrap gap-2">
              {(['standard', 'lab', 'surgery'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleVisitTypeChange(t)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-colors ${
                    visitType === t
                      ? 'bg-primary text-white'
                      : 'bg-surface-container border border-outline-variant text-on-surface-variant'
                  }`}
                >
                  {t === 'lab' ? 'Lab-focused' : t}
                </button>
              ))}
            </div>
          </div>

          {/* CLINICAL NOTE EDITING BOARD */}
          <div className="glass-panel rounded-2xl border border-outline-variant/40 p-6 shadow-premium space-y-5">
            <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5 border-b border-outline-variant/30 pb-4">
              <Stethoscope className="w-4 h-4 text-primary" />
              Clinical Consultation Notes
            </h3>

            <div>
              <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                Chief Complaint / Reason for Visit
              </label>
              <input
                type="text"
                {...register('chiefComplaint')}
                className="w-full px-3 py-2 bg-surface-container/20 border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs text-on-surface outline-none"
              />
              {errors.chiefComplaint && (
                <span className="text-[10px] text-destructive mt-1 block">{errors.chiefComplaint.message}</span>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                  Anamnesis / History
                </label>
                <textarea
                  {...register('history')}
                  placeholder="Record anamnesis details, signs onset, symptoms..."
                  rows={4}
                  className="w-full px-3 py-2 bg-surface-container/20 border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs text-on-surface outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                  Examination Findings
                </label>
                <textarea
                  {...register('examinationFindings')}
                  placeholder="Record clinical checks (temperature, cardiac, visual check)..."
                  rows={4}
                  className="w-full px-3 py-2 bg-surface-container/20 border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs text-on-surface outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-surface-container/20 border border-outline-variant/30">
              <p className="col-span-full text-[10px] font-bold text-primary uppercase tracking-wider">
                Vitals (structured)
              </p>
              <div>
                <label className="block text-[9px] font-semibold text-on-surface-variant uppercase mb-1">
                  Temp (°C)
                </label>
                <input
                  type="number"
                  step="0.1"
                  {...register('temperatureC', { valueAsNumber: true })}
                  className="w-full px-2 py-1.5 bg-surface border border-outline-variant rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[9px] font-semibold text-on-surface-variant uppercase mb-1">
                  Heart rate
                </label>
                <input
                  type="number"
                  {...register('heartRateBpm', { valueAsNumber: true })}
                  className="w-full px-2 py-1.5 bg-surface border border-outline-variant rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[9px] font-semibold text-on-surface-variant uppercase mb-1">
                  Resp. rate
                </label>
                <input
                  type="number"
                  {...register('respiratoryRate', { valueAsNumber: true })}
                  className="w-full px-2 py-1.5 bg-surface border border-outline-variant rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[9px] font-semibold text-on-surface-variant uppercase mb-1">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  {...register('weightKg', { valueAsNumber: true })}
                  className="w-full px-2 py-1.5 bg-surface border border-outline-variant rounded-lg text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                Diagnosis / Assessment
              </label>
              <input
                type="text"
                {...register('diagnosis')}
                placeholder="e.g. Feline Infectious Enteritis, Otitis Externa"
                className="w-full px-3 py-2 bg-surface-container/20 border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs text-on-surface outline-none font-bold"
              />
              {errors.diagnosis && (
                <span className="text-[10px] text-destructive mt-1 block">{errors.diagnosis.message}</span>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                Treatment Plan & Recommendations
              </label>
              <textarea
                {...register('treatmentPlan')}
                placeholder="Specify general directions, clinical advice, or home care details..."
                rows={3}
                className="w-full px-3 py-2 bg-surface-container/20 border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs text-on-surface outline-none"
              />
            </div>

            {visitType === 'surgery' && (
              <>
                <div>
                  <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                    Procedure notes
                  </label>
                  <textarea
                    {...register('procedureNotes')}
                    placeholder="Surgical procedure details, anesthesia notes..."
                    rows={3}
                    className="w-full px-3 py-2 bg-surface-container/20 border border-outline-variant focus:border-primary rounded-xl text-xs text-on-surface outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                    Post-op medication
                  </label>
                  <textarea
                    {...register('postOpMedication')}
                    placeholder="Pain management, antibiotics, wound care..."
                    rows={2}
                    className="w-full px-3 py-2 bg-surface-container/20 border border-outline-variant focus:border-primary rounded-xl text-xs text-on-surface outline-none"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                Internal Notes (Doctor Only)
              </label>
              <input
                type="text"
                {...register('internalNotes')}
                placeholder="Private findings not visible on client receipts"
                className="w-full px-3 py-2 bg-surface-container/20 border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs text-on-surface outline-none"
              />
            </div>

            <div className="p-4 bg-surface-container/20 border border-outline-variant/40 rounded-xl space-y-3">
              <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider">
                Follow-up Schedule
              </label>
              <p className="text-[10px] text-on-surface-variant/60">
                Select days to auto-create follow-up appointment requests for receptionist confirmation.
              </p>
              <div className="flex flex-wrap gap-2">
                {FOLLOW_UP_PRESETS.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleFollowUpDay(day)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                      followUpDays.includes(day)
                        ? 'bg-primary text-white border-primary'
                        : 'border-outline-variant text-on-surface-variant hover:border-primary/40'
                    }`}
                  >
                    {day} days
                  </button>
                ))}
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    value={customFollowUpDay}
                    onChange={(e) => setCustomFollowUpDay(e.target.value)}
                    placeholder="Custom"
                    className="w-16 px-2 py-1.5 bg-surface border border-outline-variant rounded-lg text-[10px]"
                  />
                  <button
                    type="button"
                    onClick={addCustomFollowUpDay}
                    className="text-[10px] font-bold text-primary hover:underline"
                  >
                    Add
                  </button>
                </div>
              </div>
              {followUpDays.length > 0 && (
                <p className="text-[10px] text-primary font-semibold">
                  Will create {followUpDays.length} follow-up request{followUpDays.length > 1 ? 's' : ''} on:{' '}
                  {followUpDays.map((d) => `${d}d`).join(', ')}
                </p>
              )}
              <input
                type="text"
                {...register('followUpRecommendation')}
                placeholder="Follow-up notes (e.g. ear recheck, wound inspection)"
                className="w-full px-3 py-2 bg-surface-container/20 border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs text-on-surface outline-none"
              />
            </div>
          </div>

          {/* SERVICES PERFORMED */}
          <div className="glass-panel rounded-2xl border border-outline-variant/40 p-6 shadow-premium space-y-5">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-4">
              <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                <Stethoscope className="w-4 h-4 text-primary" />
                Services Performed
              </h3>
              <button
                type="button"
                onClick={() => appendService({ serviceId: null, name: '', unitPrice: 0, quantity: 1 })}
                className="inline-flex items-center gap-1 text-[10px] font-bold text-primary border border-primary/30 px-2.5 py-1.5 rounded-lg hover:bg-primary/10 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Service
              </button>
            </div>

            {serviceFields.length > 0 ? (
              <div className="space-y-3">
                {serviceFields.map((field, idx) => (
                  <div
                    key={field.id}
                    className="p-4 bg-surface-container/20 border border-outline-variant/40 rounded-xl grid grid-cols-12 gap-3 items-end"
                  >
                    <div className="col-span-12 sm:col-span-5">
                      <label className="block text-[9px] font-bold text-on-surface-variant/40 uppercase mb-1">
                        Service
                      </label>
                      <select
                        onChange={(e) => handleSelectService(idx, e.target.value)}
                        className="w-full px-2 py-1.5 glass-panel border border-outline-variant rounded-lg text-[10px] font-bold text-on-surface outline-none"
                        defaultValue={
                          catalogServices.find((s) => s.id === watch(`serviceItems.${idx}.serviceId`))?.id || ''
                        }
                      >
                        <option value="">-- Select service --</option>
                        {catalogServices.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} (${s.price})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-6 sm:col-span-3">
                      <label className="block text-[9px] font-bold text-on-surface-variant/40 uppercase mb-1">
                        Price
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        {...register(`serviceItems.${idx}.unitPrice`, { valueAsNumber: true })}
                        className="w-full px-2.5 py-1.5 glass-panel border border-outline-variant rounded-lg text-[10px] text-on-surface outline-none"
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <label className="block text-[9px] font-bold text-on-surface-variant/40 uppercase mb-1">
                        Qty
                      </label>
                      <input
                        type="number"
                        {...register(`serviceItems.${idx}.quantity`, { valueAsNumber: true })}
                        min={1}
                        className="w-full px-2.5 py-1.5 glass-panel border border-outline-variant rounded-lg text-[10px] text-on-surface outline-none font-bold"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeService(idx)}
                        className="text-destructive hover:bg-destructive/5 p-1 rounded transition-all"
                        title="Remove service"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <input type="hidden" {...register(`serviceItems.${idx}.name`)} />
                    <input type="hidden" {...register(`serviceItems.${idx}.serviceId`)} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-on-surface-variant/50 italic text-center py-4 bg-surface-container/10 rounded-xl border border-outline-variant/20">
                No services added. Consultation fee is auto-suggested when catalog is available.
              </p>
            )}
          </div>

          {/* PRESCRIPTION BUILDER PANEL */}
          <div className="glass-panel rounded-2xl border border-outline-variant/40 p-6 shadow-premium space-y-5">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-4">
              <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                <FileCheck2 className="w-4 h-4 text-primary" />
                Items dispensed / prescription
              </h3>
              <button
                type="button"
                onClick={() => append({ medicineName: '', dosage: '', frequency: '', duration: '', instructions: '', quantityRequested: 1 })}
                className="inline-flex items-center gap-1 text-[10px] font-bold text-primary border border-primary/30 px-2.5 py-1.5 rounded-lg hover:bg-primary/10 transition-all"
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
                    className="p-4 bg-surface-container/20 border border-outline-variant/40 rounded-xl grid grid-cols-12 gap-3 items-end relative"
                  >
                    {/* Catalog linker selection */}
                    <div className="col-span-12 sm:col-span-4">
                      <label className="block text-[9px] font-bold text-on-surface-variant/40 uppercase mb-1">
                        Link Inventory Product
                      </label>
                      <select
                        onChange={(e) => handleSelectProduct(idx, e.target.value)}
                        className="w-full px-2 py-1.5 glass-panel border border-outline-variant rounded-lg text-[10px] font-bold text-on-surface outline-none"
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
                        <label className="block text-[9px] font-bold text-on-surface-variant/40 uppercase mb-1">
                          Medicine Name
                        </label>
                        <input
                          type="text"
                          {...register(`prescriptionItems.${idx}.medicineName`)}
                          placeholder="e.g. Amoxicillin"
                          className="w-full px-2.5 py-1.5 glass-panel border border-outline-variant rounded-lg text-[10px] text-on-surface outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-on-surface-variant/40 uppercase mb-1">
                          Dosage
                        </label>
                        <input
                          type="text"
                          {...register(`prescriptionItems.${idx}.dosage`)}
                          placeholder="e.g. 5ml"
                          className="w-full px-2.5 py-1.5 glass-panel border border-outline-variant rounded-lg text-[10px] text-on-surface outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-on-surface-variant/40 uppercase mb-1">
                          Qty
                        </label>
                        <input
                          type="number"
                          {...register(`prescriptionItems.${idx}.quantityRequested`, { valueAsNumber: true })}
                          className="w-full px-2.5 py-1.5 glass-panel border border-outline-variant rounded-lg text-[10px] text-on-surface outline-none font-bold"
                          min={1}
                          required
                        />
                      </div>
                    </div>

                    <div className="col-span-12 grid grid-cols-12 gap-2 mt-2 pt-2 border-t border-outline-variant/25">
                      <div className="col-span-5">
                        <label className="block text-[9px] font-bold text-on-surface-variant/40 uppercase mb-1">
                          Frequency
                        </label>
                        <input
                          type="text"
                          {...register(`prescriptionItems.${idx}.frequency`)}
                          placeholder="e.g. Twice daily"
                          className="w-full px-2 py-1 glass-panel border border-outline-variant rounded-lg text-[10px] text-on-surface outline-none"
                          required
                        />
                      </div>
                      <div className="col-span-4">
                        <label className="block text-[9px] font-bold text-on-surface-variant/40 uppercase mb-1">
                          Duration
                        </label>
                        <input
                          type="text"
                          {...register(`prescriptionItems.${idx}.duration`)}
                          placeholder="e.g. 7 days"
                          className="w-full px-2 py-1 glass-panel border border-outline-variant rounded-lg text-[10px] text-on-surface outline-none"
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[9px] font-bold text-on-surface-variant/40 uppercase mb-1">
                          Instructions
                        </label>
                        <input
                          type="text"
                          {...register(`prescriptionItems.${idx}.instructions`)}
                          placeholder="With food"
                          className="w-full px-2 py-1 glass-panel border border-outline-variant rounded-lg text-[10px] text-on-surface outline-none"
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
              <p className="text-xs text-on-surface-variant/50 italic text-center py-4 bg-surface-container/10 rounded-xl border border-outline-variant/20">
                No items prescribed. Click "Add Medicine" to prescribe items.
              </p>
            )}
          </div>

          {/* ACTION SUBMIT BUTTON */}
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary hover:opacity-90 text-white py-3 px-8 rounded-2xl font-bold text-sm shadow-premium flex items-center gap-2 transition-all disabled:opacity-75"
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

      {/* LABS & DOCUMENTS PANEL */}
      {activeTab === 'labs' && (
        <div className="md:col-span-8 pb-12">
          <ConsultationLabsDocsPanel
            visitId={visitId}
            patientId={patientId}
            labCatalog={labCatalog}
            labOrders={labOrders}
            documents={documents}
          />
        </div>
      )}

    </div>
    </div>
  );
}

