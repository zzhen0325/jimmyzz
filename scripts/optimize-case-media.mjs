import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import path from 'node:path';
import sharp from 'sharp';

// Derivatives are content addressed; originals and CMS references stay intact.
const version = 'case-v1';
const contentDir = process.env.CONTENT_DIR || 'data';
const content = JSON.parse(await readFile(path.join(contentDir, 'content.json'), 'utf8'));
const manifestFile = 'src/lib/case-media-manifest.json';
const previous = JSON.parse(await readFile(manifestFile, 'utf8').catch(() => '{}'));
const manifest = {};
const directory = 'public/assets/case-media';
await mkdir(directory, { recursive: true });
const sources = new Set(content.projects.flatMap(p => p.assets.flatMap(a => [a.src, ...(a.videoLayers || (a.videoLayer ? [a.videoLayer] : [])).map(l => l.src)])));
const exists = async url => { try { await access(path.join('public', url)); return true; } catch { return false; } };
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpeg, ['-hide_banner', ...args], { stdio: ['ignore', 'ignore', 'pipe'] });
    let log = '';
    child.stderr.on('data', chunk => { log = (log + chunk).slice(-12000); });
    child.on('error', reject);
    child.on('close', code => resolve({ code, log }));
  });
}
for (const src of sources) {
  if (!/^\/(assets|media)\//.test(src) || src.includes('..')) continue;
  const file = src.startsWith('/media/') ? path.join(contentDir, 'uploads', src.slice(7)) : path.join('public', src);
  let input;
  try { input = await readFile(file); } catch { console.warn(`Unavailable: ${src}`); continue; }
  const signature = createHash('sha256').update(version).update(input).digest('hex').slice(0, 24);
  const cached = previous[src];
  if (cached?.signature === signature && (await Promise.all((cached.variants?.map(v => v.src) || [cached.src, cached.poster]).map(exists))).every(Boolean)) {
    manifest[src] = cached;
    continue;
  }
  if (/\.(mp4|mov|webm)$/i.test(src)) {
    if (!process.argv.includes('--videos')) continue;
    const probe = await run(['-i', file]);
    // H.264 has no alpha channel. Keep transparent compositions intact.
    if (/alpha_mode\s*:\s*1|yuva|rgba/.test(probe.log)) { console.log(`Preserve transparent video: ${src}`); continue; }
    const output = `/assets/case-media/${signature}.mp4`;
    const poster = `/assets/case-media/${signature}.webp`;
    const scale = "scale=w='max(2,trunc(iw*sar*min(1,min(1440/(iw*sar),1440/ih))/2)*2)':h='max(2,trunc(ih*min(1,min(1440/(iw*sar),1440/ih))/2)*2)',setsar=1";
    const result = await run(['-y', '-i', file, '-map', '0:v:0', '-map', '0:a?', '-vf', scale, '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-maxrate', '2500k', '-bufsize', '5000k', '-g', '48', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', path.join('public', output)]);
    if (result.code !== 0) throw new Error(result.log);
    const frame = await run(['-y', '-i', path.join('public', output), '-frames:v', '1', '-vf', 'scale=640:-1', path.join('public', poster)]);
    if (frame.code !== 0) throw new Error(frame.log);
    const bytes = (await readFile(path.join('public', output))).length;
    manifest[src] = { signature, src: output, poster, bytes };
    console.log(`Video: ${(input.length / 1048576).toFixed(2)} → ${(bytes / 1048576).toFixed(2)} MB ${src}`);
  } else if (/\.(png|jpe?g|webp|avif)$/i.test(src)) {
    const metadata = await sharp(input).metadata();
    if ((metadata.pages || 1) > 1) continue;
    const variants = [];
    for (const width of [640, 1080, 1600, 2400]) {
      const { data, info } = await sharp(input).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 85, effort: 4 }).toBuffer({ resolveWithObject: true });
      const url = `/assets/case-media/${signature}-${width}.webp`;
      await writeFile(path.join('public', url), data);
      variants.push({ width: info.width, src: url, bytes: data.length });
      if (width >= (metadata.orientation && metadata.orientation >= 5 ? metadata.height : metadata.width)) break;
    }
    const rotated = metadata.orientation && metadata.orientation >= 5;
    manifest[src] = { signature, width: rotated ? metadata.height : metadata.width, height: rotated ? metadata.width : metadata.height, variants };
  }
}
await writeFile(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Prepared ${Object.keys(manifest).length} case media sources.`);
