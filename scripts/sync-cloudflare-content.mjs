import { readFile, writeFile, mkdir, readdir, rename, unlink } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { isDeepStrictEqual as equal } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeContent, normalizeContent } from './content-merge.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
const args = process.argv.slice(2);
const publish = args.includes('--publish');
const writeLocal = args.includes('--write-local');
const baseIndex = args.indexOf('--base');
const explicitBase = baseIndex >= 0 ? args[baseIndex + 1] : null;
const flags = args.filter((_, i) => baseIndex < 0 || (i !== baseIndex && i !== baseIndex + 1));
if ((baseIndex >= 0 && (!explicitBase || explicitBase.startsWith('--'))) || flags.some(arg => !['--publish', '--write-local'].includes(arg)) || (publish && writeLocal)) {
  throw new Error('Usage: npm run sync:content -- [--base <common-ancestor.json>] [--write-local | --publish]');
}
const bucket = 'zzmax-content';
const origin = 'https://zzmax.icu';
const baseFile = 'data/content-sync-base.json';
const types = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif', mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime' };
const digest = text => createHash('sha256').update(text).digest('hex');
const json = value => JSON.stringify(value, null, 2) + '\n';
const wrangler = (...args) => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, ['node_modules/wrangler/bin/wrangler.js', ...args], { stdio: 'inherit' });
  child.on('error', reject);
  child.on('exit', code => code === 0 ? resolve() : reject(new Error(`Wrangler failed (${code})`)));
});
async function optionalRead(file) {
  try { return await readFile(file); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}
async function atomicWrite(file, data) {
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${randomUUID()}.tmp`;
  try { await writeFile(temp, data); await rename(temp, file); }
  finally { await unlink(temp).catch(error => { if (error.code !== 'ENOENT') throw error; }); }
}
async function findBase(local, remote) {
  if (explicitBase) return { content: JSON.parse(await readFile(explicitBase, 'utf8')), source: explicitBase };
  const stored = await optionalRead(baseFile);
  if (stored) {
    const state = JSON.parse(stored);
    if (state.bucket !== bucket || state.origin !== origin) throw new Error('Content baseline belongs to another environment');
    return { content: state.content, source: baseFile };
  }
  // Migrate only successful legacy publications whose local and remote-after
  // snapshots agree. An arbitrary remote-before snapshot is not an ancestor.
  const entries = await readdir('output/cloudflare').catch(error => { if (error.code === 'ENOENT') return []; throw error; });
  for (const name of entries.filter(name => name.startsWith('content-sync-')).sort().reverse()) {
    const folder = path.join('output/cloudflare', name);
    const after = await optionalRead(path.join(folder, 'remote-after.json'));
    const priorLocal = await optionalRead(path.join(folder, 'local-content.json'));
    if (!after || !priorLocal) continue;
    const content = JSON.parse(after);
    if (equal(content, JSON.parse(priorLocal))) return { content, source: path.join(folder, 'remote-after.json') };
  }
  if (equal(normalizeContent(local), normalizeContent(remote))) return { content: remote, source: 'identical local and remote' };
  throw new Error('没有可靠的共同版本，已停止。请用 --base <共同版本.json> 指定曾同步成功的版本；不要把当前线上内容冒充共同版本。');
}
const saveBase = content => atomicWrite(baseFile, json({ bucket, origin, content }));

const directory = path.join('output/cloudflare', `content-sync-${new Date().toISOString().replaceAll(':', '-')}-${randomUUID().slice(0, 8)}`);
await mkdir(directory, { recursive: true });
// The lock excludes concurrent sync processes; editor changes are also checked
// again immediately before local writes. Remote publication still needs a quiet
// editing window: Wrangler's object put has no atomic compare-and-swap option.
await mkdir('data', { recursive: true });
const lock = 'data/content-sync.lock';
try { await writeFile(lock, `${process.pid}\n`, { flag: 'wx' }); }
catch (error) { if (error.code === 'EEXIST') throw new Error(`另一个内容同步正在运行；若上次异常退出，请确认进程已停止后删除 ${lock}`); throw error; }
try {
  const localText = await readFile('data/content.json', 'utf8');
  const local = JSON.parse(localText);
  await writeFile(path.join(directory, 'local-content.json'), localText);
  const backup = path.join(directory, 'remote-before.json');
  await wrangler('r2', 'object', 'get', `${bucket}/content.json`, '--remote', '--file', backup);
  const before = await readFile(backup, 'utf8');
  const remote = JSON.parse(before);
  const base = await findBase(local, remote);
  await writeFile(path.join(directory, 'base.json'), json(base.content));
  const { content, conflicts } = mergeContent(base.content, local, remote);
  await writeFile(path.join(directory, 'merge-report.json'), json({ baseline: base.source, conflicts }));
  console.log(`共同版本: ${base.source}\n合并报告: ${directory}`);
  if (conflicts.length) {
    console.error(conflicts.map(item => `冲突: ${item.path}`).join('\n'));
    throw new Error(`${conflicts.length} 处合并冲突；本地和线上内容均未改写。请按 merge-report.json 调整本地对应字段后重试。`);
  }
  const mergedFile = path.join(directory, 'merged-content.json');
  await writeFile(mergedFile, json(content));
  console.log(`合并完成: ${content.projects.length} 个项目。默认只预览；--write-local 写回本地，--publish 发布合并结果并同步本地。`);
  if (publish || writeLocal) {
    const refs = new Set();
    function visit(value) {
      if (typeof value === 'string' && value.startsWith('/media/')) {
        if (!/^\/media\/[a-f0-9-]+\.(jpg|png|webp|gif|avif|mp4|webm|mov)$/.test(value)) throw new Error(`Invalid media path: ${value}`);
        refs.add(value);
      } else if (value && typeof value === 'object') Object.values(value).forEach(visit);
    }
    visit(content);
    const transfers = [];
    let checked = 0;
    for (const ref of refs) {
      const name = ref.slice(7), localFile = path.join('data/uploads', name);
      const data = await optionalRead(localFile);
      // A local-only merge can use existing immutable local files without
      // contacting the public CDN. Compare remote bytes before publication.
      if (writeLocal && data) { checked++; continue; }
      const response = await fetch(`${origin}${ref}`, { headers: { Range: 'bytes=0-0' }, signal: AbortSignal.timeout(30000) });
      await response.body?.cancel();
      if (![200, 206, 404].includes(response.status)) throw new Error(`Media check failed: ${ref} (${response.status})`);
      const exists = response.status !== 404;
      const size = response.headers.get('content-range')?.split('/').pop() ?? response.headers.get('content-length');
      const etag = response.headers.get('etag')?.replaceAll('"', '');
      if (exists && data && (Number(size) !== data.length || etag !== createHash('md5').update(data).digest('hex'))) throw new Error(`同名媒体内容不一致: ${ref}，请使用新文件名`);
      if (!exists && !data) throw new Error(`本地与线上均缺少媒体: ${ref}`);
      if (!data) transfers.push({ kind: 'download', ref, localFile });
      if (!exists && publish) transfers.push({ kind: 'upload', ref, name, localFile, sha256: digest(data) });
      checked++;
      if (checked % 10 === 0 || checked === refs.size) console.log(`媒体核对: ${checked}/${refs.size}`);
    }
    for (const task of transfers) {
      if (task.kind === 'download') {
        const response = await fetch(`${origin}${task.ref}`, { signal: AbortSignal.timeout(120000) });
        if (response.status !== 200) throw new Error(`Download failed: ${task.ref} (${response.status})`);
        const data = Buffer.from(await response.arrayBuffer());
        const etag = response.headers.get('etag')?.replaceAll('"', '');
        if (etag !== createHash('md5').update(data).digest('hex')) throw new Error(`Download verification failed: ${task.ref}`);
        // Do not replace a file created by another editor during the download.
        await mkdir(path.dirname(task.localFile), { recursive: true });
        await writeFile(task.localFile, data, { flag: 'wx' });
      } else {
        if (digest(await readFile(task.localFile)) !== task.sha256) throw new Error(`Local media changed: ${task.ref}`);
        await wrangler('r2', 'object', 'put', `${bucket}/uploads/${task.name}`, '--remote', '--file', task.localFile,
          '--content-type', types[task.name.split('.').pop()], '--cache-control', 'public, max-age=31536000, immutable');
        const check = await fetch(`${origin}${task.ref}`, { signal: AbortSignal.timeout(120000) });
        if (!check.ok || digest(Buffer.from(await check.arrayBuffer())) !== task.sha256) throw new Error(`Upload verification failed: ${task.ref}`);
      }
    }
    const latest = path.join(directory, 'remote-pre-publish.json');
    await wrangler('r2', 'object', 'get', `${bucket}/content.json`, '--remote', '--file', latest);
    if (digest(await readFile(latest)) !== digest(before)) throw new Error('线上在同步期间发生更新，已停止写入内容，请重新合并。');
    if (digest(await readFile('data/content.json')) !== digest(localText)) throw new Error('本地在同步期间发生更新，已停止写入内容，请重试。');
    if (publish) {
      if (!equal(content, remote)) {
        console.warn('发布期间请暂停后台编辑；R2 CLI 不提供原子条件写入。');
        await wrangler('r2', 'object', 'put', `${bucket}/content.json`, '--remote', '--file', mergedFile, '--content-type', 'application/json', '--cache-control', 'no-store');
      }
      const after = path.join(directory, 'remote-after.json');
      await wrangler('r2', 'object', 'get', `${bucket}/content.json`, '--remote', '--file', after);
      if (!equal(JSON.parse(await readFile(after, 'utf8')), content)) throw new Error('发布后验证不一致，未更新本地或基线，请检查备份与最新线上内容。');
    }
    if (digest(await readFile('data/content.json')) !== digest(localText)) throw new Error('本地编辑已变化，未覆盖本地或基线；合并结果已保存在报告目录。');
    await atomicWrite('data/content.json', json(content));
    // For a local-only merge the remote snapshot, not the unpublished candidate,
    // becomes the ancestor. Local unpublished changes remain changes next time.
    await saveBase(publish ? content : remote);
    console.log(publish ? '合并内容已发布并验证，本地与共同版本已更新；未删除旧媒体。' : '合并结果已写回本地，线上内容未改写，线上独有媒体已下载。');
  }
} finally { await unlink(lock); }
