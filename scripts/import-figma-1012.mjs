import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

// Original 2× PNG exports are downloaded with Figma download_assets into this
// ignored directory. Coordinates in the plan are Figma canvas pixels.
const plan = JSON.parse(await fs.readFile("docs/figma-1012-export-plan.json", "utf8"));
const manifest = JSON.parse(await fs.readFile("src/lib/figma-project-details.json", "utf8").catch(() => "{}"));
const requested = process.argv.slice(2);
for (const project of plan.projects.filter(p => !requested.length || requested.includes(p.slug))) {
  const directory = path.join("public/assets/portfolio", project.slug, "figma-1012");
  await fs.mkdir(directory, { recursive: true });
  const assets = [];
  for (const source of project.sources ?? [project]) {
    const file = `output/figma-1012/${source.nodeId.replace(":", "-")}.png`;
    const metadata = await sharp(file).metadata();
    const sourceWidth = source.width ?? 1920;
    // Figma caps very tall exports at 32768px. Keep the genuine export pixels
    // instead of upscaling; map crop coordinates using the actual dimensions.
    const sourceHeight = plan.sourceHeights?.[source.nodeId];
    const scaleY = sourceHeight ? metadata.height / sourceHeight : plan.scale;
    if (metadata.width < sourceWidth || metadata.width > sourceWidth * plan.scale)
      throw new Error(`Unexpected export scale: ${file}`);
    for (const [start, end] of source.ranges) {
      const top = Math.round(start * scaleY);
      const bottom = Math.round(end * scaleY);
      if (bottom > metadata.height || bottom <= top) throw new Error(`Invalid range: ${project.slug}`);
      const name = `detail-${String(assets.length + 1).padStart(2, "0")}`;
      const filename = `${name}.webp`;
      const width = metadata.width;
      const height = bottom - top;
      await sharp(file)
        .extract({ left: 0, top, width, height })
        .webp({ quality: 94, effort: 5, smartSubsample: true })
        .toFile(path.join(directory, filename));
      assets.push({ name, src: `/assets/portfolio/${project.slug}/figma-1012/${filename}`, width, height });
    }
  }
  // Only new projects consume this thumbnail. Existing home covers are kept.
  await sharp(`public${assets[0].src}`).resize({ width: 1200, withoutEnlargement: true })
    .webp({ quality: 90 }).toFile(path.join(directory, "thumbnail.webp"));
  manifest[project.slug] = assets;
  console.log(`${project.slug}: ${assets.length} sections`);
}
await fs.writeFile("src/lib/figma-project-details.json", JSON.stringify(manifest, null, 2) + "\n");
