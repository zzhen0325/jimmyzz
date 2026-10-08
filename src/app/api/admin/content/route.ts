import { adminGuard } from '@/lib/admin-auth';
import { readContent, validateContent, writeContent } from '@/lib/content-store';
export async function GET(request: Request) { const denied = adminGuard(request); if (denied) return denied; return Response.json(await readContent(), { headers: { 'Cache-Control': 'no-store' } }); }
export async function PUT(request: Request) {
  const denied = adminGuard(request); if (denied) return denied;
  try {
    const text = await request.text();
    if (text.length > 2_000_000) return Response.json({ error: '内容过大' }, { status: 413 });
    const content = JSON.parse(text); validateContent(content); await writeContent(content);
    return Response.json({ ok: true });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : '保存失败，请重试' }, { status: 400 }); }
}
