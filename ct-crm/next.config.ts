import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Optimistic navigation — prefetches routes aggressively
    optimisticClientCache: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
