// Export the exact runtime geometry to a portable binary glTF model.
import { readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
const root = new URL('../', import.meta.url);
const contours = await readFile(new URL('src/lib/jimmy-wordmark-contours.json', root), 'utf8');
const source = (await readFile(new URL('src/lib/jimmy-wordmark-geometry.ts', root), 'utf8'))
  .replace(/"(three(?:\/[^"]+)?)"/g, (_, specifier) => JSON.stringify(import.meta.resolve(specifier)))
  .replace('import contours from "./jimmy-wordmark-contours.json";', `const contours = ${contours};`);
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const { createJimmyWordmarkGeometry } = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));
globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.(); }); }
  readAsDataURL(blob) { blob.arrayBuffer().then(result => { this.result = `data:${blob.type};base64,${Buffer.from(result).toString('base64')}`; this.onloadend?.(); }); }
};
const material = new THREE.MeshPhysicalMaterial({ color: '#343840', metalness: .95, roughness: .19, clearcoat: 1, clearcoatRoughness: .1 });
const mesh = new THREE.Mesh(createJimmyWordmarkGeometry(), material);
mesh.name = 'Jimmy — original handwritten silhouette';
const glb = await new GLTFExporter().parseAsync(mesh, { binary: true });
await writeFile(new URL('public/assets/models/jimmy-wordmark.glb', root), Buffer.from(glb));
console.log(`Exported Jimmy GLB: ${glb.byteLength} bytes`);
mesh.geometry.dispose(); material.dispose();
