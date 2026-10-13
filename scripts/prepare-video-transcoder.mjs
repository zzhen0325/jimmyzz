import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
const destination = new URL('../public/assets/video-transcoder/v1/', import.meta.url);
await mkdir(destination, { recursive: true });
for (const name of ['classes.js', 'utils.js', 'worker.js', 'const.js', 'errors.js']) {
  await copyFile(new URL(`../node_modules/@ffmpeg/ffmpeg/dist/esm/${name}`, import.meta.url), new URL(name, destination));
}
await copyFile(new URL('../node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.js', import.meta.url), new URL('ffmpeg-core.js', destination));
// Keep each static asset below the hosting platform's per-file limit.
const wasm = await readFile(new URL('../node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.wasm', import.meta.url));
const split = Math.ceil(wasm.length / 2);
await writeFile(new URL('core-0.bin', destination), wasm.subarray(0, split));
await writeFile(new URL('core-1.bin', destination), wasm.subarray(split));
console.log('Video transcoder assets prepared');
