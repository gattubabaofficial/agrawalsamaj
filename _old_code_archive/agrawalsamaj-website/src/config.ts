/**
 * Generates the backend API URL dynamically based on the current hostname.
 * This ensures requests go to localhost when accessed via localhost,
 * and to the network IP (e.g. 192.168.x.x) when accessed over the local network.
 */
export const getApiUrl = (path: string = "") => {
  let baseUrl = "http://127.0.0.1:8000";
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    // Map 'localhost' to '127.0.0.1' to bypass Windows IPv6 resolution issues (where localhost resolves to [::1])
    const resolvedHost = hostname === "localhost" ? "127.0.0.1" : hostname;
    baseUrl = `http://${resolvedHost}:8000`;
  }
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
};
