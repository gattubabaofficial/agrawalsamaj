/**
 * Resolve a stored media path to an absolute URL.
 *
 * Uploads are stored as server-root-relative paths ("/uploads/profiles/x.jpg",
 * "/static/profile_photos/y.jpg"). Rendering those directly resolves them
 * against the Next.js origin rather than the API's, which 404s — that was the
 * directory-photo bug. Media is served from the API root, NOT from /api/v1,
 * so the API-version suffix is stripped before joining.
 *
 * Use this for every stored media path. It is the only correct convention.
 */
import { getApiBaseUrl } from "./api";

export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;

  const trimmed = path.trim();
  if (!trimmed) return null;

  // Already absolute, or an inline payload — nothing to resolve.
  if (/^(https?:\/\/|data:|blob:)/i.test(trimmed)) return trimmed;

  const origin = getApiBaseUrl().replace(/\/api\/v\d+\/?$/, "");
  const suffix = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;

  return `${origin}${suffix}`;
}
