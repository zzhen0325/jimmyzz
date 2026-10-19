// Bake scene geometry and textures at build time; simplify the dense eat prop
// within a bounded error before lossless mesh compression.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import ts from 'typescript';
import sharp from 'sharp';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { MeshoptEncoder } from 'meshoptimizer/encoder';
import { MeshoptSimplifier } from 'meshoptimizer';

const root = new URL('../', import.meta.url);
const output = new URL('public/assets/models/home-prepared/', root);
const inputs = ['eat-sculpture-geometry.ts', 'eat-sculpture-contours.json', 'jimmy-wordmark-geometry.ts',
  'jimmy-wordmark-contours.json', 'home-3d-config.ts', 'chrome-logo-geometry.ts', 'chrome-logo-shape.ts',
  'home-reference-sculptures.ts', 'good-luck-label-contours.json', 'floating-glass-geometry.ts'];
const sources = Object.fromEntries(await Promise.all(inputs.map(async file => [file, await readFile(new URL(`src/lib/${file}`, root), 'utf8')])));
async function loadSource(source) {
  const resolved = source.replace(/"(three(?:\/[^\"]+)?)"/g, (_, specifier) => JSON.stringify(import.meta.resolve(specifier)));
  const compiled = ts.transpileModule(resolved, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
  return import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));
}
const { home3DConfig: config } = await loadSource(sources['home-3d-config.ts']);
const cutouts = [...config.cutouts.map(({ file }) => ({ name: `cutout-${file}`, path: `/assets/images/floating/${file}.png` })),
  { name: 'skater', path: config.skater.image }];
