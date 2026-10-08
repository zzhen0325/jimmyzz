import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: { proxyClientMaxBodySize: "32mb" },
  turbopack: { root: process.cwd() },
};

export default nextConfig;
