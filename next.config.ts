import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    "preview-chat-9a896c83-4103-42a4-bd75-fac98488b50b.space-z.ai",
  ],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // z-ai-web-dev-sdk is only available in the sandbox, not on Vercel
      // Ignore it at build time so Vercel doesn't fail
      config.resolve = config.resolve || {};
      config.resolve.fallback = config.resolve.fallback || {};
      config.resolve.alias = {
        ...config.resolve.alias,
        'z-ai-web-dev-sdk': false,
      };
    }
    return config;
  },
};

export default nextConfig;
