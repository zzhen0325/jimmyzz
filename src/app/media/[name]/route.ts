import { contentDirectory } from '@/lib/content-store';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!/^[a-f0-9-]+\.(jpg|png|webp|gif|avif|mp4|webm|mov)$/.test(name)) return new Response(null, { status: 404 });
  try {
    const data = await readFile(path.join(contentDirectory, 'uploads', name));
    const types: Record<string,string> = { jpg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',avif:'image/avif',mp4:'video/mp4',webm:'video/webm',mov:'video/quicktime' };
    return new Response(data, { headers: { 'Content-Type': types[name.split('.').pop()!], 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' } });
  } catch { return new Response(null, { status: 404 }); }
}
