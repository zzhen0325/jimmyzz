import { contentDirectory } from '@/lib/content-store';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { cloudflareStorage } from '@/lib/cloudflare-storage';
import type { Headers as CloudflareHeaders } from '@cloudflare/workers-types';
export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!/^[a-f0-9-]+\.(jpg|png|webp|gif|avif|mp4|webm|mov)$/.test(name)) return new Response(null, { status: 404 });
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
    const data = await readFile(path.join(contentDirectory, 'uploads', name));
    const types: Record<string,string> = { jpg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',avif:'image/avif',mp4:'video/mp4',webm:'video/webm',mov:'video/quicktime' };
    return new Response(data, { headers: { 'Content-Type': types[name.split('.').pop()!], 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' } });
  } catch { return new Response(null, { status: 404 }); }
}
