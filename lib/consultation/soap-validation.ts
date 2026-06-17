import type { SoapTab } from '@/components/consultation/SoapTabBar';
import { SOAP_TAB_ORDER } from '@/components/consultation/SoapTabBar';
import type { CompleteConsultationInput } from '@/lib/validations/schemas';

export type SoapValidationContext = {
  visitType: 'standard' | 'lab' | 'surgery';
  labOrderCount: number;
  noPrescriptionNeeded: boolean;
};

export type SoapValidationResult = {
  tab: SoapTab;
  message: string;
} | null;

function hasVital(values: CompleteConsultationInput): boolean {
  return (
    (values.temperatureC != null && !Number.isNaN(values.temperatureC)) ||
    (values.heartRateBpm != null && !Number.isNaN(values.heartRateBpm)) ||
    (values.respiratoryRate != null && !Number.isNaN(values.respiratoryRate)) ||
    (values.weightKg != null && !Number.isNaN(values.weightKg))
  );
}

function isPrescriptionLineComplete(item: CompleteConsultationInput['prescriptionItems'][number]): boolean {
  return Boolean(
    item.medicineName?.trim() &&
      item.dosage?.trim() &&
      item.frequency?.trim() &&
      item.duration?.trim() &&
      item.quantityRequested > 0
  );
}

export function validateSoapTab(
  tab: SoapTab,
  values: CompleteConsultationInput,
  context: SoapValidationContext
): string | null {
  switch (tab) {
    case 'S':
      if (!values.chiefComplaint?.trim() || values.chiefComplaint.trim().length < 3) {
        return 'Enter a chief complaint (at least 3 characters) before continuing.';
      }
      return null;
    case 'O': {
      const hasExam = Boolean(values.examinationFindings?.trim());
      if (!hasExam && !hasVital(values)) {
        return 'Add examination findings or at least one vital before continuing.';
      }
      return null;
    }
    case 'A':
      if (!values.diagnosis?.trim() || values.diagnosis.trim().length < 3) {
        return 'Enter a diagnosis (at least 3 characters) before continuing.';
      }
      return null;
    case 'P':
      if (!values.treatmentPlan?.trim() || values.treatmentPlan.trim().length < 3) {
        return 'Enter a treatment plan (at least 3 characters) before continuing.';
      }
      return null;
    case 'D':
      if (context.visitType === 'lab' && context.labOrderCount === 0) {
        return 'Lab-focused visit: order at least one lab test before continuing.';
      }
      return null;
    case 'Rx':
      if (context.noPrescriptionNeeded) return null;
      if (!values.prescriptionItems?.length) {
        return 'Add at least one prescription line or check "No prescription needed".';
      }
      for (let i = 0; i < values.prescriptionItems.length; i++) {
        if (!isPrescriptionLineComplete(values.prescriptionItems[i])) {
          return `Complete all required fields for prescription line ${i + 1}.`;
        }
      }
      return null;
    default:
      return null;
  }
}

export function validateAllSoapSteps(
  values: CompleteConsultationInput,
  context: SoapValidationContext
): SoapValidationResult {
  const tabsToValidate = context.noPrescriptionNeeded
    ? SOAP_TAB_ORDER.filter((t) => t !== 'Rx')
    : SOAP_TAB_ORDER;

  for (const tab of tabsToValidate) {
    const message = validateSoapTab(tab, values, context);
    if (message) return { tab, message };
  }
  return null;
}

export function getRequiredFieldsForTab(
  tab: SoapTab,
  context: SoapValidationContext
): string[] {
  switch (tab) {
    case 'S':
      return ['chiefComplaint'];
    case 'O':
      return ['examinationFindings', 'temperatureC', 'heartRateBpm', 'respiratoryRate', 'weightKg'];
    case 'A':
      return ['diagnosis'];
    case 'P':
      return ['treatmentPlan'];
    case 'D':
      return context.visitType === 'lab' ? [] : [];
    case 'Rx':
      if (context.noPrescriptionNeeded) return [];
      return ['prescription-medicine', 'prescription-dosage', 'prescription-frequency', 'prescription-duration', 'prescription-qty'];
    default:
      return [];
  }
}
