import type { NextConfig } from "next";
import { resolve } from "path";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    "preview-chat-9a896c83-4103-42a4-bd75-fac98488b50b.space-z.ai",
  ],
  // Use webpack so resolve.alias works for z-ai-web-dev-sdk stub
  // Turbopack doesn't support resolve.alias yet
  webpack: (config) => {
    config.resolve = {
      ...config.resolve,
      alias: {
        ...config.resolve.alias,
        'z-ai-web-dev-sdk': resolve('./src/ai-sdk-stub/index.ts'),
      },
    };
    return config;
  },
};

export default nextConfig;
