/**
 * Resolve a stored media path to an absolute URL.
 *
 * Uploads are stored as server-root-relative paths ("/uploads/profiles/x.jpg",
 * "/static/profile_photos/y.jpg"). Rendering those directly resolves them
 * against the Next.js origin rather than the API's, which 404s.
 *
 * Media origin is configured via NEXT_PUBLIC_MEDIA_URL (e.g. https://api.agrasamaj.in).
 * Use this for every stored media path. It is the only correct convention.
 */

export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;

  const trimmed = path.trim();
  if (!trimmed) return null;

  // Already absolute, or an inline payload — nothing to resolve.
  if (/^(https?:\/\/|data:|blob:)/i.test(trimmed)) return trimmed;

  const origin = (process.env.NEXT_PUBLIC_MEDIA_URL || "").replace(/\/+$/, "");
  if (!origin && typeof window !== "undefined" && process.env.NODE_ENV !== "test") {
    console.warn("NEXT_PUBLIC_MEDIA_URL is not set; media URLs may resolve incorrectly.");
  }

  const suffix = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;

  return `${origin}${suffix}`;
}
