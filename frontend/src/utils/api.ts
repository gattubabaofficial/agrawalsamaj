/**
 * Dynamic API Base URL resolution.
 *
 * On the client side, all API calls use a relative path `/api/v1`.
 * These are handled by the Next.js App Router catch-all route at
 * src/app/api/v1/[...path]/route.ts which proxies them to FastAPI
 * entirely SERVER-SIDE — meaning the browser never directly contacts
 * localhost:8000 and browser extensions cannot intercept the calls.
 */
export const getApiBaseUrl = (): string => {
  // Allow manual override via environment variables (for production deployments)
  if (process.env.NEXT_PUBLIC_API_URL) {
    let url = process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, "");
    if (!url.endsWith("/api/v1")) {
      url += "/api/v1";
    }
    return url;
  }

  // Both client and server: use the relative path.
  // - Client-side: proxied by Next.js App Router route to FastAPI
  // - Server-side (SSR): Next.js calls its own route handler internally
  return "/api/v1";
};

export const getWsApiBaseUrl = (): string => {
  if (typeof window !== "undefined") {
    const host =
      window.location.hostname === "0.0.0.0"
        ? `localhost:${window.location.port || "3000"}`
        : window.location.host;
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    return `${protocol}://${host}/api/v1`;
  }
  return "ws://localhost:8000/api/v1";
};

/**
 * Drop-in replacement for fetch() that always uses relative URLs.
 * Since all /api/v1/* requests are handled server-side by Next.js,
 * browser extensions cannot intercept or block them.
 */
export const safeFetch = (
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> => {
  if (typeof window !== "undefined") {
    const urlStr = typeof input === "string" ? input : input.toString();
    if (urlStr.startsWith("http://") || urlStr.startsWith("https://")) {
      try {
        const parsed = new URL(urlStr);
        if (parsed.port === "8000" || parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
          input = parsed.pathname + parsed.search;
        }
      } catch {}
    }
  }
  return fetch(input, init);
};
