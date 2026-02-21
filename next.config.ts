import type { NextConfig } from "next";

const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb', // Increase to 4mb or more
    },
  },
};

export default nextConfig;
