import { projects } from "./site-data";

const featuredSlugs = ["lemo-ai", "miaoshi-brand", "inner-species", "bandao"];
export const selectedProjects = [
  ...featuredSlugs.map((slug) => projects.find((project) => project.slug === slug)!),
  ...projects.filter((project) => !featuredSlugs.includes(project.slug) && project.slug !== "visual-explorations"),
];
