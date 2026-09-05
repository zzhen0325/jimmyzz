import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve("next/package.json"))("sharp");
const root = process.cwd();
const exports = JSON.parse(
  await fs.readFile(path.join(root, "output/figma-downloads.json"), "utf8"),
);
const plan = JSON.parse(
  await fs.readFile(path.join(root, "docs/portfolio-assets-plan.json"), "utf8"),
);
const manifest = {};
await fs.mkdir(path.join(root, "output/figma-originals"), { recursive: true });
for (const item of exports) {
  const dest = path.join(
    root,
    "output/figma-originals",
    item.id.replace(":", "-") + ".png",
  );
  try {
    await fs.access(dest);
  } catch {
    const response = await fetch(item.data.url);
    if (!response.ok)
      throw new Error(`Figma export ${item.id}: ${response.status}`);
    await fs.writeFile(dest, Buffer.from(await response.arrayBuffer()));
  }
  const meta = await sharp(dest).metadata();
  for (const project of plan.filter((p) => p.nodeId === item.id)) {
    const dir = path.join(root, "public/assets/portfolio", project.slug);
    await fs.mkdir(dir, { recursive: true });
    const assets = [];
    for (const region of project.regions) {
      const [x, y, width, height] = region.rect;
      if (x + width > meta.width || y + height > meta.height)
        throw new Error(`Invalid crop ${project.slug}/${region.name}`);
      const filename = `${region.name}.webp`;
      const file = path.join(dir, filename);
      await sharp(dest)
        .extract({ left: x, top: y, width, height })
        .webp({ quality: 88 })
        .toFile(file);
      assets.push({
        ...region,
        src: `/assets/portfolio/${project.slug}/${filename}`,
        width,
        height,
      });
      if (region.name === "cover") {
        const [tx, ty, tw, th] = project.thumbnailRect ?? region.rect;
        if (["lemo-ai", "miaoshi-brand", "inner-species", "bandao"].includes(project.slug)) {
          await sharp(dest).extract({ left: tx, top: ty, width: tw, height: th }).webp({ quality: 90 }).toFile(path.join(dir, "feature.webp"));
        }
        await sharp(dest)
          .extract({ left: tx, top: ty, width: tw, height: th })
          .resize({ width: 960, withoutEnlargement: true })
          .webp({ quality: 84 })
          .toFile(path.join(dir, "thumbnail.webp"));
      }
    }
    manifest[project.slug] = { nodeId: project.nodeId, assets };
    console.log(`${project.slug}: ${assets.length} assets`);
  }
}
await fs.writeFile(
  path.join(root, "src/lib/portfolio-assets.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log("Portfolio asset manifest updated.");