const images = new Map(await Promise.all(cutouts.map(async item => [item.name, await readFile(new URL(`public${item.path}`, root))])));
const hash = createHash('sha256').update(Object.values(sources).join('\n')).update(await readFile(new URL(import.meta.url))).update(THREE.REVISION);
images.forEach(bytes => hash.update(bytes));
const fingerprint = hash.digest('hex');
try {
  const manifest = JSON.parse(await readFile(new URL('manifest.json', output), 'utf8'));
  if (manifest.fingerprint === fingerprint) {
    await Promise.all(manifest.files.map(file => access(new URL(file, output))));
    console.log(`Prepared home geometry is current (${manifest.files.length} GLBs)`);
    process.exit(0);
  }
} catch { /* First build or source change. */ }
const { createEatSculpture } = await loadSource(sources['eat-sculpture-geometry.ts'].replace('import contours from "./eat-sculpture-contours.json";', `const contours = ${sources['eat-sculpture-contours.json']};`));
const { createJimmyWordmarkGeometry } = await loadSource(sources['jimmy-wordmark-geometry.ts'].replace('import contours from "./jimmy-wordmark-contours.json";', `const contours = ${sources['jimmy-wordmark-contours.json']};`));
const { createLogoTriangle } = await loadSource(sources['chrome-logo-geometry.ts']);
const { logoTriangles } = await loadSource(sources['chrome-logo-shape.ts']);
const { createGoodLuckCylinder } = await loadSource(sources['home-reference-sculptures.ts']);
const { prepareGlassGeometry } = await loadSource(sources['floating-glass-geometry.ts']);
globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.(); }); }
};
await MeshoptEncoder.ready;
await MeshoptSimplifier.ready;
function packGlb(gltf, bin) {
  const json = Buffer.from(JSON.stringify(gltf));
  const padded = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 32)]);
  const header = Buffer.alloc(20);
  header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4);
  header.writeUInt32LE(28 + padded.length + bin.length, 8);
  header.writeUInt32LE(padded.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(bin.length, 0); binHeader.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, padded, binHeader, bin]);
}
function compressGeometry(bin, gltf) {
  const extension = 'EXT_meshopt_compression';
  const chunks = [];
  let offset = 0;
  for (const [index, view] of gltf.bufferViews.entries()) {
    const accessor = gltf.accessors.find(accessor => accessor.bufferView === index);
    const source = bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
    let encoded = source;
    if (accessor) {
      assert(!accessor.sparse && !accessor.byteOffset);
      const size = view.byteLength / accessor.count;
      // INDICES retains exact triangle order, including degenerate triangles.
      const mode = view.target === 34963 ? 'INDICES' : 'ATTRIBUTES';
      encoded = MeshoptEncoder.encodeGltfBuffer(source, accessor.count, size, mode);
      view.extensions = { [extension]: { buffer: 0, byteOffset: offset, byteLength: encoded.length, byteStride: size, count: accessor.count, mode } };
      view.buffer = 1;
    } else {
      // PNGs and the glass half-float height map are embedded without lossy conversion.
      view.buffer = 0;
      view.byteOffset = offset;
    }
    const padding = (4 - encoded.length % 4) % 4;
    chunks.push(Buffer.from(encoded), Buffer.alloc(padding));
    offset += encoded.length + padding;
  }
  gltf.buffers = [{ byteLength: offset }, { byteLength: bin.length, extensions: { [extension]: { fallback: true } } }];
  gltf.extensionsUsed = [...(gltf.extensionsUsed ?? []), extension];
  gltf.extensionsRequired = [...(gltf.extensionsRequired ?? []), extension];
  return packGlb(gltf, Buffer.concat(chunks));
}
const wordmark = new THREE.Mesh(createJimmyWordmarkGeometry(), new THREE.MeshPhysicalMaterial(config.wordmark.material));
wordmark.name = 'floating-jimmy-wordmark';
const logo = new THREE.Group();
logo.name = 'fixed-silver-ZZ';
logoTriangles.forEach(vertices => logo.add(new THREE.Mesh(createLogoTriangle(vertices), new THREE.MeshPhysicalMaterial(config.logo.material))));
const labelPaths = JSON.parse(sources['good-luck-label-contours.json']).map(({ outline, holes }) => {
  const d = [outline, ...holes].map(path => {
    const last = path.at(-1), first = path[0];
    return `M${(last[0] + first[0]) / 2 * 1024},${(last[1] + first[1]) / 2 * 768}` + path.map(([x, y], i) => {
      const next = path[(i + 1) % path.length];
      return `Q${x * 1024},${y * 768},${(x + next[0]) / 2 * 1024},${(y + next[1]) / 2 * 768}`;
    }).join('') + 'Z';
  }).join('');
  return `<path fill-rule="evenodd" d="${d}"/>`;
}).join('');
const label = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="768"><path fill="${config.referenceSculptures.goodLuck.labelColors.background}" d="M0 0H1024V768H0Z"/><g fill="${config.referenceSculptures.goodLuck.labelColors.ink}">${labelPaths}</g></svg>`)).png().toBuffer();
const models = [
  { name: 'eat', model: createEatSculpture(config.referenceSculptures.eat.inflation) },
  { name: 'wordmark', model: wordmark },
  { name: 'zz-logo', model: logo },
  { name: 'good-luck', model: createGoodLuckCylinder(config.referenceSculptures.goodLuck), texture: label, textureMesh: 'curved-good-luck-label' },
  { name: 'pixel-vortex', model: new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1), new THREE.MeshBasicMaterial()) },
];
for (const setting of config.glass.items) {
  const { geometry, heightMap } = prepareGlassGeometry(setting.shape, config.glass.finish);
  const model = new THREE.Mesh(geometry, new THREE.MeshPhysicalMaterial({ color: setting.color, transmission: 1, roughness: .05 }));
  model.name = `floating-glass-${setting.name}`;
  models.push({ name: `glass-${setting.name}`, model, heightMap });
}
for (const { name } of cutouts) {
  const texture = images.get(name);
  const { width, height } = await sharp(texture).metadata();
  const model = new THREE.Mesh(new THREE.PlaneGeometry(width / height, 1), new THREE.MeshBasicMaterial({ ...config.skater.material, forceSinglePass: true }));
  model.name = name === 'skater' ? 'skater-billboard' : `floating-${name}`;
  models.push({ name, model, texture, textureMesh: model.name });
}
await mkdir(output, { recursive: true });
for (const { name, model, texture, textureMesh, heightMap } of models) {
  // The small inflated illustration starts with over one million triangles.
  // Simplify after inflation, retaining authored normals and all contour borders.
  // Source geometry remains untouched; only this runtime GLB is reduced.
  if (name === 'eat') model.traverse(child => {
    if (!child.isMesh || !child.geometry.index) return;
    const geometry = child.geometry;
    const indices = new Uint32Array(geometry.index.array);
    const [simplified, error] = MeshoptSimplifier.simplifyWithAttributes(
      indices, geometry.attributes.position.array, 3, geometry.attributes.normal.array, 3,
      [.05, .05, .05], null, Math.floor(indices.length * .12 / 3) * 3, .001, ['LockBorder']);
    assert(error <= .00101 && simplified.length <= indices.length);
    geometry.setIndex(new THREE.BufferAttribute(simplified, 1));
    console.log(`eat mesh: ${indices.length / 3} → ${simplified.length / 3} triangles (error ${error})`);
  });
  const originals = [];
  model.traverse(child => {
    if (!child.isMesh) return;
    originals.push(child);
    Object.assign(child.material.userData, { environmentIntensity: child.material.envMapIntensity,
      side: child.material.side, toneMapped: child.material.toneMapped, forceSinglePass: child.material.forceSinglePass });
  });
  const binary = await new GLTFExporter().parseAsync(model, { binary: true });
  const bytes = Buffer.from(binary), jsonLength = bytes.readUInt32LE(12);
  const gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
  let bin = bytes.subarray(28 + jsonLength);
  assert.equal(gltf.meshes.length, originals.length);
  // Restore exact authored normals, which GLTFExporter otherwise normalizes.
  gltf.meshes.forEach((mesh, index) => {
    const accessor = gltf.accessors[mesh.primitives[0].attributes.NORMAL];
    const view = gltf.bufferViews[accessor.bufferView], normal = originals[index].geometry.getAttribute('normal');
    assert.equal(accessor.count, normal.count);
    const offset = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
    for (let vertex = 0; vertex < normal.count; vertex++) for (let axis = 0; axis < 3; axis++) {
      bin.writeFloatLE(normal.array[vertex * 3 + axis], offset + vertex * (view.byteStride ?? 12) + axis * 4);
    }
  });
  const append = data => {
    const index = gltf.bufferViews.length;
    gltf.bufferViews.push({ buffer: 0, byteOffset: bin.length, byteLength: data.length });
    bin = Buffer.concat([bin, data, Buffer.alloc((4 - data.length % 4) % 4)]);
    return index;
  };
  if (heightMap) {
    const { data, width, height } = heightMap.image;
    gltf.extras = { glassHeight: { bufferView: append(Buffer.from(data.buffer, data.byteOffset, data.byteLength)), width, height } };
  }
  if (texture) {
    // Convert Three's flipY=true convention into standard glTF UV orientation.
    const png = await sharp(texture).flip().png().toBuffer();
    gltf.images = [{ bufferView: append(png), mimeType: 'image/png' }];
    gltf.samplers = [{ magFilter: 9729, minFilter: 9987, wrapS: 33071, wrapT: 33071 }];
    gltf.textures = [{ source: 0, sampler: 0 }];
    const mesh = originals.findIndex(child => child.name === textureMesh);
    gltf.materials[gltf.meshes[mesh].primitives[0].material].pbrMetallicRoughness.baseColorTexture = { index: 0 };
    // Flipping back must reproduce every source pixel, including transparent edges.
    const original = await sharp(texture).ensureAlpha().raw().toBuffer();
    const restored = await sharp(png).flip().ensureAlpha().raw().toBuffer();
    assert.deepEqual(restored, original);
  }
  const compressed = compressGeometry(bin, gltf);
  // Validate geometry independently of Node's lack of browser image decoders.
  const validation = structuredClone(gltf);
  validation.materials.forEach(material => delete material.pbrMetallicRoughness.baseColorTexture);
  const packedJsonSize = compressed.readUInt32LE(12);
  const geometryOnly = packGlb(validation, compressed.subarray(28 + packedJsonSize));
  const roundTrip = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(geometryOnly.buffer.slice(geometryOnly.byteOffset, geometryOnly.byteOffset + geometryOnly.byteLength), '');
  const restored = [];
  roundTrip.scene.traverse(child => { if (child.isMesh) restored.push(child); });
  assert.equal(restored.length, originals.length);
  originals.forEach((mesh, index) => {
    const geometry = restored[index].geometry;
    for (const attribute of Object.keys(mesh.geometry.attributes)) {
      const actual = geometry.getAttribute(attribute === 'glassEdge' ? '_glassedge' : attribute).array;
      const expected = mesh.geometry.getAttribute(attribute).array;
      assert.deepEqual(Array.from(actual), Array.from(expected), `${name}: ${attribute}`);
    }
    assert.deepEqual(geometry.index?.array, mesh.geometry.index?.array);
    assert.deepEqual(restored[index].position.toArray(), mesh.position.toArray());
    assert(restored[index].quaternion.angleTo(mesh.quaternion) < 1e-7);
    for (const field of ['roughness', 'metalness', 'clearcoat', 'clearcoatRoughness']) assert.equal(restored[index].material[field] ?? 0, mesh.material[field] ?? 0);
    for (const channel of ['r', 'g', 'b']) assert(Math.abs(restored[index].material.color[channel] - mesh.material.color[channel]) < 1e-6);
  });
  if (heightMap) {
    const data = await roundTrip.parser.getDependency('bufferView', gltf.extras.glassHeight.bufferView);
    assert.deepEqual(new Uint16Array(data), heightMap.image.data);
  }
  await writeFile(new URL(`${name}.glb`, output), compressed);
  console.log(`${name}: ${(compressed.byteLength / 1024 / 1024).toFixed(2)} MiB; exact geometry, UVs and texture pixels verified`);
}
await writeFile(new URL('manifest.json', output), JSON.stringify({ fingerprint, files: models.map(({ name }) => `${name}.glb`) }, null, 2) + '\n');
