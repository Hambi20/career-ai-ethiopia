import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    "preview-chat-9a896c83-4103-42a4-bd75-fac98488b50b.space-z.ai",
  ],
  webpack: (config, { isServer }) => {
    // Alias z-ai-web-dev-sdk to our stub so Vercel build doesn't fail
    if (isServer) {
      config.resolve = {
        ...config.resolve,
        alias: {
          ...config.resolve.alias,
          'z-ai-web-dev-sdk': path.resolve('./src/ai-sdk-stub/index.ts'),
        },
      };
    }
    return config;
  },
};

export default nextConfig;
