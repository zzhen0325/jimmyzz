// Export the authored planet and rain cloud geometry with the current config.
// Run: node scripts/export-celestial.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import ts from 'typescript';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
const root = new URL('../', import.meta.url);
const compile = source => {
  const resolved = source.replace(/"(three(?:\/[^"]+)?)"/g, (_, specifier) => JSON.stringify(import.meta.resolve(specifier)));
  const compiled = ts.transpileModule(resolved, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
  return 'data:text/javascript;base64,' + Buffer.from(compiled).toString('base64');
};
const config = compile(await readFile(new URL('src/lib/home-3d-config.ts', root), 'utf8'));
const source = (await readFile(new URL('src/lib/chrome-celestial.ts', root), 'utf8'))
  .replace('"./home-3d-config"', JSON.stringify(config));
const { createChromePlanet, createChromeRainCloud } = await import(compile(source));
globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.(); }); }
  readAsDataURL(blob) { blob.arrayBuffer().then(result => { this.result = `data:${blob.type};base64,${Buffer.from(result).toString('base64')}`; this.onloadend?.(); }); }
};
await mkdir(new URL('public/assets/models/celestial/', root), { recursive: true });
for (const [filename, create] of [['planet', createChromePlanet], ['rain-cloud', createChromeRainCloud]]) {
  const model = create();
  const glb = await new GLTFExporter().parseAsync(model, { binary: true });
  await writeFile(new URL(`public/assets/models/celestial/${filename}.glb`, root), Buffer.from(glb));
  console.log(`${filename}.glb: ${glb.byteLength} bytes`);
  model.traverse(child => { if (child.isMesh) { child.geometry.dispose(); child.material.dispose(); } });
}
