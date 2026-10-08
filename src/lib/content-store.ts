import 'server-only';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { initialContent, type Content } from './content';
export const contentDirectory = process.env.CONTENT_DIR || path.join(process.cwd(), 'data');
export async function readContent(): Promise<Content> {
  try { return JSON.parse(await readFile(path.join(contentDirectory, 'content.json'), 'utf8')); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return initialContent; throw error; }
}
export async function writeContent(content: Content) {
  await mkdir(contentDirectory, { recursive: true });
  const temp = path.join(contentDirectory, `${randomUUID()}.tmp`);
  await writeFile(temp, JSON.stringify(content, null, 2));
  await rename(temp, path.join(contentDirectory, 'content.json'));
}
export function validateContent(value: unknown): asserts value is Content {
  const c = value as Content;
  const fail = () => { throw new Error('内容格式有误，请检查标题、图片和关联项目。'); };
  const media = (s: unknown) => typeof s === 'string' && /^\/(assets|media)\/[a-zA-Z0-9_./%()\-\u4e00-\u9fff ]+$/.test(s) && !s.includes('..');
  if (!c || !Array.isArray(c.projects) || !Array.isArray(c.gallery) || !c.selectedWork || !c.sizes || c.projects.length > 200 || c.gallery.length > 1000) fail();
  const ids = new Set<string>();
  for (const p of c.projects) {
    if (!p || !/^[a-z0-9-]+$/.test(p.slug) || ids.has(p.slug) || !p.title?.trim() || !media(p.selectedWorkCover) || !media(p.thumbnail)) fail();
    ids.add(p.slug);
    for (const key of ['english','kind','client','summary','description','challenge','approach'] as const) if (typeof p[key] !== 'string') fail();
    if (!Array.isArray(p.tags) || p.tags.some(t => typeof t !== 'string') || !Array.isArray(p.assets) || p.assets.some(a => !a.name || !media(a.src)) || new Set(p.assets.map(a=>a.name)).size !== p.assets.length) fail();
    if (p.hoverVideo && !media(p.hoverVideo)) fail();
    if (p.results !== undefined && (!Array.isArray(p.results) || p.results.some(r => !r || typeof r.label !== 'string' || typeof r.value !== 'string'))) fail();
    for (const n of [p.coverWidth, p.coverHeight]) if (n !== undefined && (!Number.isFinite(n) || n <= 0 || n > 100000)) fail();
  }
  for (const list of [c.selectedWork.order, c.selectedWork.compact]) if (!Array.isArray(list) || new Set(list).size !== list.length || list.some(id => !ids.has(id))) fail();
  if (Object.entries(c.sizes).some(([id,size]) => !ids.has(id) || !['small','large'].includes(size))) fail();
  if (new Set(c.gallery.map(g=>g.name)).size !== c.gallery.length) fail();
  for (const g of c.gallery) if ((g.sourceProject && !ids.has(g.sourceProject)) || !g.name || typeof g.title !== 'string' || !ids.has(g.project) || !media(g.src) || !Number.isFinite(g.width) || !Number.isFinite(g.height) || g.width <= 0 || g.height <= 0 || (g.scale !== undefined && (!Number.isFinite(g.scale) || g.scale < .5 || g.scale > 1.5))) fail();
}
