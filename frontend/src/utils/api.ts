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

  // Client-side: talk to our OWN origin and let the Next rewrite in
  // next.config.ts proxy through to the backend. Keeping everything on one
  // origin means no CORS, and — critically — no mixed content when the app is
  // served over HTTPS, which the QR scanner requires for camera access.
  //
  // This stays an absolute URL on purpose: the chat page derives its WebSocket
  // endpoint via `.replace(/^http/, "ws")`, which needs a protocol to be present.
  if (typeof window !== "undefined") {
    // 0.0.0.0 is a bind address, not something a client can connect to.
    const host = window.location.hostname === "0.0.0.0"
      ? `localhost:${window.location.port || "3000"}`
      : window.location.host; // host includes the port
    const protocol = window.location.protocol === "https:" ? "https" : "http";
    return `${protocol}://${host}/api/v1`;
  }

  // Fallback for Server-Side Rendering (SSR)
  return "http://localhost:8000/api/v1";
};
