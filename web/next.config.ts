import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/vi/settings/general", destination: "/settings/general", permanent: false },
      { source: "/vi/forbidden", destination: "/forbidden", permanent: false },
    ];
  },
};

export default nextConfig;
