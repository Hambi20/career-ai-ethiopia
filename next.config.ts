import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    "preview-chat-9a896c83-4103-42a4-bd75-fac98488b50b.space-z.ai",
  ],
  webpack: (config, { isServer }) => {
    // z-ai-web-dev-sdk only exists in sandbox — stub it out for Vercel builds
    if (isServer) {
      config.resolve = config.resolve || {};
      config.resolve.fallback = { ...config.resolve.fallback };
    }
    return config;
  },
  // Tell Next.js to externalize this module so it's not bundled
  experimental: {
    serverComponentsExternalPackages: ['z-ai-web-dev-sdk'],
  },
};

export default nextConfig;
