import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const filename = path.resolve("src/lib/figma-new-projects.ts");
const source = await fs.readFile(filename, "utf8");
// Evaluate only this repository's static project definitions after stripping
// TypeScript. No Figma text is evaluated.
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText.replace(
  /import details from ["']\.\/figma-project-details\.json["'];/,
  'import details from "../../src/lib/figma-project-details.json" with { type: "json" };',
);
const generated = path.resolve("output/figma-1012/new-projects.mjs");
await fs.writeFile(generated, compiled);
const { figmaNewProjects } = await import(pathToFileURL(generated).href);
const details = JSON.parse(await fs.readFile("src/lib/figma-project-details.json", "utf8"));
const contentFile = path.join(process.env.CONTENT_DIR || "data", "content.json");
const content = JSON.parse(await fs.readFile(contentFile, "utf8"));
const protectedLemo = JSON.stringify(content.projects.find(p => p.slug === "lemo-ai"));
content.projects = content.projects.map(p => details[p.slug] ? { ...p, assets: details[p.slug] } : p);
for (const project of figmaNewProjects) {
  if (!content.projects.some(p => p.slug === project.slug)) content.projects.push(project);
  if (!content.selectedWork.order.includes(project.slug)) content.selectedWork.order.push(project.slug);
}
if (JSON.stringify(content.projects.find(p => p.slug === "lemo-ai")) !== protectedLemo)
  throw new Error("LEMO Studio must remain unchanged.");
await fs.writeFile(`${contentFile}.tmp`, JSON.stringify(content, null, 2) + "\n");
await fs.rename(`${contentFile}.tmp`, contentFile);
console.log(`Updated ${Object.keys(details).length} project galleries; added ${figmaNewProjects.length} new project pages.`);
