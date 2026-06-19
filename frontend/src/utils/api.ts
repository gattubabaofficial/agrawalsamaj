/**
 * Dynamic API Base URL resolution.
 * Automatically resolves to the current browser hostname (useful when testing on local IP addresses like 192.168.x.x)
 * or falls back to an environment variable / localhost default.
 */
export const getApiBaseUrl = (): string => {
  // Allow manual override via environment variables
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // Client-side dynamic hostname checking
  if (typeof window !== "undefined") {
    // Construct the backend URL using the browser's hostname on port 8000
    return `http://${window.location.hostname}:8000/api/v1`;
  }

  // Fallback for Server-Side Rendering (SSR)
  return "http://localhost:8000/api/v1";
};
