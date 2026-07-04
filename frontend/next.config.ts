import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow local network IP to connect to the dev server (including HMR WebSocket)
  // Without this, Next.js rejects the WebSocket upgrade from non-localhost origins,
  // causing ERR_INVALID_HTTP_RESPONSE which blocks React hydration on network IP access.
  allowedDevOrigins: ["192.168.1.38", "10.254.189.66"],
  turbopack: {
    root: process.cwd(),
  },
  async rewrites() {
    // Determine backend URL from NEXT_PUBLIC_API_URL or default
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
    const backendUrl = apiUrl.replace('/api/v1', '');
    return [
      {
        source: '/uploads/:path*',
        destination: `${backendUrl}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
