/** Normalize a PostgREST one-to-one embed (object) or legacy array shape. */
export function normalizeOneToOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}
