/* eslint-disable @typescript-eslint/no-require-imports -- Standalone CJS script supports the optional workspace NODE_PATH runtime. */
// Keep exported Figma SVGs intact; raster copies provide silhouette fields and UV artwork.
// Requires sharp (available in the Codex workspace runtime).
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
const assets = path.join(root, 'public/assets/models/figma-symbols');
const output = path.join(root, 'output/home-figma-models');
(async () => {
  fs.mkdirSync(output, { recursive: true });
  for (const name of ['arrow', 'c-mark', 'asterisk']) {
    await sharp(path.join(assets, `${name}.svg`)).resize(256, 256, {
      fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 },
    }).png().toFile(path.join(output, `${name}.png`));
  }
  await sharp(path.join(assets, 'vinyl-source.svg'))
    .extract({ left: 70, top: 69, width: 472, height: 472 })
    .resize(1024, 1024).png().toFile(path.join(assets, 'vinyl-face.png'));
})().catch(error => { console.error(error); process.exitCode = 1; });
