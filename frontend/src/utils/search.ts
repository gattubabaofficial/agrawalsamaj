/**
 * Multi-term, multi-field search.
 *
 * The rule, taken from the member directory and reused everywhere: split the
 * query on whitespace and require EVERY term to appear in SOME field. That is
 * what lets "rajesh goyal" match "Rajesh Kumar Goyal", and "rajesh shipra"
 * match a name in one field and an area in another.
 *
 * Matching a whole query as one substring — the approach this replaces — fails
 * both of those cases.
 */

/** Lower-cased concatenation of the named fields. Missing values are skipped. */
export function searchableText(record: unknown, fields: string[]): string {
  if (!record || typeof record !== "object") return "";
  const source = record as Record<string, unknown>;

  return fields
    .map((field) => {
      const value = source[field];
      if (value === null || value === undefined) return "";
      if (typeof value === "string" || typeof value === "number") return String(value);
      return "";
    })
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/** True when every whitespace-separated term appears in at least one field. */
export function matchesSearch(
  record: unknown,
  query: string,
  fields: string[],
): boolean {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;

  const haystack = searchableText(record, fields);
  return terms.every((term) => haystack.includes(term));
}

/** Non-mutating filter over `records` using `matchesSearch`. */
export function filterBySearch<T>(
  records: T[],
  query: string,
  fields: string[],
): T[] {
  if (!query.trim()) return [...records];
  return records.filter((record) => matchesSearch(record, query, fields));
}
