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
export const safeFetch = async (
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
  const res = await fetch(input, init);

  // Bulletproof json() wrapper: catches non-JSON text responses (e.g. 500 "Internal Server Error")
  const originalText = res.text.bind(res);
  res.json = async () => {
    try {
      const text = await originalText();
      if (!text || !text.trim()) return {};
      try {
        return JSON.parse(text);
      } catch {
        return { detail: text.trim(), error: text.trim() };
      }
    } catch {
      return { detail: `Server error (${res.status})` };
    }
  };

  return res;
};

/**
 * Safely extracts a string error message from API responses or exceptions.
 * Prevents Pydantic validation error objects ({type, loc, msg, input, ctx})
 * from being directly passed into React JSX children, which causes React runtime errors.
 */
export const formatErrorMessage = (detail: any, fallback = "An error occurred"): string => {
  if (!detail) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          return item.msg || item.message || (item.loc ? `${item.loc.join(".")}: ${item.msg}` : null);
        }
        return String(item);
      })
      .filter(Boolean);
    return messages.length > 0 ? messages.join(", ") : fallback;
  }
  if (typeof detail === "object") {
    if (detail.msg) return String(detail.msg);
    if (detail.message) return String(detail.message);
    if (detail.detail) return formatErrorMessage(detail.detail, fallback);
    try {
      return JSON.stringify(detail);
    } catch {
      return fallback;
    }
  }
  return String(detail);
};

