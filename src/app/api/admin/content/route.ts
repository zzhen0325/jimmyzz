import { syncGallery } from '@/lib/content';
import { adminGuard } from '@/lib/admin-auth';
import { readContent, validateContent, writeContent } from '@/lib/content-store';
import { cleanupRemovedUploads } from '@/lib/upload-cleanup';
import { removedUploads, uploadedFileName } from '@/lib/upload-references';
export async function GET(request: Request) { const denied = adminGuard(request); if (denied) return denied; return Response.json(await readContent(), { headers: { 'Cache-Control': 'no-store' } }); }
export async function PUT(request: Request) {
  const denied = adminGuard(request); if (denied) return denied;
  try {
    const text = await request.text();
    if (text.length > 2_000_000) return Response.json({ error: '内容过大' }, { status: 413 });
    const { cleanupCandidates = [], ...content } = JSON.parse(text);
    if (!Array.isArray(cleanupCandidates) || cleanupCandidates.length > 1000 || cleanupCandidates.some(src => !uploadedFileName(src))) {
      return Response.json({ error: '待清理资源格式有误' }, { status: 400 });
    }
    validateContent(content);
    const previous = await readContent();
    const synced = syncGallery(content);
    await writeContent(synced);
    let failedCleanup: string[];
    try { failedCleanup = await cleanupRemovedUploads(previous, cleanupCandidates); }
    catch (error) {
      console.error('Upload cleanup failed after saving content', error);
      failedCleanup = removedUploads(previous, synced, cleanupCandidates);
    }
    return Response.json({ ok: true, failedCleanup });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : '保存失败，请重试' }, { status: 400 }); }
}
