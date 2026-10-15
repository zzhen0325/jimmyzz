import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import sharp from 'sharp';

const contentDir = process.env.CONTENT_DIR || 'data';
const content = JSON.parse(await readFile(path.join(contentDir, 'content.json'), 'utf8'));
const manifest = {};
let before = 0;
let after = 0;
await mkdir('public/assets/project-previews', { recursive: true });
for (const src of new Set(content.projects.map(project => project.thumbnail))) {
  if (!/^\/(assets|media)\//.test(src) || src.includes('..')) continue;
  const local = src.startsWith('/media/')
    ? path.join(contentDir, 'uploads', src.slice(7))
    : path.join('public', src);
  let input;
  try { input = await readFile(local); }
  catch (error) {
    if (error.code === 'ENOENT') { console.warn(`Preview source unavailable: ${src}`); continue; }
    throw error;
  }
  const output = await sharp(input).rotate()
    .resize({ width: 640, height: 400, fit: 'cover', withoutEnlargement: true })
    .webp({ quality: 78, effort: 5 }).toBuffer();
  const name = createHash('sha256').update(output).digest('hex').slice(0, 24);
  const preview = `/assets/project-previews/${name}.webp`;
  await writeFile(path.join('public', preview), output);
  manifest[src] = preview;
  before += input.length;
  after += output.length;
}
await writeFile('src/lib/project-preview-manifest.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(`Project previews: ${Object.keys(manifest).length}; ${(before / 1048576).toFixed(2)} MB → ${(after / 1048576).toFixed(2)} MB`);
