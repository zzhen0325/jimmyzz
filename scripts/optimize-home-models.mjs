import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MeshoptSimplifier } from 'meshoptimizer';

// Keep authored GLBs intact. Only replace triangle indices in the runtime copies;
// all original vertex attributes, textures and material definitions are retained.
const root = fileURLToPath(new URL('../public/assets/models/', import.meta.url));
const files = [
  'plaques/01_think.glb', 'plaques/02_plan.glb', 'plaques/03_do.glb',
  'plaques/04_review.glb', 'plaques/05_repeat.glb', 'emotions/02_meh.glb',
  'emotions/06_blue_zz.glb', 'emotions/07_smiley_keycap.glb', 'portal-gun/portal-gun-jr.glb',
];
await MeshoptSimplifier.ready;
for (const file of files) {
  const data = await fs.readFile(path.join(root, file));
  assert.equal(data.readUInt32LE(0), 0x46546c67);
  assert.equal(data.readUInt32LE(4), 2);
  const jsonLength = data.readUInt32LE(12);
  const gltf = JSON.parse(data.subarray(20, 20 + jsonLength).toString());
  const binOffset = 20 + jsonLength + 8;
  const accessor = index => {
    const a = gltf.accessors[index], view = gltf.bufferViews[a.bufferView];
    assert(!a.sparse && !a.normalized && view.buffer === 0);
    assert([5123, 5125, 5126].includes(a.componentType));
    const size = a.componentType === 5123 ? 2 : 4;
    return { a, view, size, offset: binOffset + (view.byteOffset ?? 0) + (a.byteOffset ?? 0) };
  };
  const read = (index, components) => {
    const { a, view, size, offset } = accessor(index);
    const stride = view.byteStride ?? size * components;
    const result = a.componentType === 5126 ? new Float32Array(a.count * components) : new Uint32Array(a.count * components);
    for (let i = 0; i < a.count; i++) for (let k = 0; k < components; k++) {
      const at = offset + i * stride + k * size;
      result[i * components + k] = a.componentType === 5126 ? data.readFloatLE(at) : size === 4 ? data.readUInt32LE(at) : data.readUInt16LE(at);
    }
    return result;
  };
  let before = 0, after = 0;
  const seen = new Set();
  for (const mesh of gltf.meshes) for (const primitive of mesh.primitives) {
    assert(primitive.mode === undefined || primitive.mode === 4);
    if (primitive.indices === undefined || seen.has(primitive.indices)) continue;
    seen.add(primitive.indices);
    const indices = read(primitive.indices, 1), positions = read(primitive.attributes.POSITION, 3);
    const target = Math.floor(indices.length * .35 / 3) * 3;
    // Bound relative geometric error to 0.1%; retain borders and weight normals
    // so lettering seams and rounded silhouettes survive simplification.
    const [next, error] = primitive.attributes.NORMAL !== undefined
      ? MeshoptSimplifier.simplifyWithAttributes(indices, positions, 3, read(primitive.attributes.NORMAL, 3), 3, [.05, .05, .05], null, target, .001, ['LockBorder'])
      : MeshoptSimplifier.simplify(indices, positions, 3, target, .001, ['LockBorder']);
    assert(error <= .00101 && next.length <= indices.length && next.length % 3 === 0);
    const { a, view, size, offset } = accessor(primitive.indices);
    assert(!view.byteStride && a.componentType !== 5126);
    for (let i = 0; i < next.length; i++) {
      if (size === 4) data.writeUInt32LE(next[i], offset + i * size);
      else data.writeUInt16LE(next[i], offset + i * size);
    }
    a.count = next.length;
    delete a.min; delete a.max;
    before += indices.length / 3; after += next.length / 3;
  }
  const json = JSON.stringify(gltf);
  const padded = Buffer.from(json + ' '.repeat((4 - Buffer.byteLength(json) % 4) % 4));
  const header = Buffer.from(data.subarray(0, 20));
  header.writeUInt32LE(data.length - jsonLength + padded.length, 8);
  header.writeUInt32LE(padded.length, 12);
  const destination = path.join(root, 'home-optimized', file);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, Buffer.concat([header, padded, data.subarray(20 + jsonLength)]));
  console.log(`${file}: ${before} → ${after} triangles`);
}
