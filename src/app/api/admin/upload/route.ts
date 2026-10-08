import { adminGuard } from '@/lib/admin-auth';
import { contentDirectory } from '@/lib/content-store';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
export async function POST(request: Request) {
  const denied = adminGuard(request); if (denied) return denied;
  try {
    const file = (await request.formData()).get('file');
    if (!(file instanceof File) || file.size === 0 || file.size > 30 * 1024 * 1024) return Response.json({ error: '请选择 30MB 以内的图片或视频' }, { status: 400 });
    const extensions: Record<string,string> = { 'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif','image/avif':'avif','video/mp4':'mp4','video/webm':'webm','video/quicktime':'mov' };
    const extension = extensions[file.type];
    if (!extension) return Response.json({ error: '支持 JPG、PNG、WebP、GIF、AVIF、MP4、WebM、MOV' }, { status: 400 });
    const name = `${randomUUID()}.${extension}`;
    await mkdir(path.join(contentDirectory, 'uploads'), { recursive: true });
    await writeFile(path.join(contentDirectory, 'uploads', name), Buffer.from(await file.arrayBuffer()));
    return Response.json({ src: `/media/${name}` });
  } catch { return Response.json({ error: '上传失败，请重试' }, { status: 500 }); }
}
