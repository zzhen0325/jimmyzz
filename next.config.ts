import type { NextConfig } from "next";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

// Content versions survive deployments, but change whenever an asset changes.
// Leave development URLs uncached so artists can replace files while iterating.
const homeAssetVersions: Record<string, string> = {};
const homeAssetSizes: Record<string, number> = {};
{
  for (const directory of ["models", "environments", "images/floating", "loading"]) {
    const root = path.join(process.cwd(), "public/assets", directory);
    for (const file of readdirSync(root, { recursive: true, withFileTypes: true })) {
      if (!file.isFile() || !/\.(glb|gltf|bin|png|jpe?g|webp|hdr|exr)$/i.test(file.name)) continue;
      const absolute = path.join(file.parentPath, file.name);
      const url = "/" + path.relative(path.join(process.cwd(), "public"), absolute).split(path.sep).join("/");
      homeAssetSizes[url] = statSync(absolute).size;
      if (process.env.NODE_ENV === "production") homeAssetVersions[url] = createHash("sha256").update(readFileSync(absolute)).digest("hex").slice(0, 16);
    }
  }
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: { qualities: [75, 90] },
  experimental: { proxyClientMaxBodySize: "32mb" },
  turbopack: { root: process.cwd() },
  env: { NEXT_PUBLIC_HOME_ASSET_SIZES: JSON.stringify(homeAssetSizes), NEXT_PUBLIC_HOME_ASSET_VERSIONS: JSON.stringify(homeAssetVersions) },
  async headers() {
    const coverHeaders = [{
      source: '/assets/home-covers/:path*',
      headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
    }];
    return [...coverHeaders, ...Object.entries(homeAssetVersions).map(([source, version]) => ({
      source,
      has: [{ type: "query" as const, key: "assetVersion", value: version }],
      headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
    }))];
  },
};

export default nextConfig;
