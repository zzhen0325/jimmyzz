import assetManifest from "./portfolio-assets.json";

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
export const categories = [
  "全部",
  "品牌与 IP",
  "H5 营销",
  "海外活动",
  "AIGC",
  "设计管理",
  "视觉探索",
] as const;
export type Category = (typeof categories)[number];
export type Asset = {
  name: string;
  title: string;
  src: string;
  width: number;
  height: number;
  rect: number[];
};
export type Project = {
  slug: string;
  title: string;
  english: string;
  kind: Category;
  client: string;
  summary: string;
  tags: string[];
  color: string;
  description: string;
  challenge: string;
  approach: string;
  results?: { value: string; label: string }[];
};
export const projects: Project[] = [
  {
    slug: "lemo-ai",
    title: "All about AIGC",
    english: "From experiments to tools",
    kind: "AIGC",
    client: "Lemon8",
    summary: "从 AI 工作坊、模型训练到团队创作平台，让探索成为可复用的能力。",
    tags: ["AI Workshop", "LoRA", "Creative tools"],
    color: "#bbc9a5",
    description:
      "围绕 Lemon8 的日常设计场景，串联 AI 工具培训、定制化 LoRA 模型训练、工作流封装与团队资产管理。让非设计同学也能理解并使用 AI，让设计团队的生成经验逐步沉淀。",
    challenge:
      "将分散的 AI 工具与个人生成经验转化为团队可理解、可复用的创作流程，兼顾非设计同学的使用门槛。",
    approach:
      "从 ComfyUI 工作流与简易界面开始，逐步整合提示词优化、模型选择、生成与编辑。Lemo AI Studio 将 Prompt、参考图、参数、工作流及结果汇聚为团队资产；Goodcase 则将图片与生成参数绑定，支持灵感探索与复用。",
  },
  {
    slug: "lemon8-campaigns",
    title: "Lemon8 Campaigns",
    english: "Across cultures, beyond borders",
    kind: "海外活动",
    client: "Lemon8",
    summary: "面向 US、JP 与 SEA 市场的活动主视觉与日常运营设计。",
    tags: ["Campaign", "US / JP / SEA", "Visual design"],
    color: "#e0d877",
    description:
      "围绕 Lemon8 不同区域的活动场景，展开主视觉、插画与运营物料设计。作品覆盖美国、日本及东南亚市场，呈现不同文化语境下的视觉表达。",
    challenge:
      "在美国、日本与东南亚不同文化语境中适配活动视觉，同时保持品牌表达与运营物料的一致性。",
    approach:
      "以具体活动为单位组织视觉语言，结合区域审美与内容情境，将主题延展到活动页面和运营素材。案例按区域活动与日常运营两条线展开。",
  },
  {
    slug: "miaoshi-brand",
    title: "妙时品牌",
    english: "This way to love",
    kind: "品牌与 IP",
    client: "网易云音乐 · 妙时",
    summary: "有人懂，就是奇妙时刻。用箭头、色彩与生活场景建立同频社交品牌。",
    tags: ["Brand identity", "Guidelines", "Art direction"],
    color: "#fb1386",
    description:
      "妙时是网易云音乐出品的同频社交 APP，借助音乐元素连接同好，并围绕 Livehouse、音乐节形成线下交友连接点。品牌希望通过音乐与情绪价值，更具体地表达用户的内心世界。",
    challenge:
      "将音乐、情绪与同频社交的抽象定位转化为可识别的视觉语言，并延展到线上线下的品牌触点。",
    approach:
      "用箭头表达通向爱情的方向，通过不同方向、颜色和比例指代不同频率的人。红色延续网易云音乐的品牌关联，蓝色与粉色建立成对的视觉关系；规范、海报与子品牌应用共同构成完整系统。",
  },
  {
    slug: "inner-species",
    title: "鉴一鉴你的内心物种",
    english: "Meet your inner creature",
    kind: "H5 营销",
    client: "网易云音乐 · 妙时",
    summary: "把情绪变成角色，用一场有趣的测试找到懂彼此的人。",
    tags: ["H5", "Character design", "Social sharing"],
    color: "#ed96d9",
    description:
      "作为妙时新产品的品牌宣传活动，通过不同场景的情绪反应测试，为网易云音乐用户生成物种标签，并引导到妙时进行标签配对，传达“这里都是有趣的人”的产品调性。",
    challenge:
      "将复杂的情绪反应变成容易理解的测试体验，连接角色识别、社交配对与用户分享。",
    approach:
      "以鉴定中心建立场景，结合专家、答题卡和情绪小人降低参与门槛。将复杂情绪转译成通俗易懂的物种形象，贯穿加载、答题、结果与分享流程，为传播创造动机。",
    results: [
      { value: "33.7%", label: "总分享率" },
      { value: "52.3%", label: "完成测试用户分享率" },
      { value: "近 100%", label: "五道问答题漏斗留存" },
    ],
  },
  {
    slug: "bandao",
    title: "伴岛",
    english: "A little island, a shared world",
    kind: "品牌与 IP",
    client: "网易云音乐 · 蛋仔派对",
    summary: "从蛋仔 IP 到社区文化，为大学生建立清爽有趣的共同空间。",
    tags: ["IP design", "Community", "AIGC"],
    color: "#ffce64",
    description:
      "网易云音乐社交业务联合蛋仔派对出品的大学生社区 APP。从学生身份切入，以学校为天然群组，建立年轻、有趣的社区。品牌主张是“来伴岛，和小伙伴一起玩”。",
    challenge:
      "在延续蛋仔 IP 识别度的同时，建立面向大学生的社区文化，并探索个性化形象的生成方式。",
    approach:
      "延续蛋仔品牌元素，以班长、风纪委员、文艺委员等角色建立社区文化。探索 ControlNet 与 LoRA 的形象生成流程，为用户提供专属蛋仔形象，并延展至主页、盲盒池与社区互动场景。",
  },
  {
    slug: "meetup-plan",
    title: "奇妙接头计划",
    english: "Take the connection outside",
    kind: "品牌与 IP",
    client: "妙时",
    summary: "让同频的人在线下相遇，连接骑行、徒步、露营与摄影。",
    tags: ["Sub-brand", "Outdoor", "Campaign"],
    color: "#ed4b69",
    description:
      "妙时线下生活方式子品牌，以骑行、徒步、露营和摄影等活动建立兴趣圈子，通过 H5 承接线上线下联动，并与线下门店联合增加品牌曝光。",
    challenge:
      "让线上同频社交自然延伸到线下兴趣活动，并在多种生活方式场景中保持品牌识别。",
    approach:
      "延续红蓝品牌色与箭头元素，用两个箭头的碰撞表达“接头”。从标志、字体到骑行活动与线下物料，让线上社交自然延伸到真实的生活方式场景。",
  },
  {
    slug: "winter-gathering",
    title: "冬至有酒局",
    english: "A warm encounter on a cold night",
    kind: "H5 营销",
    client: "妙时 × 网易云音乐",
    summary: "饺子就酒，把冬至夜的温暖带到上海长乐路。",
    tags: ["Online to offline", "H5", "Event"],
    color: "#ff604f",
    description:
      "妙时与网易云音乐在上海长乐路联合五家小酒馆发起冬至活动，邀请年轻人喝酒、相遇。项目包含线上 H5 与线下物料、品牌周边，拓展真实交友场景。",
    challenge:
      "串联线上 H5、抽奖与五家线下酒馆的活动体验，让联合品牌在不同触点中保持一致表达。",
    approach:
      "将饺子和酒进行轻松有趣的概念包装，以线上 H5 预告并承接抽奖；线下通过红蓝色彩、箭头元素和品牌物料保持鲜明识别。",
    results: [
      { value: "9700w+", label: "全网曝光" },
      { value: "550w+", label: "站内话题阅读" },
      { value: "3000+", label: "线下活动参与人次" },
    ],
  },
  {
    slug: "vinyl-anniversary",
    title: "黑胶纪念墙",
    english: "Ten years, one shared record",
    kind: "H5 营销",
    client: "网易云音乐 × 妙时",
    summary: "在云村十周年的公共纪念空间，认识跟你合拍的人。",
    tags: ["Anniversary", "Co-branding", "H5"],
    color: "#eabc83",
    description:
      "网易云音乐十周年之际，以品牌联名形式打造黑胶纪念墙。在纪念主题中融入妙时的社交玩法，让音乐情怀与个性化社交名片产生连接。",
    challenge:
      "在十周年纪念的情怀中融入社交玩法，让公共纪念空间与个人表达形成连接。",
    approach:
      "通过黑胶唱片承载音乐属性与周年纪念，设计公共黑胶墙、个人制作流程和分享凭证。将温暖、怀旧的情绪与认识同频用户的动机结合。",
    results: [
      { value: "9.5%", label: "入口 CTR" },
      { value: "30%", label: "总分享率" },
      { value: "+18.9%", label: "妙时 DAU" },
      { value: "+21.7%", label: "新客 DAU" },
    ],
  },
  {
    slug: "youth-album",
    title: "青春纪念册",
    english: "The songs we grew up with",
    kind: "H5 营销",
    client: "妙时",
    summary: "借一张自选歌单、一份同学录，在毕业季寻找身边同好。",
    tags: ["Graduation", "Music", "H5"],
    color: "#fd496d",
    description:
      "在毕业季时间点，以用户自选歌单和同学录的形式，帮助用户寻找身边同好。音乐成为连接青春记忆与社交关系的载体。",
    challenge:
      "将毕业季的音乐记忆转化为参与和分享的动机，在完整流程中强化品牌识别。",
    approach:
      "以强品牌色贯穿歌单主页、结果页与分享页，在完整参与流程中强化妙时的视觉记忆点。",
  },
  {
    slug: "social-live",
    title: "社交直播业务群",
    english: "One family, many connections",
    kind: "品牌与 IP",
    client: "网易云音乐 · 社交直播",
    summary: "统一多产品品牌表达，让视觉系统支持多样的社交与营收场景。",
    tags: ["Brand system", "Revenue campaigns", "Components"],
    color: "#bd82fa",
    description:
      "以心遇为主的社交直播业务，覆盖语音房、派对房等模式，并孵化不同版本的产品。面对多变的业务需求，需要保持品牌延续与场景适配。",
    challenge:
      "在多产品、多玩法与变化频繁的业务需求中，兼顾品牌延续、场景适配与设计复用。",
    approach:
      "以爱心元素统一品牌家族，结合高饱和色彩与情感诉求构建视觉规范。针对榜单、抽奖、任务和互动玩法建立组件库，提高不同产品活动的复用效率。",
  },
  {
    slug: "design-operations",
    title: "设计团队与资源规划",
    english: "Make space for better work",
    kind: "设计管理",
    client: "网易云音乐 · 社交直播",
    summary: "将复杂的多产品需求，转化为清晰的需求地图与资源安排。",
    tags: ["Team", "Design operations", "Planning"],
    color: "#95c8ef",
    description:
      "原稿记录了带领 8 人小组（2 正式员工与 6 外包）承接社交直播业务线视觉需求的实践。产品多、上下游复杂，需要统一整理规划以满足不同业务目标。",
    challenge:
      "面对多产品与复杂上下游需求，在有限团队资源中平衡优先级、交付质量和效率。",
    approach:
      "从需求频次、属性、体量、优先级与场景拆解业务，再结合团队成员能力、熟悉度与沟通成本分配资源，将质量和效率放在同一个规划框架中。",
  },
  {
    slug: "visual-explorations",
    title: "视觉探索与更多",
    english: "A collection of possibilities",
    kind: "视觉探索",
    client: "LOOK 直播 / 马蜂窝 / 个人探索",
    summary: "从年度盛典到旅行地图、成就勋章和贴纸，探索不同尺度的视觉表达。",
    tags: ["3D", "Illustration", "Visual experiments"],
    color: "#8baaf8",
    description:
      "收录 LOOK 直播年度盛典、社交直播年鉴视觉、马蜂窝旅行地图与成就勋章体系，以及贴纸和其他视觉探索。",
    challenge:
      "适应活动舞台、旅行地图、勋章与贴纸等不同尺度的媒介，让视觉叙事贴合各自的使用场景。",
    approach:
      "LOOK 年度盛典以赛博城市高塔与舞台承接预赛、正赛的推进；旅行地图和勋章体系围绕旅行经历与成就感组织信息。不同媒介共同呈现插画、三维与视觉叙事的实践。",
  },
];
export function projectAssets(slug: string): Asset[] {
  return (
    (assetManifest as Record<string, { assets: Asset[] }>)[slug]?.assets ?? []
  );
}
export function projectCover(slug: string) {
  return `/assets/portfolio/${slug}/thumbnail.webp`;
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
