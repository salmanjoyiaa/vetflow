export const DEFAULT_SPECIES = ['Dog', 'Cat', 'Bird', 'Rabbit', 'Exotic / Other'] as const;

export const SPECIES_OPTIONS = DEFAULT_SPECIES.map((value) => ({
  value,
  label: value,
}));
