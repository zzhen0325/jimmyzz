import 'server-only';
import { getVideoLayers } from './video-layers';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { initialContent, syncGallery, type Content } from './content';
import { cloudflareStorage } from './cloudflare-storage';
import { defaultProjectTheme, isThemeColor } from './project-theme';
export const contentDirectory = process.env.CONTENT_DIR || path.join(process.cwd(), 'data');
export async function readContent(): Promise<Content> {
  const storage = cloudflareStorage();
  if (storage) {
    const object = await storage.CONTENT_BUCKET.get('content.json');
    return syncGallery(object ? await object.json<Content>() : initialContent);
  }
  try { return syncGallery(JSON.parse(await readFile(path.join(contentDirectory, 'content.json'), 'utf8'))); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return syncGallery(initialContent); throw error; }
}
export async function writeContent(content: Content) {
  const storage = cloudflareStorage();
  if (storage) {
    await storage.CONTENT_BUCKET.put('content.json', JSON.stringify(content, null, 2), {
      httpMetadata: { contentType: 'application/json' },
    });
    return;
  }
  await mkdir(contentDirectory, { recursive: true });
  const temp = path.join(contentDirectory, `${randomUUID()}.tmp`);
  await writeFile(temp, JSON.stringify(content, null, 2));
  await rename(temp, path.join(contentDirectory, 'content.json'));
}
export function validateContent(value: unknown): asserts value is Content {
  const c = value as Content;
  const fail = () => { throw new Error('内容格式有误，请检查标题和素材。'); };
  const media = (s: unknown) => typeof s === 'string' && /^\/(assets|media)\/[a-zA-Z0-9_./%()\-\u4e00-\u9fff ]+$/.test(s) && !s.includes('..');
  if (!c || !Array.isArray(c.projects) || !Array.isArray(c.gallery) || !c.selectedWork || !c.sizes || c.projects.length > 200 || c.gallery.length > 1000) fail();
  const ids = new Set<string>();
  for (const p of c.projects) {
    if (!p || !/^[a-z0-9-]+$/.test(p.slug) || ids.has(p.slug) || !p.title?.trim() || !media(p.selectedWorkCover) || !media(p.thumbnail)) fail();
    if (p.homeCover !== undefined && (!p.homeCover || !media(p.homeCover.source) || !media(p.homeCover.src))) fail();
    ids.add(p.slug);
    if (p.detailTheme !== undefined && (
      !p.detailTheme || typeof p.detailTheme !== 'object' || Array.isArray(p.detailTheme) ||
      Object.entries(p.detailTheme).some(([key, value]) => !Object.hasOwn(defaultProjectTheme, key) || !isThemeColor(value))
    )) throw new Error(`“${p.title}”的详情页颜色格式有误，请使用 #RGB 或 #RRGGBB 色值。`);
    for (const key of ['english','kind','client','summary','description','challenge','approach'] as const) if (typeof p[key] !== 'string') fail();
    if (!Array.isArray(p.tags) || p.tags.some(t => typeof t !== 'string') || !Array.isArray(p.assets) || p.assets.some(a => !a.name || !media(a.src)) || new Set(p.assets.map(a=>a.name)).size !== p.assets.length) fail();
    for (const asset of p.assets) {
      if (asset.videoLayers !== undefined && (!Array.isArray(asset.videoLayers) || asset.videoLayers.length > 20 || asset.videoLayer !== undefined)) fail();
      if (asset.videoLayer === null) fail();
      for (const layer of getVideoLayers(asset)) {
      if (layer !== undefined && (!layer || !media(layer.src) || !/\.(webm|mp4|mov)$/i.test(layer.src) || /\.(webm|mp4|mov)$/i.test(asset.src) ||
        !['above', 'below'].includes(layer.order) || !['cover', 'contain', 'center-crop'].includes(layer.fit) ||
        [layer.x, layer.y, layer.width, layer.height, layer.radius].some(n => !Number.isFinite(n)) ||
        layer.x < 0 || layer.y < 0 || layer.width <= 0 || layer.height <= 0 ||
        layer.x + layer.width > 100.001 || layer.y + layer.height > 100.001 || layer.radius < 0 || layer.radius > 50)) fail();
      }
    }
    for (const key of ['infoProjectName', 'date'] as const) if (p[key] !== undefined && typeof p[key] !== 'string') fail();
    if (p.hoverVideo && !media(p.hoverVideo)) fail();
    if (p.results !== undefined && (!Array.isArray(p.results) || p.results.some(r => !r || typeof r.label !== 'string' || typeof r.value !== 'string'))) fail();
    for (const n of [p.coverWidth, p.coverHeight]) if (n !== undefined && (!Number.isFinite(n) || n <= 0 || n > 100000)) fail();
  }
  for (const list of [c.selectedWork.order, c.selectedWork.compact]) if (!Array.isArray(list) || new Set(list).size !== list.length || list.some(id => !ids.has(id))) fail();
  if (Object.entries(c.sizes).some(([id,size]) => !ids.has(id) || !['small','large'].includes(size))) fail();
  if (new Set(c.gallery.map(g=>g.name)).size !== c.gallery.length) fail();
  for (const g of c.gallery) if ((g.sourceProject && !ids.has(g.sourceProject)) || !g.name || typeof g.title !== 'string' || !media(g.src) || !Number.isFinite(g.width) || !Number.isFinite(g.height) || g.width <= 0 || g.height <= 0 || (g.scale !== undefined && (!Number.isFinite(g.scale) || g.scale < .5 || g.scale > 1.5))) fail();
}
