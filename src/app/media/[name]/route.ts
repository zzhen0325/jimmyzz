import { contentDirectory } from '@/lib/content-store';
import { stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import { parseMediaRange } from '@/lib/media-range';
import path from 'node:path';
import { cloudflareStorage } from '@/lib/cloudflare-storage';
import type { Headers as CloudflareHeaders } from '@cloudflare/workers-types';
import { MEDIA_IMAGE_WIDTHS, MEDIA_IMAGE_VERSION, isUploadedImage } from '@/lib/media-image';
import { mediaImageResponse } from '@/lib/media-image-response';
export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!/^[a-f0-9-]+\.(jpg|png|webp|gif|avif|mp4|webm|mov)$/.test(name)) return new Response(null, { status: 404 });
  const query = new URL(_request.url).searchParams;
  if (query.has('w')) {
    const width = Number(query.get('w'));
    if (!isUploadedImage(`/media/${name}`) || !MEDIA_IMAGE_WIDTHS.some(size => size === width) || query.get('v') !== MEDIA_IMAGE_VERSION) {
      return new Response('Invalid image variant', { status: 400 });
    }
    return mediaImageResponse(_request, name, width);
  }
  const storage = cloudflareStorage();
  if (storage) {
    const object = await storage.CONTENT_BUCKET.get(`uploads/${name}`, { range: _request.headers as unknown as CloudflareHeaders });
    if (!object) return new Response(null, { status: 404 });
    const headers = new Headers({
      'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Accept-Ranges': 'bytes',
      'ETag': object.httpEtag,
    });
    const range = object.range;
    if (_request.headers.has('range') && range && 'offset' in range && 'length' in range && range.offset !== undefined && range.length !== undefined) {
      headers.set('Content-Range', `bytes ${range.offset}-${range.offset + range.length - 1}/${object.size}`);
      headers.set('Content-Length', String(range.length));
      return new Response(object.body as unknown as ReadableStream, { status: 206, headers });
    }
    headers.set('Content-Length', String(object.size));
    return new Response(object.body as unknown as ReadableStream, { headers });
  }
  try {
    const filename = path.join(contentDirectory, 'uploads', name);
    const size = (await stat(filename)).size;
    const rangeHeader = _request.headers.get('range');
    const range = rangeHeader ? parseMediaRange(rangeHeader, size) : null;
    if (rangeHeader && !range) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
    // Send the first chunk immediately, including open-ended browser ranges.
    // Buffering an entire video here delays playback and multiplies memory use.
    const stream = Readable.toWeb(createReadStream(filename, range ?? undefined)) as ReadableStream<Uint8Array>;
    const length = range ? range.end - range.start + 1 : size;
    const types: Record<string,string> = { jpg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',avif:'image/avif',mp4:'video/mp4',webm:'video/webm',mov:'video/quicktime' };
    return new Response(stream, { status: range ? 206 : 200, headers: { 'Accept-Ranges': 'bytes', 'Content-Length': String(length), ...(range ? { 'Content-Range': `bytes ${range.start}-${range.end}/${size}` } : {}), 'Content-Type': types[name.split('.').pop()!], 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' } });
  } catch { return new Response(null, { status: 404 }); }
}
