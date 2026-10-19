import 'server-only';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { cloudflareStorage } from './cloudflare-storage';
import { contentDirectory } from './content-store';
import { MEDIA_IMAGE_QUALITY, mediaImageKey } from './media-image';

const headers = { 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' };
// Coalesce requests for the same cold variant within this process/isolate.
const pending = new Map<string, Promise<Uint8Array>>();
async function createVariant(name: string, width: number): Promise<Uint8Array> {
  const key = mediaImageKey(name, width);
  const storage = cloudflareStorage();
  if (storage) {
    const cached = await storage.CONTENT_BUCKET.get(key);
    if (cached) return new Uint8Array(await cached.arrayBuffer());
    const source = await storage.CONTENT_BUCKET.get(`uploads/${name}`);
    if (!source) throw new Error('Missing source image');
    if (!storage.IMAGES || source.size > 20 * 1024 * 1024) throw new Error('Image transformation unavailable');
    const result = await storage.IMAGES.input(source.body)
      .transform({ width, fit: 'scale-down' })
      .output({ format: 'image/webp', quality: MEDIA_IMAGE_QUALITY, anim: true });
    const data = new Uint8Array(await result.response().arrayBuffer());
    await storage.CONTENT_BUCKET.put(key, data, { httpMetadata: { contentType: 'image/webp', cacheControl: headers['Cache-Control'] } });
    return data;
  }
  const filename = path.join(contentDirectory, key);
  try { return new Uint8Array(await readFile(filename)); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  const source = await readFile(path.join(contentDirectory, 'uploads', name));
  // Only Node serves this branch. Keep the native addon out of the Worker
  // bundle; Workers use the IMAGES binding above instead.
  const localImageModule = 'sharp';
  const { default: sharp } = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ localImageModule) as { default: typeof import('sharp') };
  const data = await sharp(source, { animated: true, limitInputPixels: 100_000_000 })
    .rotate().resize({ width, withoutEnlargement: true }).webp({ quality: MEDIA_IMAGE_QUALITY }).toBuffer();
  await mkdir(path.dirname(filename), { recursive: true });
  const temp = `${filename}.${randomUUID()}.tmp`;
  await writeFile(temp, data);
  await rename(temp, filename);
  return new Uint8Array(data);
}

export async function mediaImageResponse(request: Request, name: string, width: number) {
  const key = mediaImageKey(name, width);
  let job = pending.get(key);
  if (!job) {
    job = createVariant(name, width);
    pending.set(key, job);
  }
  try { return new Response(new Uint8Array(await job), { headers }); }
  catch (error) {
    console.error('Media image variant failed', name, width, error);
    // A transient Images failure must not turn into a year-long cached original.
    return new Response(null, { status: 307, headers: { Location: new URL(`/media/${name}`, request.url).href, 'Cache-Control': 'no-store' } });
  } finally { if (pending.get(key) === job) pending.delete(key); }
}
