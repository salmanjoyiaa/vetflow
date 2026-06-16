'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CompleteConsultationSchema, type CompleteConsultationInput } from '@/lib/validations/schemas';
import { completeConsultationAction, saveConsultationDraftAction } from '@/lib/services/clinical-actions';
import { pauseConsultationAction, resumeConsultationAction } from '@/lib/services/visit-actions';
import ConsultationLabsDocsPanel from '@/components/forms/ConsultationLabsDocsPanel';
import CatalogItemQuickAddModal from '@/components/inventory/CatalogItemQuickAddModal';
import Select from '@/components/ui/premium/Select';
import RequiredLabel from '@/components/ui/RequiredLabel';
import type { ProductType } from '@/lib/inventory/product-types';
import { SoapTabBar, SOAP_TAB_ORDER, getSoapTabTitle, type SoapTab } from '@/components/consultation/SoapTabBar';
import { validateSoapTab, validateAllSoapSteps } from '@/lib/consultation/soap-validation';
import {
  computeFollowUpPreviews,
  defaultConsecutiveStartDate,
  offsetDatePreview,
  type FollowUpMode,
} from '@/lib/consultation/follow-up-schedule';
import { useSoapFieldNavigation } from '@/lib/hooks/useSoapFieldNavigation';
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
  X,
  Pause,
  Play,
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
  previousDocuments?: DocumentItem[];
  consultStartedAt?: string | null;
  consultPausedAt?: string | null;
  consultPauseReason?: string | null;
  consultPauseAccumulatedSec?: number;
  initialDraft?: Partial<CompleteConsultationInput> | null;
  activeBranchId: string;
  categories?: { id: string; name: string }[];
  checkedInAt: string;
  isFollowUpPatient?: boolean;
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
  previousDocuments = [],
  consultStartedAt = null,
  consultPausedAt: initialPausedAt = null,
  consultPauseReason: initialPauseReason = null,
  consultPauseAccumulatedSec = 0,
  initialDraft = null,
  activeBranchId,
  categories = [],
  checkedInAt,
  isFollowUpPatient = false,
}: ConsultationWorkspaceClientProps) {
  const router = useRouter();
  const followUpBaseDate = checkedInAt.slice(0, 10);
  const [localProducts, setLocalProducts] = useState(products);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddType, setQuickAddType] = useState<ProductType>('medicine');
  const [quickAddTarget, setQuickAddTarget] = useState<{ kind: 'product'; index: number } | null>(null);
  const [activeSoapTab, setActiveSoapTab] = useState<SoapTab>('S');
  const [maxUnlockedIndex, setMaxUnlockedIndex] = useState(() => {
    if (!initialDraft) return 0;
    let max = 0;
    if ((initialDraft.chiefComplaint?.trim().length ?? 0) >= 3) max = 1;
    if (
      max >= 1 &&
      (Boolean(initialDraft.examinationFindings?.trim()) ||
        initialDraft.temperatureC != null ||
        initialDraft.heartRateBpm != null)
    ) {
      max = 2;
    }
    if (max >= 2 && (initialDraft.diagnosis?.trim().length ?? 0) >= 3) max = 3;
    if (max >= 3 && (initialDraft.treatmentPlan?.trim().length ?? 0) >= 3) max = 4;
    if (max >= 4) max = 5;
    return Math.min(max, SOAP_TAB_ORDER.length - 1);
  });
  const [tabError, setTabError] = useState<string | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [visitType, setVisitType] = useState<'standard' | 'lab' | 'surgery'>(
    initialDraft?.visitType ?? 'standard'
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customFollowUpDay, setCustomFollowUpDay] = useState('');
  const [consecutiveCountInput, setConsecutiveCountInput] = useState(
    String(initialDraft?.followUpConsecutive?.count ?? 3)
  );
  const [consecutiveStartDate, setConsecutiveStartDate] = useState(
    initialDraft?.followUpConsecutive?.startDate ?? defaultConsecutiveStartDate(followUpBaseDate)
  );
  const [showFollowUpConfirm, setShowFollowUpConfirm] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState<CompleteConsultationInput | null>(null);
  const [consultPausedAt, setConsultPausedAt] = useState<string | null>(initialPausedAt);
  const [consultPauseReason, setConsultPauseReason] = useState<string | null>(initialPauseReason);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [pauseReasonInput, setPauseReasonInput] = useState('');
  const [pauseLoading, setPauseLoading] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    getValues,
    formState: { errors },
  } = useForm<CompleteConsultationInput>({
    resolver: zodResolver(CompleteConsultationSchema),
    defaultValues: {
      visitId,
      visitType: initialDraft?.visitType ?? 'standard',
      chiefComplaint: initialDraft?.chiefComplaint ?? visitReason,
      history: initialDraft?.history ?? '',
      examinationFindings: initialDraft?.examinationFindings ?? '',
      diagnosis: initialDraft?.diagnosis ?? '',
      treatmentPlan: initialDraft?.treatmentPlan ?? '',
      internalNotes: initialDraft?.internalNotes ?? '',
      followUpRecommendation: initialDraft?.followUpRecommendation ?? '',
      followUpDays: initialDraft?.followUpDays ?? initialDraft?.followUpOffsetDays ?? [],
      followUpMode: initialDraft?.followUpMode ?? 'none',
      followUpOffsetDays: initialDraft?.followUpOffsetDays ?? initialDraft?.followUpDays ?? [],
      followUpConsecutive: initialDraft?.followUpConsecutive,
      noPrescriptionNeeded: initialDraft?.noPrescriptionNeeded ?? false,
      procedureNotes: initialDraft?.procedureNotes ?? '',
      postOpMedication: initialDraft?.postOpMedication ?? '',
      temperatureC: initialDraft?.temperatureC ?? undefined,
      heartRateBpm: initialDraft?.heartRateBpm ?? undefined,
      respiratoryRate: initialDraft?.respiratoryRate ?? undefined,
      weightKg: initialDraft?.weightKg ?? pet.weightKg ?? undefined,
      prescriptionItems: initialDraft?.prescriptionItems ?? [],
      serviceItems: initialDraft?.serviceItems?.length
        ? initialDraft.serviceItems
        : catalogServices.length > 0
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
  const noPrescriptionNeeded = watch('noPrescriptionNeeded');
  const followUpMode = (watch('followUpMode') ?? 'none') as FollowUpMode;
  const followUpOffsetDays = watch('followUpOffsetDays') ?? [];
  const chiefComplaintWatch = watch('chiefComplaint');
  const examinationWatch = watch('examinationFindings');
  const diagnosisWatch = watch('diagnosis');
  const treatmentPlanWatch = watch('treatmentPlan');

  const soapCompleted: Partial<Record<SoapTab, boolean>> = {
    S: Boolean(chiefComplaintWatch?.trim()),
    O: Boolean(examinationWatch?.trim()) || Boolean(watch('temperatureC')),
    A: Boolean(diagnosisWatch?.trim()),
    P: Boolean(treatmentPlanWatch?.trim()) || serviceFields.length > 0,
    D: labOrders.length > 0 || documents.length > 0,
    Rx: noPrescriptionNeeded || prescriptionItemsWatch.length > 0,
  };

  const soapContext = useMemo(
    () => ({
      visitType,
      labOrderCount: labOrders.length,
      noPrescriptionNeeded: Boolean(noPrescriptionNeeded),
    }),
    [visitType, labOrders.length, noPrescriptionNeeded]
  );

  const followUpPreviews = useMemo(() => {
    if (followUpMode === 'offset') {
      return computeFollowUpPreviews(
        { mode: 'offset', offsetDays: followUpOffsetDays },
        followUpBaseDate
      );
    }
    if (followUpMode === 'consecutive') {
      const count = parseInt(consecutiveCountInput, 10);
      if (!count || count < 1) return [];
      return computeFollowUpPreviews(
        {
          mode: 'consecutive',
          offsetDays: [],
          consecutive: { count, startDate: consecutiveStartDate },
        },
        followUpBaseDate
      );
    }
    return [];
  }, [followUpMode, followUpOffsetDays, consecutiveCountInput, consecutiveStartDate, followUpBaseDate]);

  const showPriorVisitsCard = isFollowUpPatient || history.length > 0;
  const priorVisitsPreview = history.slice(0, 3);

  const goToNextSoapTab = async () => {
    const idx = SOAP_TAB_ORDER.indexOf(activeSoapTab);
    if (idx >= SOAP_TAB_ORDER.length - 1) return;
    await validateAndAdvanceTab(SOAP_TAB_ORDER[idx + 1]);
  };

  const goToPrevSoapTab = () => {
    const idx = SOAP_TAB_ORDER.indexOf(activeSoapTab);
    if (idx > 0) {
      setTabError(null);
      setActiveSoapTab(SOAP_TAB_ORDER[idx - 1]);
    }
  };

  const validateTab = (tab: SoapTab): string | null =>
    validateSoapTab(tab, getValues(), soapContext);

  const validateAndAdvanceTab = async (targetTab: SoapTab) => {
    const currentIdx = SOAP_TAB_ORDER.indexOf(activeSoapTab);
    const targetIdx = SOAP_TAB_ORDER.indexOf(targetTab);

    if (targetIdx <= currentIdx) {
      setTabError(null);
      setActiveSoapTab(targetTab);
      return;
    }
    if (targetIdx > maxUnlockedIndex + 1) return;

    const err = validateTab(activeSoapTab);
    if (err) {
      setTabError(err);
      return;
    }

    setSavingDraft(true);
    setTabError(null);
    const res = await saveConsultationDraftAction(visitId, getValues());
    setSavingDraft(false);

    if (!res.success) {
      setTabError(res.error || 'Failed to save draft.');
      return;
    }

    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 2500);
    const nextUnlocked = Math.max(maxUnlockedIndex, currentIdx + 1);
    setMaxUnlockedIndex(nextUnlocked);
    setActiveSoapTab(targetIdx <= nextUnlocked ? targetTab : SOAP_TAB_ORDER[nextUnlocked]);
  };

  const handleSoapTabChange = (tab: SoapTab) => {
    void validateAndAdvanceTab(tab);
  };

  const { handleFormKeyDown } = useSoapFieldNavigation(activeSoapTab, goToNextSoapTab);

  const jumpToErrorTab = () => {
    if (errors.chiefComplaint) setActiveSoapTab('S');
    else if (errors.examinationFindings) setActiveSoapTab('O');
    else if (errors.diagnosis) setActiveSoapTab('A');
    else if (errors.treatmentPlan || errors.serviceItems) setActiveSoapTab('P');
    else if (errors.prescriptionItems) setActiveSoapTab('Rx');
  };

  const setFollowUpMode = (mode: FollowUpMode) => {
    setValue('followUpMode', mode);
    if (mode === 'none') {
      setValue('followUpOffsetDays', []);
      setValue('followUpDays', []);
      setValue('followUpConsecutive', undefined);
    } else if (mode === 'consecutive') {
      setValue('followUpOffsetDays', []);
      const count = parseInt(consecutiveCountInput, 10) || 3;
      setValue('followUpConsecutive', { count, startDate: consecutiveStartDate });
    }
  };

  const toggleFollowUpDay = (day: number) => {
    const current = getValues('followUpOffsetDays') ?? [];
    const next = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort((a, b) => a - b);
    setValue('followUpMode', 'offset');
    setValue('followUpOffsetDays', next);
    setValue('followUpDays', next);
    setCustomFollowUpDay('');
  };

  const removeFollowUpDay = (day: number) => {
    const next = (getValues('followUpOffsetDays') ?? []).filter((d) => d !== day);
    setValue('followUpOffsetDays', next);
    setValue('followUpDays', next);
    if (next.length === 0) setValue('followUpMode', 'none');
  };

  const clearFollowUpDays = () => {
    setValue('followUpMode', 'none');
    setValue('followUpOffsetDays', []);
    setValue('followUpDays', []);
    setValue('followUpConsecutive', undefined);
    setCustomFollowUpDay('');
  };

  const addCustomFollowUpDay = () => {
    const day = parseInt(customFollowUpDay, 10);
    if (!day || day < 1) return;
    const current = getValues('followUpOffsetDays') ?? [];
    if (!current.includes(day)) {
      const next = [...current, day].sort((a, b) => a - b);
      setValue('followUpMode', 'offset');
      setValue('followUpOffsetDays', next);
      setValue('followUpDays', next);
    }
    setCustomFollowUpDay('');
  };

  const applyConsecutiveFollowUp = () => {
    const count = parseInt(consecutiveCountInput, 10);
    if (!count || count < 1 || !consecutiveStartDate) return;
    setValue('followUpMode', 'consecutive');
    setValue('followUpOffsetDays', []);
    setValue('followUpDays', []);
    setValue('followUpConsecutive', { count, startDate: consecutiveStartDate });
  };

  const buildSubmitPayload = (data: CompleteConsultationInput): CompleteConsultationInput => {
    const mode = data.followUpMode ?? 'none';
    if (mode === 'consecutive') {
      const count = parseInt(consecutiveCountInput, 10) || data.followUpConsecutive?.count || 0;
      return {
        ...data,
        followUpMode: 'consecutive',
        followUpConsecutive: { count, startDate: consecutiveStartDate },
        followUpOffsetDays: [],
        followUpDays: [],
      };
    }
    if (mode === 'offset') {
      return {
        ...data,
        followUpMode: 'offset',
        followUpOffsetDays: data.followUpOffsetDays ?? [],
        followUpDays: data.followUpOffsetDays ?? [],
        followUpConsecutive: undefined,
      };
    }
    return {
      ...data,
      followUpMode: 'none',
      followUpOffsetDays: [],
      followUpDays: [],
      followUpConsecutive: undefined,
    };
  };

  const executeComplete = async (data: CompleteConsultationInput) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const payload = buildSubmitPayload(data);
      const res = await completeConsultationAction(payload);
      if (res.success) {
        router.replace('/dashboard/doctors');
      } else {
        setError(res.error || 'Failed to complete consultation');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
      setShowFollowUpConfirm(false);
      setPendingSubmitData(null);
    }
  };

  const onSubmit = async (data: CompleteConsultationInput) => {
    if (consultPausedAt) {
      setError('Resume the consultation before completing.');
      return;
    }

    const payload = buildSubmitPayload(data);
    const validationFailure = validateAllSoapSteps(payload, soapContext);
    if (validationFailure) {
      setActiveSoapTab(validationFailure.tab);
      setTabError(validationFailure.message);
      return;
    }

    setTabError(null);

    if ((payload.followUpMode ?? 'none') !== 'none' && followUpPreviews.length > 0) {
      setPendingSubmitData(payload);
      setShowFollowUpConfirm(true);
      return;
    }

    await executeComplete(payload);
  };

  const confirmFollowUpAndComplete = async () => {
    if (!pendingSubmitData) return;
    await executeComplete(pendingSubmitData);
  };

  const handleSelectService = (index: number, serviceId: string) => {
    if (!serviceId) return;
    const selected = catalogServices.find((s) => s.id === serviceId);
    if (selected) {
      setValue(`serviceItems.${index}.serviceId`, selected.id, { shouldValidate: true });
      setValue(`serviceItems.${index}.name`, selected.name, { shouldValidate: true });
      setValue(`serviceItems.${index}.unitPrice`, selected.price, { shouldValidate: true });
    }
  };

  const handleSelectProduct = (index: number, productId: string) => {
    if (!productId) {
      setValue(`prescriptionItems.${index}.productId`, null);
      return;
    }
    const selected = localProducts.find((p) => p.id === productId);
    if (selected) {
      setValue(`prescriptionItems.${index}.medicineName`, selected.name, { shouldValidate: true });
      setValue(`prescriptionItems.${index}.productId`, selected.id, { shouldValidate: true });
    }
  };

  const handleVisitTypeChange = (type: 'standard' | 'lab' | 'surgery') => {
    setVisitType(type);
    setValue('visitType', type);
    if (type === 'lab') {
      setActiveSoapTab('D');
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

  const handlePauseConsult = async () => {
    setPauseLoading(true);
    setError(null);
    const res = await pauseConsultationAction(visitId, pauseReasonInput);
    if (res.success) {
      setConsultPausedAt(new Date().toISOString());
      setConsultPauseReason(pauseReasonInput.trim());
      setShowPauseModal(false);
      setPauseReasonInput('');
      router.refresh();
    } else {
      setError(res.error || 'Failed to pause consultation.');
    }
    setPauseLoading(false);
  };

  const handleResumeConsult = async () => {
    setPauseLoading(true);
    setError(null);
    const res = await resumeConsultationAction(visitId);
    if (res.success) {
      setConsultPausedAt(null);
      setConsultPauseReason(null);
      router.refresh();
    } else {
      setError(res.error || 'Failed to resume consultation.');
    }
    setPauseLoading(false);
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

      {consultPausedAt && (
        <div className="p-4 bg-violet-500/10 border border-violet-500/30 rounded-2xl flex items-start gap-3">
          <Pause className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-black text-violet-300 uppercase tracking-wide">Consultation paused</p>
            <p className="text-xs text-violet-200/80 mt-1">{consultPauseReason}</p>
            <p className="text-[10px] text-on-surface-variant/60 mt-1">Reception can see this status. Resume when ready to continue charting.</p>
          </div>
        </div>
      )}

      {showPauseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="glass-panel rounded-2xl border border-outline-variant/40 p-6 max-w-md w-full shadow-premium space-y-4">
            <h3 className="text-sm font-bold text-on-surface">Pause consultation</h3>
            <p className="text-xs text-on-surface-variant">Reception and clinic admin will see the paused status and your reason.</p>
            <textarea
              value={pauseReasonInput}
              onChange={(e) => setPauseReasonInput(e.target.value)}
              placeholder="e.g. Waiting for lab results, owner stepped out..."
              rows={3}
              className="w-full px-3 py-2 bg-surface-container/20 border border-outline-variant rounded-xl text-sm outline-none focus:border-primary"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPauseModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-outline-variant"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePauseConsult}
                disabled={pauseLoading || pauseReasonInput.trim().length < 3}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-violet-600 text-white disabled:opacity-50 flex items-center gap-2"
              >
                {pauseLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Pause
              </button>
            </div>
          </div>
        </div>
      )}

      {showFollowUpConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="glass-panel rounded-2xl border border-outline-variant/40 p-6 max-w-md w-full shadow-premium space-y-4">
            <h3 className="text-sm font-bold text-on-surface">Create follow-up appointment requests?</h3>
            <p className="text-xs text-on-surface-variant">
              The following appointment requests will be created for receptionist confirmation:
            </p>
            <ul className="text-xs space-y-2 max-h-48 overflow-y-auto">
              {followUpPreviews.map((preview) => (
                <li key={preview.preferredDate + preview.label} className="flex items-start gap-2 text-on-surface-variant">
                  <Calendar className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <span>
                    <span className="font-semibold text-on-surface">{preview.preferredDate}</span>
                    {' — '}
                    {preview.label}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowFollowUpConfirm(false);
                  setPendingSubmitData(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-outline-variant"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmFollowUpAndComplete()}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-primary text-white disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirm &amp; complete consult
              </button>
            </div>
          </div>
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

        {showPriorVisitsCard && (
          <div className="glass-panel rounded-2xl border border-outline-variant/40 p-5 shadow-premium space-y-3">
            <div className="flex items-center gap-2 border-b border-outline-variant/35 pb-3">
              <History className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-on-surface">Previous visits</h3>
            </div>
            {priorVisitsPreview.length > 0 ? (
              <div className="space-y-3">
                {priorVisitsPreview.map((h) => (
                  <div key={h.id} className="text-xs space-y-1 border-b border-outline-variant/20 pb-2 last:border-0 last:pb-0">
                    <p className="text-[10px] font-bold text-on-surface-variant">
                      {new Date(h.checkedInAt).toLocaleDateString()}
                    </p>
                    <p className="text-on-surface-variant/80">
                      <span className="font-semibold text-on-surface">Reason:</span> {h.reason}
                    </p>
                    {h.clinicalNotes && (
                      <>
                        <p className="text-on-surface-variant/80">
                          <span className="font-semibold text-on-surface">Diagnosis:</span>{' '}
                          {h.clinicalNotes.diagnosis}
                        </p>
                        {h.clinicalNotes.treatmentPlan && (
                          <p className="text-on-surface-variant/80">
                            <span className="font-semibold text-on-surface">Plan:</span>{' '}
                            {h.clinicalNotes.treatmentPlan}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-on-surface-variant/60 italic">Follow-up visit — see full history tab for details.</p>
            )}
          </div>
        )}

        {/* NAVIGATION: History sidebar */}
        <div className="flex glass-panel p-1 rounded-xl border border-outline-variant/40 shadow-sm">
          <button
            type="button"
            onClick={() => setShowHistory(false)}
            className={`flex-1 py-2.5 text-[11px] font-bold rounded-lg transition-all ${
              !showHistory
                ? 'bg-primary text-white shadow-sm'
                : 'text-on-surface-variant/60 hover:text-on-surface'
            }`}
          >
            Consultation
          </button>
          <button
            type="button"
            onClick={() => setShowHistory(true)}
            className={`flex-1 py-2.5 text-[11px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
              showHistory
                ? 'bg-primary text-white shadow-sm'
                : 'text-on-surface-variant/60 hover:text-on-surface'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            History ({history.length})
          </button>
        </div>

        {showHistory && (
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

      {/* RIGHT: SOAPDRx WORKSPACE */}
      <form
        onSubmit={handleSubmit(onSubmit, jumpToErrorTab)}
        onKeyDown={handleFormKeyDown}
        className="md:col-span-8 space-y-6 pb-28"
      >
          
          {error && (
            <div className="p-4 bg-destructive/5 border border-destructive/20 text-destructive text-xs rounded-xl">
              {error}
            </div>
          )}

          <input type="hidden" {...register('followUpMode')} />
          <input type="hidden" {...register('followUpOffsetDays')} />

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

          {/* SOAPDRx TAB BAR */}
          <SoapTabBar
            active={activeSoapTab}
            onChange={handleSoapTabChange}
            completed={soapCompleted}
            maxUnlockedIndex={maxUnlockedIndex}
            draftSaved={draftSaved}
          />

          {tabError && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive text-xs rounded-xl">
              {tabError}
            </div>
          )}

          {/* S — Subjective */}
          {activeSoapTab === 'S' && (
          <div className="glass-panel rounded-2xl border border-outline-variant/40 p-6 shadow-premium space-y-5 animate-in fade-in duration-200">
            <div>
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider">SOAP Subjective</h3>
              <p className="text-[10px] text-on-surface-variant/60 mt-1">Chief complaint and patient-reported history.</p>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                <RequiredLabel>Chief Complaint / Reason for Visit</RequiredLabel>
              </label>
              <input
                type="text"
                data-soap-tab="S"
                data-soap-field="chiefComplaint"
                {...register('chiefComplaint')}
                className="w-full px-3 py-2.5 bg-surface-container/20 border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-sm text-on-surface outline-none"
              />
              {errors.chiefComplaint && (
                <span className="text-[10px] text-destructive mt-1 block">{errors.chiefComplaint.message}</span>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                Anamnesis / History
              </label>
              <textarea
                {...register('history')}
                placeholder="Record anamnesis details, signs onset, symptoms..."
                rows={8}
                className="w-full px-3 py-2.5 bg-surface-container/20 border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-sm text-on-surface outline-none"
              />
            </div>
          </div>
          )}

          {/* O — Objective */}
          {activeSoapTab === 'O' && (
          <div className="glass-panel rounded-2xl border border-outline-variant/40 p-6 shadow-premium space-y-5 animate-in fade-in duration-200">
            <div>
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider">SOAP Objective</h3>
              <p className="text-[10px] text-on-surface-variant/60 mt-1">Physical exam findings and structured vitals.</p>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                <RequiredLabel>Examination Findings</RequiredLabel>
                <span className="text-on-surface-variant/50 font-normal normal-case ml-1">(or fill vitals below)</span>
              </label>
              <textarea
                data-soap-tab="O"
                data-soap-field="examinationFindings"
                {...register('examinationFindings')}
                placeholder="Record clinical checks (temperature, cardiac, visual check)..."
                rows={8}
                className="w-full px-3 py-2.5 bg-surface-container/20 border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-sm text-on-surface outline-none"
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-surface-container/20 border border-outline-variant/30">
              <p className="col-span-full text-[10px] font-bold text-primary uppercase tracking-wider">
                Vitals <span className="text-on-surface-variant/50 font-normal normal-case">(at least one required if no exam notes)</span>
              </p>
              <div>
                <label className="block text-[9px] font-semibold text-on-surface-variant uppercase mb-1">Temp (°C)</label>
                <input type="number" step="0.1" data-soap-tab="O" data-soap-field="temperatureC" {...register('temperatureC', { valueAsNumber: true })} className="w-full px-2 py-2 bg-surface border border-outline-variant rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-[9px] font-semibold text-on-surface-variant uppercase mb-1">Heart rate</label>
                <input type="number" data-soap-tab="O" data-soap-field="heartRateBpm" {...register('heartRateBpm', { valueAsNumber: true })} className="w-full px-2 py-2 bg-surface border border-outline-variant rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-[9px] font-semibold text-on-surface-variant uppercase mb-1">Resp. rate</label>
                <input type="number" data-soap-tab="O" data-soap-field="respiratoryRate" {...register('respiratoryRate', { valueAsNumber: true })} className="w-full px-2 py-2 bg-surface border border-outline-variant rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-[9px] font-semibold text-on-surface-variant uppercase mb-1">Weight (kg)</label>
                <input type="number" step="0.1" data-soap-tab="O" data-soap-field="weightKg" {...register('weightKg', { valueAsNumber: true })} className="w-full px-2 py-2 bg-surface border border-outline-variant rounded-lg text-sm" />
              </div>
            </div>
          </div>
          )}

          {/* A — Assessment */}
          {activeSoapTab === 'A' && (
          <div className="glass-panel rounded-2xl border border-outline-variant/40 p-6 shadow-premium space-y-5 animate-in fade-in duration-200">
            <div>
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider">SOAP Assessment</h3>
              <p className="text-[10px] text-on-surface-variant/60 mt-1">Clinical diagnosis and assessment.</p>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                <RequiredLabel>Diagnosis / Assessment</RequiredLabel>
              </label>
              <textarea
                data-soap-tab="A"
                data-soap-field="diagnosis"
                {...register('diagnosis')}
                placeholder="e.g. Feline Infectious Enteritis, Otitis Externa"
                rows={4}
                className="w-full px-3 py-2.5 bg-surface-container/20 border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-sm text-on-surface outline-none font-semibold"
              />
              {errors.diagnosis && (
                <span className="text-[10px] text-destructive mt-1 block">{errors.diagnosis.message}</span>
              )}
            </div>
          </div>
          )}

          {/* P — Plan */}
          {activeSoapTab === 'P' && (
          <div className="space-y-6 animate-in fade-in duration-200">
          <div className="glass-panel rounded-2xl border border-outline-variant/40 p-6 shadow-premium space-y-5">
            <div>
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider">SOAP Plan</h3>
              <p className="text-[10px] text-on-surface-variant/60 mt-1">Treatment plan, follow-up, and services performed.</p>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                <RequiredLabel>Treatment Plan & Recommendations</RequiredLabel>
              </label>
              <textarea
                data-soap-tab="P"
                data-soap-field="treatmentPlan"
                {...register('treatmentPlan')}
                placeholder="Specify general directions, clinical advice, or home care details..."
                rows={5}
                className="w-full px-3 py-2.5 bg-surface-container/20 border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-sm text-on-surface outline-none"
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

            <div className="p-4 bg-surface-container/20 border border-outline-variant/40 rounded-xl space-y-4">
              <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider">
                Follow-up Schedule
              </label>
              <p className="text-[10px] text-on-surface-variant/60">
                Schedule follow-up appointment requests from check-in date ({followUpBaseDate}).
              </p>

              <div className="flex flex-wrap gap-2">
                {(['none', 'offset', 'consecutive'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setFollowUpMode(mode)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all capitalize ${
                      followUpMode === mode
                        ? 'bg-primary text-white border-primary'
                        : 'border-outline-variant text-on-surface-variant hover:border-primary/40'
                    }`}
                  >
                    {mode === 'none' ? 'None' : mode === 'offset' ? 'After N days' : 'Consecutive days'}
                  </button>
                ))}
              </div>

              {followUpMode === 'offset' && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold text-on-surface-variant">Offset from check-in</p>
                  <div className="flex flex-wrap gap-2">
                    {FOLLOW_UP_PRESETS.map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleFollowUpDay(day)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                          followUpOffsetDays.includes(day)
                            ? 'bg-primary text-white border-primary'
                            : 'border-outline-variant text-on-surface-variant hover:border-primary/40'
                        }`}
                      >
                        {day}d → {offsetDatePreview(followUpBaseDate, day)}
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
                      <button type="button" onClick={addCustomFollowUpDay} className="text-[10px] font-bold text-primary hover:underline">
                        Add
                      </button>
                    </div>
                  </div>
                  {followUpOffsetDays.length > 0 && (
                    <div className="flex flex-wrap gap-2 items-center">
                      {followUpOffsetDays.map((d) => (
                        <span key={d} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                          {d}d ({offsetDatePreview(followUpBaseDate, d)})
                          <button type="button" onClick={() => removeFollowUpDay(d)} className="hover:text-destructive" aria-label={`Remove ${d} day follow-up`}>
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      <button type="button" onClick={clearFollowUpDays} className="text-[10px] font-bold text-on-surface-variant hover:text-destructive underline">
                        Clear
                      </button>
                    </div>
                  )}
                </div>
              )}

              {followUpMode === 'consecutive' && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold text-on-surface-variant">Back-to-back daily appointments</p>
                  <div className="flex flex-wrap gap-3 items-end">
                    <div>
                      <label className="block text-[9px] font-semibold text-on-surface-variant uppercase mb-1">Number of days</label>
                      <input
                        type="number"
                        min={1}
                        value={consecutiveCountInput}
                        onChange={(e) => setConsecutiveCountInput(e.target.value)}
                        className="w-20 px-2 py-1.5 bg-surface border border-outline-variant rounded-lg text-[10px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-semibold text-on-surface-variant uppercase mb-1">Start date</label>
                      <input
                        type="date"
                        value={consecutiveStartDate}
                        onChange={(e) => setConsecutiveStartDate(e.target.value)}
                        className="px-2 py-1.5 bg-surface border border-outline-variant rounded-lg text-[10px]"
                      />
                    </div>
                    <button type="button" onClick={applyConsecutiveFollowUp} className="text-[10px] font-bold text-primary border border-primary/30 px-3 py-1.5 rounded-lg">
                      Apply
                    </button>
                  </div>
                  {followUpPreviews.length > 0 && (
                    <p className="text-[10px] text-primary font-semibold">
                      Preview: {followUpPreviews.map((p) => p.preferredDate).join(', ')}
                    </p>
                  )}
                </div>
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
                      <Select
                        size="compact"
                        value={watch(`serviceItems.${idx}.serviceId`) || ''}
                        onChange={(v) => handleSelectService(idx, v)}
                        options={[
                          { value: '', label: '— Select service —' },
                          ...catalogServices.map((s) => ({
                            value: s.id,
                            label: `${s.name} ($${s.price})`,
                          })),
                        ]}
                        placeholder="Select service…"
                        onAddNew={() => router.push('/dashboard/settings')}
                        addNewLabel="Add service in settings"
                      />
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
          </div>
          )}

          {/* D — Diagnostics */}
          {activeSoapTab === 'D' && (
          <div className="animate-in fade-in duration-200">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider">SOAP Diagnostics</h3>
              <p className="text-[10px] text-on-surface-variant/60 mt-1">Lab orders, results, and clinical documents.</p>
            </div>
            <ConsultationLabsDocsPanel
              visitId={visitId}
              patientId={patientId}
              labCatalog={labCatalog}
              labOrders={labOrders}
              documents={documents}
              previousDocuments={previousDocuments}
            />
          </div>
          )}

          {/* Rx — Prescription */}
          {activeSoapTab === 'Rx' && (
          <div className="glass-panel rounded-2xl border border-outline-variant/40 p-6 shadow-premium space-y-5 animate-in fade-in duration-200">
            <div>
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider">Prescription (Rx)</h3>
              <p className="text-[10px] text-on-surface-variant/60 mt-1">Medicines and items to dispense at checkout.</p>
            </div>

            <label className="flex items-center gap-2 p-3 rounded-xl border border-outline-variant/40 bg-surface-container/20 cursor-pointer">
              <input
                type="checkbox"
                {...register('noPrescriptionNeeded')}
                className="rounded border-outline-variant"
              />
              <span className="text-xs font-semibold text-on-surface">No prescription needed for this visit</span>
            </label>

            {!noPrescriptionNeeded && (
            <>
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-4">
              <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                <FileCheck2 className="w-4 h-4 text-primary" />
                Items dispensed
              </h4>
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
                      <Select
                        size="compact"
                        value={watch(`prescriptionItems.${idx}.productId`) || ''}
                        onChange={(v) => handleSelectProduct(idx, v)}
                        options={[
                          { value: '', label: '— Custom / free-text —' },
                          ...localProducts.map((p) => ({
                            value: p.id,
                            label: `${p.name} ($${p.sellingPrice})`,
                          })),
                        ]}
                        placeholder="Link product…"
                        onAddNew={() => {
                          setQuickAddType('medicine');
                          setQuickAddTarget({ kind: 'product', index: idx });
                          setQuickAddOpen(true);
                        }}
                        addNewLabel="Add catalog item"
                      />
                    </div>

                    <div className="col-span-12 sm:col-span-8 grid grid-cols-4 gap-2">
                      <div className="col-span-2">
                        <label className="block text-[9px] font-bold text-on-surface-variant/40 uppercase mb-1">
                          <RequiredLabel>Medicine Name</RequiredLabel>
                        </label>
                        <input
                          type="text"
                          data-soap-tab="Rx"
                          data-soap-field="prescription-medicine"
                          {...register(`prescriptionItems.${idx}.medicineName`)}
                          placeholder="e.g. Amoxicillin"
                          className="w-full px-2.5 py-1.5 glass-panel border border-outline-variant rounded-lg text-[10px] text-on-surface outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-on-surface-variant/40 uppercase mb-1">
                          <RequiredLabel>Dosage</RequiredLabel>
                        </label>
                        <input
                          type="text"
                          data-soap-tab="Rx"
                          data-soap-field="prescription-dosage"
                          {...register(`prescriptionItems.${idx}.dosage`)}
                          placeholder="e.g. 5ml"
                          className="w-full px-2.5 py-1.5 glass-panel border border-outline-variant rounded-lg text-[10px] text-on-surface outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-on-surface-variant/40 uppercase mb-1">
                          <RequiredLabel>Qty</RequiredLabel>
                        </label>
                        <input
                          type="number"
                          data-soap-tab="Rx"
                          data-soap-field="prescription-qty"
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
                          <RequiredLabel>Frequency</RequiredLabel>
                        </label>
                        <input
                          type="text"
                          data-soap-tab="Rx"
                          data-soap-field="prescription-frequency"
                          {...register(`prescriptionItems.${idx}.frequency`)}
                          placeholder="e.g. Twice daily"
                          className="w-full px-2 py-1 glass-panel border border-outline-variant rounded-lg text-[10px] text-on-surface outline-none"
                          required
                        />
                      </div>
                      <div className="col-span-4">
                        <label className="block text-[9px] font-bold text-on-surface-variant/40 uppercase mb-1">
                          <RequiredLabel>Duration</RequiredLabel>
                        </label>
                        <input
                          type="text"
                          data-soap-tab="Rx"
                          data-soap-field="prescription-duration"
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
                No items prescribed. Click &quot;Add Medicine&quot; to prescribe items.
              </p>
            )}
            </>
            )}
          </div>
          )}

          {/* Internal notes — visible on all tabs */}
          <div className="glass-panel rounded-xl border border-outline-variant/30 p-4">
            <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
              Internal Notes (Doctor Only)
            </label>
            <input
              type="text"
              {...register('internalNotes')}
              placeholder="Private findings not visible on client receipts"
              className="w-full px-3 py-2 bg-surface-container/20 border border-outline-variant rounded-xl text-xs text-on-surface outline-none"
            />
          </div>

          {/* STICKY FOOTER: nav + complete */}
          <div className="fixed bottom-0 left-0 right-0 md:left-64 z-40 p-4 bg-surface/95 backdrop-blur-md border-t border-outline-variant/40">
            <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={goToPrevSoapTab}
                  disabled={activeSoapTab === 'S'}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-outline-variant text-on-surface disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-[10px] text-on-surface-variant font-semibold hidden sm:inline">
                  {getSoapTabTitle(activeSoapTab)}
                </span>
                <button
                  type="button"
                  onClick={() => void goToNextSoapTab()}
                  disabled={activeSoapTab === 'Rx' || savingDraft}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-outline-variant text-on-surface disabled:opacity-40"
                >
                  Next
                </button>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {consultPausedAt ? (
                  <button
                    type="button"
                    onClick={handleResumeConsult}
                    disabled={pauseLoading || isSubmitting}
                    className="border border-emerald-500/40 text-emerald-400 py-2.5 px-4 rounded-2xl font-bold text-sm flex items-center gap-2 hover:bg-emerald-500/10 disabled:opacity-60"
                  >
                    {pauseLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    Resume
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowPauseModal(true)}
                    disabled={pauseLoading || isSubmitting}
                    className="border border-violet-500/40 text-violet-300 py-2.5 px-4 rounded-2xl font-bold text-sm flex items-center gap-2 hover:bg-violet-500/10 disabled:opacity-60"
                  >
                    <Pause className="w-4 h-4" />
                    Pause
                  </button>
                )}
              <button
                type="submit"
                disabled={isSubmitting || Boolean(consultPausedAt)}
                className="bg-primary hover:opacity-90 text-white py-2.5 px-6 rounded-2xl font-bold text-sm shadow-premium flex items-center gap-2 transition-all disabled:opacity-75"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Finalizing consult…
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Complete Consultation & Discharge
                  </>
                )}
              </button>
              </div>
            </div>
          </div>

        </form>

      <CatalogItemQuickAddModal
        open={quickAddOpen}
        onClose={() => {
          setQuickAddOpen(false);
          setQuickAddTarget(null);
        }}
        categories={categories}
        activeBranchId={activeBranchId}
        defaultType={quickAddType}
        onSuccess={(product) => {
          setLocalProducts((prev) => {
            if (prev.some((p) => p.id === product.id)) return prev;
            return [
              ...prev,
              {
                id: product.id,
                name: product.name,
                type: product.type,
                sellingPrice: product.sellingPrice,
              },
            ];
          });
          if (quickAddTarget?.kind === 'product') {
            handleSelectProduct(quickAddTarget.index, product.id);
          }
        }}
      />

    </div>
    </div>
  );
}

