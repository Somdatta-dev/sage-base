import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  // Fix Server Action errors during deployments
  generateBuildId: async () => {
    return process.env.BUILD_ID || `build-${Date.now()}`;
  },

  // Disable static optimization to prevent stale server actions
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
};

export default nextConfig;
