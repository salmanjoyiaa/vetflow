export type PetSpeciesKey = 'dog' | 'cat' | 'bird' | 'rabbit' | 'other';

const SPECIES_ALIASES: Record<string, PetSpeciesKey> = {
  dog: 'dog',
  dogs: 'dog',
  canine: 'dog',
  puppy: 'dog',
  cat: 'cat',
  cats: 'cat',
  feline: 'cat',
  kitten: 'cat',
  bird: 'bird',
  birds: 'bird',
  avian: 'bird',
  parrot: 'bird',
  rabbit: 'rabbit',
  rabbits: 'rabbit',
  bunny: 'rabbit',
  hare: 'rabbit',
};

export function resolvePetSpeciesKey(species: string | null | undefined): PetSpeciesKey {
  if (!species) return 'other';
  const normalized = species.trim().toLowerCase();
  return SPECIES_ALIASES[normalized] ?? 'other';
}

export function getPetSpeciesAvatarSrc(species: string | null | undefined): string {
  const key = resolvePetSpeciesKey(species);
  return `/pets/${key}.svg`;
}

export function computePetAgeLabel(dateOfBirth: string | null): string | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - dob.getFullYear();
  let months = now.getMonth() - dob.getMonth();
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years < 0) return null;
  if (years === 0) return `${months} mo`;
  if (months === 0) return `${years} yr${years === 1 ? '' : 's'}`;
  return `${years} yr${years === 1 ? '' : 's'} ${months} mo`;
}

export function formatVisitStatusLabel(status: string | null): { label: string; tone: 'stable' | 'active' | 'attention' } {
  if (!status) return { label: 'Unknown', tone: 'attention' };
  const s = status.toLowerCase();
  if (s === 'completed' || s === 'ready_for_checkout') {
    return { label: 'Stable', tone: 'stable' };
  }
  if (s === 'in_consultation' || s === 'checked_in' || s === 'in_progress') {
    return { label: 'In treatment', tone: 'active' };
  }
  return { label: status.replace(/_/g, ' '), tone: 'attention' };
}
