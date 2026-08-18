/**
 * Supabase returns embedded relations as arrays when the relationship cannot
 * be inferred as one-to-one. The application uses the first matching row for
 * foreign-key relations, so normalize that shape at the server boundary.
 */
export function firstRelation<T>(
  relation: readonly T[] | null | undefined
): T | null;
export function firstRelation<T>(
  relation: T | null | undefined
): T | null;
export function firstRelation<T>(
  relation: T | readonly T[] | null | undefined
): T | null {
  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation as T | null;
}
