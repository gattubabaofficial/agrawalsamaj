import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow HMR connection from local network hosts
  allowedDevOrigins: ["192.168.1.5", "192.168.31.12", "localhost", "127.0.0.1"],
};

export default nextConfig;
