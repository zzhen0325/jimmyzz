import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import path from 'node:path';
import manifest from '@/lib/case-media-manifest.json';
import { cloudflareStorage } from '@/lib/cloudflare-storage';
import { parseMediaRange } from '@/lib/media-range';

// Workers Assets may ignore Range. Serve explicit byte ranges for browser seeking.
export async function GET(request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!/^[a-f0-9]{24}\.mp4$/.test(name)) return new Response(null, { status: 404 });
  const url = `/assets/case-media/${name}`;
  const entry = Object.values(manifest).find(item => 'src' in item && item.src === url);
  if (!entry || !('bytes' in entry)) return new Response(null, { status: 404 });
  const size = entry.bytes;
  const rangeHeader = request.headers.get('range');
  const range = rangeHeader ? parseMediaRange(rangeHeader, size) : null;
  if (rangeHeader && !range) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  const headers = new Headers({ 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes', 'Cache-Control': 'public, max-age=31536000, immutable', 'Content-Length': String(range ? range.end - range.start + 1 : size), 'ETag': `"${name}"` });
  if (range) headers.set('Content-Range', `bytes ${range.start}-${range.end}/${size}`);
  const storage = cloudflareStorage();
  let body: ReadableStream<Uint8Array>;
  if (storage) {
    const source = await storage.ASSETS.fetch(new URL(url, request.url));
    if (!source.ok || !source.body) return new Response(null, { status: 502 });
    if (!range) body = source.body as unknown as ReadableStream<Uint8Array>;
    else {
      const reader = source.body.getReader();
      let offset = 0;
      body = new ReadableStream<Uint8Array>({
        async pull(controller) {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) { controller.close(); return; }
              const start = Math.max(0, range.start - offset);
              const end = Math.min(value.length, range.end + 1 - offset);
              offset += value.length;
              if (end > start) controller.enqueue(value.slice(start, end));
              if (offset > range.end) { controller.close(); await reader.cancel(); return; }
              if (end > start) return;
            }
          } catch (error) { controller.error(error); }
        },
        cancel(reason) { return reader.cancel(reason); },
      });
    }
  } else {
    body = Readable.toWeb(createReadStream(path.join(process.cwd(), 'public', url), range ?? undefined)) as ReadableStream<Uint8Array>;
  }
  return new Response(body, { status: range ? 206 : 200, headers });
}
