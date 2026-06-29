import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    "preview-chat-9a896c83-4103-42a4-bd75-fac98488b50b.space-z.ai",
  ],
};

export default nextConfig;
