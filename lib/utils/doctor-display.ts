type DoctorProfile = {
  first_name?: string | null;
  last_name?: string | null;
};

/** Formats attending doctor for PDFs and UI; never invents placeholder names. */
export function formatAttendingDoctor(profile: DoctorProfile | null | undefined): string {
  if (!profile?.first_name && !profile?.last_name) return 'Not assigned';
  return `Dr. ${[profile.first_name, profile.last_name].filter(Boolean).join(' ')}`;
}

/** For prescription PDF where doctorName is rendered with a separate "Dr." prefix. */
export function formatDoctorNamePlain(profile: DoctorProfile | null | undefined): string {
  if (!profile?.first_name && !profile?.last_name) return 'Not assigned';
  return [profile.first_name, profile.last_name].filter(Boolean).join(' ');
}
