/** Extend the pastel bake into empty UV space before Three.js builds mipmaps.
 * Run after export-soft-accretion.py; geometry and authored pastel texels stay intact.
 */
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const directory = new URL('../public/assets/models/soft-accretion/', import.meta.url);
const modelPath = new URL('soft-accretion.glb', directory);
const model = await fs.readFile(modelPath);
const jsonLength = model.readUInt32LE(12);
const gltf = JSON.parse(model.subarray(20, 20 + jsonLength).toString());
const binary = model.subarray(28 + jsonLength);
const image = gltf.images.find(image => image.name === 'soft-accretion-basecolor');
const view = gltf.bufferViews[image.bufferView];
// This exporter puts its one PNG last. Refuse to overwrite any following data.
if (gltf.bufferViews.some(other => other !== view && other.byteOffset >= view.byteOffset)) {
  throw new Error('Expected the base-color image to be the final buffer view');
}
const { data, info } = await sharp(binary.subarray(view.byteOffset, view.byteOffset + view.byteLength))
  .removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;
const count = width * height;
const visited = new Uint8Array(count);
const queue = new Int32Array(count);
let head = 0, tail = 0;
for (let pixel = 0; pixel < count; pixel++) {
  const offset = pixel * channels;
  // This material has no authored dark colors. Exclude black bake background
  // and its antialiased fringe; every genuine pastel has all channels > 128.
  if (Math.min(data[offset], data[offset + 1], data[offset + 2]) > 128) {
    visited[pixel] = 1;
    queue[tail++] = pixel;
  }
}
if (!tail) throw new Error('No pastel texels found');
const originalCount = tail;
function extend(from, to) {
  if (visited[to]) return;
  visited[to] = 1;
  for (let channel = 0; channel < channels; channel++) {
    data[to * channels + channel] = data[from * channels + channel];
  }
  queue[tail++] = to;
}
while (head < tail) {
  const pixel = queue[head++];
  const x = pixel % width;
  if (x > 0) extend(pixel, pixel - 1);
  if (x + 1 < width) extend(pixel, pixel + 1);
  if (pixel >= width) extend(pixel, pixel - width);
  if (pixel + width < count) extend(pixel, pixel + width);
}
const png = await sharp(data, { raw: info }).png().toBuffer();
view.byteLength = png.length;
const payload = Buffer.concat([binary.subarray(0, view.byteOffset), png]);
const paddedPayload = Buffer.concat([payload, Buffer.alloc((4 - payload.length % 4) % 4)]);
gltf.buffers[0].byteLength = paddedPayload.length;
const json = Buffer.from(JSON.stringify(gltf));
const paddedJson = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 32)]);
const header = Buffer.alloc(20);
header.writeUInt32LE(0x46546c67, 0);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(28 + paddedJson.length + paddedPayload.length, 8);
header.writeUInt32LE(paddedJson.length, 12);
header.writeUInt32LE(0x4e4f534a, 16);
const binaryHeader = Buffer.alloc(8);
binaryHeader.writeUInt32LE(paddedPayload.length, 0);
binaryHeader.writeUInt32LE(0x004e4942, 4);
await fs.writeFile(modelPath, Buffer.concat([header, paddedJson, binaryHeader, paddedPayload]));
await fs.writeFile(new URL('soft-accretion-basecolor.png', directory), png);
console.log(`Padded ${count - originalCount} empty/fringe texels in ${fileURLToPath(modelPath)}`);
