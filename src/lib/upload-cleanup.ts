import 'server-only';
import { unlink, rm } from 'node:fs/promises';
import path from 'node:path';
import type { Content } from './content';
import { contentDirectory, readContent } from './content-store';
import { cloudflareStorage } from './cloudflare-storage';
import { removedUploads, uploadedFileName } from './upload-references';
import { MEDIA_IMAGE_WIDTHS, mediaImageKey } from './media-image';

export async function cleanupRemovedUploads(previous: Content, candidates: string[]): Promise<string[]> {
  // Check the persisted content, including references from other projects.
  const removed = removedUploads(previous, await readContent(), candidates);
  const storage = cloudflareStorage();
  const failed: string[] = [];
  for (const src of removed) {
    const name = uploadedFileName(src)!;
    try {
      if (storage) {
        await storage.CONTENT_BUCKET.delete(MEDIA_IMAGE_WIDTHS.map(width => mediaImageKey(name, width)));
        await storage.CONTENT_BUCKET.delete(`uploads/${name}`);
      } else {
        await rm(path.dirname(path.join(contentDirectory, mediaImageKey(name, 640))), { recursive: true, force: true });
        await unlink(path.join(contentDirectory, 'uploads', name));
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error('Failed to remove uploaded resource', src, error);
        failed.push(src);
      }
    }
  }
  return failed;
}
