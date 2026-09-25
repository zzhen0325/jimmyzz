import { projects } from "./projects-config";
import type { Asset } from "./projects-config";
export { projects, categories } from "./projects-config";
export type { Asset, Project, Category } from "./projects-config";

export const portfolioSource =
  "https://www.figma.com/design/r8qco3DrEwzN7iWP6v6lPk/24new?node-id=500-353";
export const profile = {
  name: "张振",
  alias: "ZZ",
  role: "视觉设计师 / Creative Designer & Engineer",
  email: "zzhen0325@gmail.com",
  introduction:
    "用视觉建立品牌，用体验连接用户。将插画、字体、三维与动效融入产品，也用 AI 与代码探索设计的新可能。",
};
// Keep existing consumers on one shared source of project content.
export function projectAssets(slug: string): Asset[] {
  return projects.find((project) => project.slug === slug)?.assets ?? [];
}
export function projectCover(slug: string) {
  return projects.find((project) => project.slug === slug)?.thumbnail ?? "";
}
export const services = [
  {
    title: "品牌与 IP",
    text: "从品牌定位、视觉规范到角色与应用，建立一致且可延展的表达。",
  },
  {
    title: "营销与体验",
    text: "结合业务目标与用户情绪，把概念落到 H5、活动和线上线下触点。",
  },
  {
    title: "AI 与创意工具",
    text: "探索定制模型、工作流与创作平台，让设计经验成为可复用的工具。",
  },
  {
    title: "团队与设计系统",
    text: "梳理需求、规划资源、沉淀组件，帮助团队持续交付。",
  },
];
