import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import sharp from 'sharp';

// Generate derivatives only: originals and CMS content are never rewritten.
const root = process.cwd();
const content = JSON.parse(await readFile(path.join(process.env.CONTENT_DIR || 'data', 'content.json'), 'utf8').catch(error => {
  if (error.code === 'ENOENT') return '{"projects":[]}';
  throw error;
}));
const config = await readFile('src/lib/projects-config.ts', 'utf8');
const sources = new Set([
  ...content.projects.map(p => p.selectedWorkCover),
  ...[...config.matchAll(/selectedWorkCover["']?\s*:\s*["']([^"']+)["']/g)].map(match => match[1]),
]);
const manifest = {};
let before = 0, after = 0;
await mkdir('public/assets/home-covers', { recursive: true });
for (const src of sources) {
  if (!/^\/(assets|media)\//.test(src) || src.includes('..') || !/\.(png|jpe?g|webp|avif)$/i.test(src)) continue;
  const local = src.startsWith('/media/') ? path.join(process.env.CONTENT_DIR || 'data', 'uploads', src.slice(7)) : path.join(root, 'public', src);
  let input;
  try { input = await readFile(local); }
  catch (error) { if (error.code === 'ENOENT') { console.warn(`Cover unavailable locally, retaining original: ${src}`); continue; } throw error; }
  if (/\.png$/i.test(src) && input.includes(Buffer.from('acTL'))) continue;
  const meta = await sharp(input).metadata();
  if ((meta.pages || 1) > 1) continue;
  const output = await sharp(input).rotate().resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 90, alphaQuality: 100, effort: 6, smartSubsample: true }).toBuffer();
  if (output.length >= input.length) continue;
  const name = `${createHash('sha256').update(output).digest('hex').slice(0, 24)}.webp`;
  await writeFile(`public/assets/home-covers/${name}`, output);
  manifest[src] = `/assets/home-covers/${name}`;
  before += input.length; after += output.length;
}
await writeFile('src/lib/home-cover-manifest.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(`Home covers: ${Object.keys(manifest).length}; ${(before / 1048576).toFixed(2)} MB → ${(after / 1048576).toFixed(2)} MB (${before ? (100 * (1 - after / before)).toFixed(1) : 0}% smaller). Originals retained.`);
