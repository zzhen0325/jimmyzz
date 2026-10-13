import "server-only";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { imageSize } from "image-size";
import { cloudflareStorage } from "./cloudflare-storage";
import { contentDirectory } from "./content-store";
import type { Asset } from "./projects-config";

/** Older galleries and CMS uploads may not include their intrinsic dimensions. */
export async function resolveCaseImageMetadata(assets: Asset[]): Promise<Asset[]> {
  return Promise.all(assets.map(async (asset) => {
    if (asset.width && asset.height) return asset;
    if (!asset.src.startsWith('/assets/') && !asset.src.startsWith('/media/')) return asset;
    const storage = cloudflareStorage();
    if (storage) {
      try {
        const source = asset.src.startsWith('/media/')
          ? await storage.CONTENT_BUCKET.get(`uploads/${asset.src.slice(7)}`)
          : await storage.ASSETS.fetch(new URL(asset.src, 'https://zzmax.icu').href);
        if (!source || ('ok' in source && !source.ok)) return asset;
        const { width, height } = imageSize(new Uint8Array(await source.arrayBuffer()));
        return width && height ? { ...asset, width, height } : asset;
      } catch { return asset; }
    }
    const root = asset.src.startsWith("/assets/")
      ? path.join(process.cwd(), "public")
      : asset.src.startsWith("/media/")
        ? path.join(contentDirectory, "uploads")
        : null;
    if (!root) return asset;
    const relative = asset.src.startsWith("/media/") ? asset.src.slice(7) : asset.src.slice(1);
    const filename = path.resolve(root, relative);
    if (!filename.startsWith(path.resolve(root) + path.sep)) return asset;
    try {
      const { width, height } = imageSize(await readFile(filename));
      return width && height ? { ...asset, width, height } : asset;
    } catch {
      // Keep the original URL usable if a file is not available to the server.
      return asset;
    }
  }));
}
