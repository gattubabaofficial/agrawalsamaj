import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow local network IP to connect to the dev server (including HMR WebSocket)
  // Without this, Next.js rejects the WebSocket upgrade from non-localhost origins,
  // causing ERR_INVALID_HTTP_RESPONSE which blocks React hydration on network IP access.
  // Wildcards cover the private LAN ranges so a DHCP address change does not
  // break phone/tablet testing. Dev-only — this has no effect on `next build`.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.16.*.*"],
  turbopack: {
    root: process.cwd(),
  },
  async rewrites() {
    // Proxy backend traffic through the Next origin so the whole app is served
    // from ONE origin. This is what lets `next dev --experimental-https` work:
    // the browser sees only https://<host>:3000, so there is no mixed content
    // and no CORS — and the QR scanner gets the secure context that
    // navigator.mediaDevices requires.
    //
    // Rewrites run server-side on the Next process, so the hop to the backend
    // stays plain HTTP over loopback and the backend needs no TLS of its own.
    const backendUrl = (
      process.env.BACKEND_ORIGIN || "http://localhost:8000"
    ).replace(/\/$/, "");

    return [
      { source: '/api/v1/:path*', destination: `${backendUrl}/api/v1/:path*` },
      // Pass QR PNGs and receipt PDFs.
      { source: '/static/:path*', destination: `${backendUrl}/static/:path*` },
      { source: '/uploads/:path*', destination: `${backendUrl}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
