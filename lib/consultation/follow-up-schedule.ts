export type FollowUpMode = 'none' | 'offset' | 'consecutive';

export type FollowUpScheduleInput = {
  mode: FollowUpMode;
  offsetDays: number[];
  consecutive?: { count: number; startDate: string };
};

export type FollowUpAppointmentPreview = {
  preferredDate: string;
  label: string;
};

function addDaysToDateString(baseDate: string, days: number): string {
  const d = new Date(`${baseDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDisplayDate(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function computeFollowUpPreviews(
  schedule: FollowUpScheduleInput,
  baseDate: string
): FollowUpAppointmentPreview[] {
  if (schedule.mode === 'none') return [];

  if (schedule.mode === 'offset') {
    return schedule.offsetDays.map((days) => {
      const preferredDate = addDaysToDateString(baseDate, days);
      return {
        preferredDate,
        label: `Follow-up after ${days} day${days === 1 ? '' : 's'} (${formatDisplayDate(preferredDate)})`,
      };
    });
  }

  if (schedule.mode === 'consecutive' && schedule.consecutive) {
    const { count, startDate } = schedule.consecutive;
    const previews: FollowUpAppointmentPreview[] = [];
    for (let i = 0; i < count; i++) {
      const preferredDate = addDaysToDateString(startDate, i);
      previews.push({
        preferredDate,
        label: `Follow-up Day ${i + 1} (${formatDisplayDate(preferredDate)})`,
      });
    }
    return previews;
  }

  return [];
}

export function followUpPreviewsToDates(previews: FollowUpAppointmentPreview[]): string[] {
  return [...new Set(previews.map((p) => p.preferredDate))];
}

export function defaultConsecutiveStartDate(baseDate: string): string {
  return addDaysToDateString(baseDate, 1);
}

export function offsetDatePreview(baseDate: string, days: number): string {
  return formatDisplayDate(addDaysToDateString(baseDate, days));
}
