import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow local network IP to connect to the dev server (including HMR WebSocket)
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.16.*.*"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
