import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Used after code deployment, or independently to publish content only.
const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
const args = process.argv.slice(2);
if (args.some(arg => arg !== '--publish')) throw new Error('Usage: npm run sync:content -- [--publish]');
const publish = args.includes('--publish');
const bucket = 'zzmax-content';
const origin = 'https://zzmax.icu';
const types = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif', mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime' };
const wrangler = (...args) => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, ['node_modules/wrangler/bin/wrangler.js', ...args], { stdio: 'inherit' });
  child.on('error', reject);
  child.on('exit', code => code === 0 ? resolve() : reject(new Error(`Wrangler failed (${code})`)));
});
const digest = text => createHash('sha256').update(text).digest('hex');
const contentText = await readFile('data/content.json', 'utf8');
const content = JSON.parse(contentText);
if (!Array.isArray(content.projects) || !Array.isArray(content.gallery) || !Array.isArray(content.selectedWork?.order)) throw new Error('Invalid local content');
const refs = new Set();
function visit(value) {
  if (typeof value === 'string' && value.startsWith('/media/')) {
    if (!/^\/media\/[a-f0-9-]+\.(jpg|png|webp|gif|avif|mp4|webm|mov)$/.test(value)) throw new Error(`Invalid media path: ${value}`);
    refs.add(value);
  } else if (value && typeof value === 'object') Object.values(value).forEach(visit);
}
visit(content);
const files = [];
for (const ref of refs) {
  const name = ref.slice('/media/'.length);
  const local = path.join('data/uploads', name);
  const data = await readFile(local);
  files.push({ ref, name, local, size: data.length, md5: createHash('md5').update(data).digest('hex'), sha256: digest(data) });
}
async function inspect(file) {
  const response = await fetch(`${origin}${file.ref}`, { headers: { Range: 'bytes=0-0' }, signal: AbortSignal.timeout(30000) });
  await response.body?.cancel();
  if (response.status === 404) return false;
  if (![200, 206].includes(response.status)) throw new Error(`Media check failed: ${file.ref} (${response.status})`);
  const size = response.headers.get('content-range')?.split('/').pop() ?? response.headers.get('content-length');
  const etag = response.headers.get('etag')?.replaceAll('"', '');
  if (Number(size) !== file.size || etag !== file.md5) {
    throw new Error(`Existing remote media differs: ${file.ref}. Use a new filename before publishing; immutable media must not be overwritten.`);
  }
  return true;
}
const directory = path.join('output/cloudflare', `content-sync-${new Date().toISOString().replaceAll(':', '-')}`);
await mkdir(directory, { recursive: true });
await writeFile(path.join(directory, 'local-content.json'), contentText);
const backup = path.join(directory, 'remote-before.json');
await wrangler('r2', 'object', 'get', `${bucket}/content.json`, '--remote', '--file', backup);
const before = await readFile(backup, 'utf8');
const missing = [];
for (const file of files) {
  if (!(await inspect(file))) missing.push(file);
}
console.log(`Projects: ${content.projects.length}; media: ${files.length}; missing uploads: ${missing.length}; backup: ${backup}`);
if (!publish) {
  console.log('Read-only comparison complete. To publish this local content: npm run sync:content -- --publish');
  process.exit(0);
}
for (const file of missing) {
  if (digest(await readFile(file.local)) !== file.sha256) throw new Error(`Local media changed during sync: ${file.ref}`);
  await wrangler('r2', 'object', 'put', `${bucket}/uploads/${file.name}`, '--remote', '--file', file.local,
    '--content-type', types[file.name.split('.').pop()], '--cache-control', 'public, max-age=31536000, immutable');
  if (!(await inspect(file))) throw new Error(`Upload verification failed: ${file.ref}`);
}
// Refuse to silently replace edits made while the media was uploading.
const latest = path.join(directory, 'remote-pre-publish.json');
await wrangler('r2', 'object', 'get', `${bucket}/content.json`, '--remote', '--file', latest);
if (digest(await readFile(latest, 'utf8')) !== digest(before)) throw new Error('Remote content changed during sync; compare again before publishing. Content was not overwritten.');
if (digest(await readFile('data/content.json', 'utf8')) !== digest(contentText)) throw new Error('Local content changed during sync; run again.');
if (JSON.stringify(JSON.parse(before)) !== JSON.stringify(content)) {
  await wrangler('r2', 'object', 'put', `${bucket}/content.json`, '--remote', '--file', path.join(directory, 'local-content.json'), '--content-type', 'application/json', '--cache-control', 'no-store');
}
const after = path.join(directory, 'remote-after.json');
await wrangler('r2', 'object', 'get', `${bucket}/content.json`, '--remote', '--file', after);
if (JSON.stringify(JSON.parse(await readFile(after, 'utf8'))) !== JSON.stringify(content)) throw new Error('Published content verification failed; inspect backup before retrying.');
console.log(`Published and verified ${content.projects.length} projects and ${files.length} media files. Old remote media was retained.`);
