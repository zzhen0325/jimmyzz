import fs from "node:fs/promises";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve("next/package.json"))("sharp");
const plan = JSON.parse(
  await fs.readFile("docs/curve-gallery-assets-plan.json", "utf8"),
);
await fs.mkdir("public/assets/portfolio/gallery", { recursive: true });
const assets = [];
for (const item of plan) {
  const [left, top, width, height] = item.rect;
  const src = `/assets/portfolio/gallery/${item.name}.webp`;
  await sharp(`output/figma-originals/${item.frameId.replace(":", "-")}.png`)
    .extract({ left, top, width, height })
    .resize({
      width: 900,
      height: 900,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 90 })
    .toFile("public" + src);
  const meta = await sharp("public" + src).metadata();
  assets.push({ ...item, src, width: meta.width, height: meta.height });
}
// Interleave the subject types so every part of the curve shows a varied selection.
const mixed = Array.from(
  { length: assets.length },
  (_, i) => assets[(i * 7) % assets.length],
);
await fs.writeFile(
  "src/lib/curve-gallery-assets.json",
  JSON.stringify(mixed, null, 2) + "\n",
);
console.log(`Exported ${assets.length} independent gallery images.`);
