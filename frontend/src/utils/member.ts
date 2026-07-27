/**
 * Parentage / relation label for a member.
 *
 * The imported member list stores a "Father's / Husband's" name. A few rows carry
 * an explicit relation marker in front of the name — "W/o" (wife of), "S/o" (son of)
 * or "D/o" (daughter of). We honour that marker when it is present and show ONLY it.
 * When no marker is written, we do NOT guess a relation — the plain name is shown.
 *
 *   "W/o Rajesh Mital"   -> "W/o Rajesh Mital"
 *   "D/O Dinesh Agarwal" -> "D/o Dinesh Agarwal"
 *   "Narayan Goyal"      -> "Narayan Goyal"   (no marker → no prefix)
 *   null / ""            -> null
 */
const RELATION_MARKER = /^\s*(w\s*[/.]?\s*o|s\s*[/.]?\s*o|d\s*[/.]?\s*o|wife\s+of|son\s+of|daughter\s+of)\b\.?\s*(.*)$/i;

export function formatParentage(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const match = trimmed.match(RELATION_MARKER);
  if (!match) return trimmed; // nothing written → show the name as-is, no prefix

  const marker = match[1].toLowerCase();
  const rest = match[2].trim();
  const prefix = marker.startsWith("w") ? "W/o" : marker.startsWith("d") ? "D/o" : "S/o";
  return rest ? `${prefix} ${rest}` : prefix;
}
