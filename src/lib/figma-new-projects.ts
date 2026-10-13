import type { Project } from "./projects-config";
import details from "./figma-project-details.json";

const entries = [
  {
    slug: "ai-workshop", title: "AI Workshop", english: "AI Workshop",
    kind: "AIGC", client: "Lemon8 · TikTok", tags: ["AI", "Workshop", "Creative tools"], color: "#faf9a6",
    summary: "面向设计与运营团队的 AI 图像创作工作坊。",
    description: "帮助团队建立对 AI 工具的认知，理解基础玩法与应用逻辑，并结合 Lemo Prompt 与 Lemo AI Playground，将 IP 形象和活动 KV 的生成应用于日常设计。",
  },
  {
    slug: "lora-training", title: "LoRA Training", english: "LoRA Training",
    kind: "AIGC", client: "Lemon8 · TikTok", tags: ["LoRA", "IP", "Image generation"], color: "#e4f9ce",
    summary: "围绕 Lemo IP、活动 KV 和插画风格训练定制模型。",
    description: "根据 Lemon8 的业务场景，训练 Lemo IP、US KV、JP KV 及多种插画风格的 LoRA 模型，并随基础模型迭代持续更新，提升内容生成的一致性与质量。",
  },
  {
    slug: "creative-ai-workflow", title: "Vibe Coding & Image Skills", english: "Creative AI Workflow",
    kind: "AIGC", client: "Jimmy ZZ", tags: ["Vibe Coding", "Workflow", "Image Skills"], color: "#c9eff7",
    summary: "从需求定义到构建与调试，梳理设计师和 AI 的协作流程。",
    description: "整理 Vibe Coding 的需求定义、智能规划、构建实现与验证调试流程，以及图像创作中的提示词方法与参考图分析维度。",
  },
  {
    slug: "lemon8-valentines", title: "Lemon8 · 情人节活动", english: "Valentine’s Day",
    kind: "海外活动", client: "Lemon8 · US", tags: ["Campaign", "AIGC", "Visual Design"], color: "#b74757",
    summary: "用情书信封与留言墙，邀请用户分享关于爱的故事。",
    description: "Lemon8 美国地区情人节活动，借助 AI 生成邮筒、信封和玫瑰等视觉元素，以深红色留言墙和粉色主题营造节日氛围，以情书信封作为核心互动符号。",
  },
  {
    slug: "lemon8-campaign-collection", title: "Lemon8 · 活动视觉合集", english: "More Lemon8 Campaigns",
    kind: "海外活动", client: "Lemon8", tags: ["Campaign", "Visual Design"], color: "#ffef65",
    summary: "Lemon8 不同活动主题与场景下的视觉设计合集。",
    description: "收录原作品集 Campaign Design 章节中的其他活动视觉，展示多样主题下的版式、插画与品牌表达。",
  },
  {
    slug: "look-design-yearbook", title: "LOOK · 营收设计年鉴", english: "LOOK Design Yearbook",
    kind: "视觉探索", client: "网易云音乐 · LOOK 直播", tags: ["Yearbook", "Visual Design", "Campaign"], color: "#ed4299",
    summary: "LOOK 直播营收设计的年度视觉整理。",
    description: "以鲜明的粉色与数字舞台语言，呈现 LOOK 直播 2021—2022 营收设计年鉴的视觉设计。",
  },
] satisfies Array<Pick<Project, "slug" | "title" | "english" | "kind" | "client" | "tags" | "color" | "summary" | "description">>;

export const figmaNewProjects: Project[] = entries.map((entry) => {
  const assets = details[entry.slug as keyof typeof details];
  const cover = `/assets/portfolio/${entry.slug}/figma-1012/thumbnail.webp`;
  return {
    ...entry, assets, selectedWorkCover: cover, thumbnail: cover,
    coverWidth: assets[0].width, coverHeight: assets[0].height,
    challenge: "", approach: "",
  };
});
