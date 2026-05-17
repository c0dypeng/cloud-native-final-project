import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui", "@workspace/api-contracts"],
  reactCompiler: true,
  output: "standalone",
  async rewrites() {
    return [
      // Proxy /api/* to the API server so the browser cookie (set on web's
      // origin) is forwarded same-origin.
      { source: "/api/:path*", destination: `${API_URL}/api/:path*` },
    ];
  },
  experimental: {
    turbopackFileSystemCacheForDev: true,
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default withNextIntl(nextConfig);
