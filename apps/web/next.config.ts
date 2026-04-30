import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui"],
  reactCompiler: true,
  output: "standalone",
  turbopack: {
    root: path.resolve(import.meta.dirname, "../.."),
  },
  experimental: {
    turbopackFileSystemCacheForDev: true,
    serverActions: {
      bodySizeLimit: "10mb",
    },
    // NOTE: cacheComponents is disabled due to compatibility issues with cookie-based auth
    // The feature is still experimental in Next.js 16 and causes build errors when accessing cookies()
    // We still get major performance benefits from:
    // 1. Dynamic imports (50-100KB bundle reduction)
    // 2. Suspense boundaries (streaming SSR)
    // 3. React Compiler (automatic optimizations)
    // 4. Turbopack (faster builds)
    // 5. updateTag for cache invalidation
    // cacheComponents: true,
  },
};

export default nextConfig;
