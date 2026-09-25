/**
 * 项目内容统一配置：日常只需修改这个文件。
 *
 * projects：每个项目的文字、封面与详情图片；数组顺序决定项目列表和“下一项目”。
 * selectedWork：首页作品顺序与大小；从 order 移除只隐藏首页卡片，详情页仍保留。
 * curveGallery：首页底部画廊图片，按数组顺序展示。
 * additionalExperience：经历列表的补充文字。
 *
 * 图片放在 public/assets/...，这里填写 /assets/...（不要带 public）。
 * selectedWorkCover 支持图片或视频；thumbnail 请填写静态图片。
 * assets 图片自动撑满详情容器，保持图片原始比例。
 * 新增图片：复制一项并修改 name、src；删除或拖动整项可删图或排序。
 * 修改 slug 会改变详情页网址；新增项目后可将 slug 加入 selectedWork.order。
 * 原始 *-assets.json 仅保留为素材导入记录，页面不再读取它们。
 */

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
  src: string;
  /** 原始裁切坐标，仅导入素材时使用，可省略。 */
  rect?: number[];
};
export type Project = {
  slug: string;
  /** 首页精选作品封面：填写 /assets/... 路径，支持图片或 .mp4 / .webm / .mov 视频。 */
  selectedWorkCover: string;
  /** 列表、下一项目和视频 poster 使用的静态封面。 */
  thumbnail: string;
  /** 详情页图片，按数组顺序展示；name 在当前项目内保持唯一。 */
  assets: Asset[];
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
    thumbnail: "/assets/portfolio/lemo-ai/thumbnail.webp",
    assets: [
      {
        "name": "lemo-studio-01",
        "src": "/assets/portfolio/lemo-ai/lemostudio_1.png",
      },
      {
        "name": "lemo-studio-02",
        "src": "/assets/portfolio/lemo-ai/lemostudio_2.png",
      },
        {
        "name": "lemo-studio-06",
        "src": "/assets/portfolio/lemo-ai/lemostudio_6.png",
      },
      {
        "name": "lemo-studio-03",
        "src": "/assets/portfolio/lemo-ai/lemostudio_3.png",
      },  
       {
        "name": "lemo-studio-04",
        "src": "/assets/portfolio/lemo-ai/lemostudio_4.png",
      },  
       {
        "name": "lemo-studio-05",
        "src": "/assets/portfolio/lemo-ai/lemostudio_5.png",  
      },  
    ],
    selectedWorkCover: "/assets/videos/lemo.mp4",
    title: "LEMO Studio",
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
    thumbnail: "/assets/portfolio/lemon8-campaigns/thumbnail.webp",
    assets: [
      {
        "name": "cover",
        "src": "/assets/portfolio/lemon8-campaigns/cover.webp",
      },
      {
        "name": "us-jp",
        "src": "/assets/portfolio/lemon8-campaigns/us-jp.webp",
      },
      {
        "name": "sea",
        "src": "/assets/portfolio/lemon8-campaigns/sea.webp",
      },
      {
        "name": "regional",
        "src": "/assets/portfolio/lemon8-campaigns/regional.webp",
      },
      {
        "name": "operations",
        "src": "/assets/portfolio/lemon8-campaigns/operations.webp",
      }
    ],
    selectedWorkCover: "/assets/portfolio/lemohuodong.png",
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
    thumbnail: "/assets/portfolio/miaoshi-brand/thumbnail.webp",
    assets: [
      {
        "name": "cover",
        "src": "/assets/portfolio/miaoshi-brand/cover.webp",
      },
      {
        "name": "identity",
        "src": "/assets/portfolio/miaoshi-brand/identity.webp",
      },
      {
        "name": "concept",
        "src": "/assets/portfolio/miaoshi-brand/concept.webp",
      },
      {
        "name": "guidelines",
        "src": "/assets/portfolio/miaoshi-brand/guidelines.webp",
      },
      {
        "name": "posters",
        "src": "/assets/portfolio/miaoshi-brand/posters.webp",
      },
      {
        "name": "application",
        "src": "/assets/portfolio/miaoshi-brand/application.webp",
      }
    ],
    selectedWorkCover: "/assets/portfolio/miaoshi-brand/miaoshi.png",
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
    thumbnail: "/assets/portfolio/inner-species/thumbnail.webp",
    assets: [
      {
        "name": "cover",
        "src": "/assets/portfolio/inner-species/cover.webp",
      },
      {
        "name": "brief",
        "src": "/assets/portfolio/inner-species/brief.webp",
      },
      {
        "name": "strategy",
        "src": "/assets/portfolio/inner-species/strategy.webp",
      },
      {
        "name": "typography",
        "src": "/assets/portfolio/inner-species/typography.webp",
      },
      {
        "name": "landing",
        "src": "/assets/portfolio/inner-species/landing.webp",
      },
      {
        "name": "questions",
        "src": "/assets/portfolio/inner-species/questions.webp",
      },
      {
        "name": "results",
        "src": "/assets/portfolio/inner-species/results.webp",
      },
      {
        "name": "outcome",
        "src": "/assets/portfolio/inner-species/outcome.webp",
      }
    ],
    selectedWorkCover: "/assets/portfolio/jian.png",
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
    thumbnail: "/assets/portfolio/bandao/thumbnail.webp",
    assets: [
      {
        "name": "cover",
        "src": "/assets/portfolio/bandao/cover.webp",
      },
      {
        "name": "brief",
        "src": "/assets/portfolio/bandao/brief.webp",
      },
      {
        "name": "strategy",
        "src": "/assets/portfolio/bandao/strategy.webp",
      },
      {
        "name": "ip",
        "src": "/assets/portfolio/bandao/ip.webp",
      },
      {
        "name": "family",
        "src": "/assets/portfolio/bandao/family.webp",
      },
      {
        "name": "identity",
        "src": "/assets/portfolio/bandao/identity.webp",
      },
      {
        "name": "aigc",
        "src": "/assets/portfolio/bandao/aigc.webp",
      },
      {
        "name": "application",
        "src": "/assets/portfolio/bandao/application.webp",
      }
    ],
    selectedWorkCover: "/assets/portfolio/bandao.png",
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
    thumbnail: "/assets/portfolio/meetup-plan/thumbnail.webp",
    assets: [
      {
        "name": "cover",
        "src": "/assets/portfolio/meetup-plan/cover.webp",
      },
      {
        "name": "brief",
        "src": "/assets/portfolio/meetup-plan/brief.webp",
      },
      {
        "name": "concept",
        "src": "/assets/portfolio/meetup-plan/concept.webp",
      },
      {
        "name": "identity",
        "src": "/assets/portfolio/meetup-plan/identity.webp",
      },
      {
        "name": "cycling",
        "src": "/assets/portfolio/meetup-plan/cycling.webp",
      },
      {
        "name": "materials",
        "src": "/assets/portfolio/meetup-plan/materials.webp",
      }
    ],
    selectedWorkCover: "/assets/portfolio/miao.png",
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
    thumbnail: "/assets/portfolio/winter-gathering/thumbnail.webp",
    assets: [
      {
        "name": "cover",
        "src": "/assets/portfolio/winter-gathering/cover.webp",
      },
      {
        "name": "brief",
        "src": "/assets/portfolio/winter-gathering/brief.webp",
      },
      {
        "name": "strategy",
        "src": "/assets/portfolio/winter-gathering/strategy.webp",
      },
      {
        "name": "typography",
        "src": "/assets/portfolio/winter-gathering/typography.webp",
      },
      {
        "name": "h5",
        "src": "/assets/portfolio/winter-gathering/h5.webp",
      },
      {
        "name": "offline",
        "src": "/assets/portfolio/winter-gathering/offline.webp",
      },
      {
        "name": "outcome",
        "src": "/assets/portfolio/winter-gathering/outcome.webp",
      }
    ],
    selectedWorkCover: "/assets/portfolio/jiu.png",
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
    thumbnail: "/assets/portfolio/vinyl-anniversary/thumbnail.webp",
    assets: [
      {
        "name": "cover",
        "src": "/assets/portfolio/vinyl-anniversary/cover.webp",
      },
      {
        "name": "brief",
        "src": "/assets/portfolio/vinyl-anniversary/brief.webp",
      },
      {
        "name": "strategy",
        "src": "/assets/portfolio/vinyl-anniversary/strategy.webp",
      },
      {
        "name": "experience",
        "src": "/assets/portfolio/vinyl-anniversary/experience.webp",
      },
      {
        "name": "outcome",
        "src": "/assets/portfolio/vinyl-anniversary/outcome.webp",
      }
    ],
    selectedWorkCover: "/assets/portfolio/10.png",
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
    thumbnail: "/assets/portfolio/youth-album/thumbnail.webp",
    assets: [
      {
        "name": "cover",
        "src": "/assets/portfolio/youth-album/cover.webp",
      },
      {
        "name": "experience",
        "src": "/assets/portfolio/youth-album/experience.webp",
      }
    ],
    selectedWorkCover: "/assets/portfolio/qing.png",
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
    thumbnail: "/assets/portfolio/social-live/thumbnail.webp",
    assets: [
      {
        "name": "cover",
        "src": "/assets/portfolio/social-live/cover.webp",
      },
      {
        "name": "brief",
        "src": "/assets/portfolio/social-live/brief.webp",
      },
      {
        "name": "strategy",
        "src": "/assets/portfolio/social-live/strategy.webp",
      },
      {
        "name": "guidelines",
        "src": "/assets/portfolio/social-live/guidelines.webp",
      },
      {
        "name": "business",
        "src": "/assets/portfolio/social-live/business.webp",
      },
      {
        "name": "campaigns",
        "src": "/assets/portfolio/social-live/campaigns.webp",
      },
      {
        "name": "components",
        "src": "/assets/portfolio/social-live/components.webp",
      }
    ],
    selectedWorkCover: "/assets/portfolio/long.png",
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
    thumbnail: "/assets/portfolio/design-operations/thumbnail.webp",
    assets: [
      {
        "name": "cover",
        "src": "/assets/portfolio/design-operations/cover.webp",
      },
      {
        "name": "brief",
        "src": "/assets/portfolio/design-operations/brief.webp",
      },
      {
        "name": "strategy",
        "src": "/assets/portfolio/design-operations/strategy.webp",
      },
      {
        "name": "map",
        "src": "/assets/portfolio/design-operations/map.webp",
      },
      {
        "name": "requirements",
        "src": "/assets/portfolio/design-operations/requirements.webp",
      },
      {
        "name": "resources",
        "src": "/assets/portfolio/design-operations/resources.webp",
      }
    ],
    selectedWorkCover: "/assets/portfolio/design-operations/thumbnail.webp",
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
    thumbnail: "/assets/portfolio/visual-explorations/thumbnail.webp",
    assets: [
      {
        "name": "cover",
        "src": "/assets/portfolio/visual-explorations/cover.webp",
      },
      {
        "name": "look",
        "src": "/assets/portfolio/visual-explorations/look.webp",
      },
      {
        "name": "annual",
        "src": "/assets/portfolio/visual-explorations/annual.webp",
      },
      {
        "name": "annual-chapters",
        "src": "/assets/portfolio/visual-explorations/annual-chapters.webp",
      },
      {
        "name": "annual-scenes",
        "src": "/assets/portfolio/visual-explorations/annual-scenes.webp",
      },
      {
        "name": "annual-detail",
        "src": "/assets/portfolio/visual-explorations/annual-detail.webp",
      },
      {
        "name": "maps",
        "src": "/assets/portfolio/visual-explorations/maps.webp",
      },
      {
        "name": "badges",
        "src": "/assets/portfolio/visual-explorations/badges.webp",
      },
      {
        "name": "stickers",
        "src": "/assets/portfolio/visual-explorations/stickers.webp",
      },
      {
        "name": "more",
        "src": "/assets/portfolio/visual-explorations/more.webp",
      }
    ],
    selectedWorkCover: "/assets/portfolio/visual-explorations/thumbnail.webp",
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

/** 首页展示顺序；compact 中的项目使用小尺寸卡片。 */
export const selectedWork = {
  order: ["lemo-ai", "miaoshi-brand", "inner-species", "bandao", "lemon8-campaigns", "meetup-plan", "winter-gathering", "vinyl-anniversary", "youth-album", "social-live", "design-operations"],
  compact: ["miaoshi-brand", "inner-species", "lemon8-campaigns", "meetup-plan", "youth-album", "design-operations"],
};

export type TimelineEntry = {
  company: string;
  title: string;
  category: string;
  slug?: string;
  /** 只填写已确认的日期，例如 2024-01；null 显示待补充。 */
  date: string | null;
};

export const additionalExperience: TimelineEntry[] = [
  { company: "马蜂窝", title: "旅行地图与成就勋章", category: "用户增长 / 成长体系", slug: "visual-explorations", date: null },
  { company: "字节跳动", title: "今日头条 / 西瓜视频", category: "品牌 / 运营视觉", date: null },
];

/** 这些项目用上方补充经历展示，不重复生成普通经历条目。 */
export const timelineExcludedSlugs = ["visual-explorations"];

/** 首页底部画廊；project 对应上方项目的 slug。 */
export const curveGallery: (Asset & { project: string; title: string; width: number; height: number })[] = [
  {
    "name": "inner-species-500-904",
    "title": "内心物种 1",
    "project": "inner-species",
    "src": "/assets/portfolio/gallery/inner-species-500-904.webp",
    "width": 551,
    "height": 459
  },
  {
    "name": "miaoshi-brand-500-1781",
    "title": "妙时品牌图形 2",
    "project": "miaoshi-brand",
    "src": "/assets/portfolio/gallery/miaoshi-brand-500-1781.webp",
    "width": 859,
    "height": 498
  },
  {
    "name": "miaoshi-brand-500-1939",
    "title": "妙时生活海报 6",
    "project": "miaoshi-brand",
    "src": "/assets/portfolio/gallery/miaoshi-brand-500-1939.webp",
    "width": 228,
    "height": 407
  },
  {
    "name": "lemo-model-2",
    "title": "3D Lemo 模型",
    "project": "lemo-ai",
    "src": "/assets/portfolio/gallery/lemo-model-2.webp",
    "width": 785,
    "height": 392
  },
  {
    "name": "inner-species-500-908",
    "title": "内心物种 5",
    "project": "inner-species",
    "src": "/assets/portfolio/gallery/inner-species-500-908.webp",
    "width": 551,
    "height": 459
  },
  {
    "name": "miaoshi-brand-500-1936",
    "title": "妙时生活海报 3",
    "project": "miaoshi-brand",
    "src": "/assets/portfolio/gallery/miaoshi-brand-500-1936.webp",
    "width": 227,
    "height": 407
  },
  {
    "name": "bandao-500-2172",
    "title": "伴岛社区角色 4",
    "project": "bandao",
    "src": "/assets/portfolio/gallery/bandao-500-2172.webp",
    "width": 235,
    "height": 234
  },
  {
    "name": "inner-species-500-905",
    "title": "内心物种 2",
    "project": "inner-species",
    "src": "/assets/portfolio/gallery/inner-species-500-905.webp",
    "width": 551,
    "height": 459
  },
  {
    "name": "miaoshi-brand-500-1795",
    "title": "妙时品牌图形 3",
    "project": "miaoshi-brand",
    "src": "/assets/portfolio/gallery/miaoshi-brand-500-1795.webp",
    "width": 858,
    "height": 470
  },
  {
    "name": "bandao-500-2165",
    "title": "伴岛社区角色 1",
    "project": "bandao",
    "src": "/assets/portfolio/gallery/bandao-500-2165.webp",
    "width": 235,
    "height": 234
  },
  {
    "name": "lemo-model-3",
    "title": "插画风格模型",
    "project": "lemo-ai",
    "src": "/assets/portfolio/gallery/lemo-model-3.webp",
    "width": 785,
    "height": 392
  },
  {
    "name": "inner-species-500-909",
    "title": "内心物种 6",
    "project": "inner-species",
    "src": "/assets/portfolio/gallery/inner-species-500-909.webp",
    "width": 541,
    "height": 451
  },
  {
    "name": "miaoshi-brand-500-1937",
    "title": "妙时生活海报 4",
    "project": "miaoshi-brand",
    "src": "/assets/portfolio/gallery/miaoshi-brand-500-1937.webp",
    "width": 227,
    "height": 407
  },
  {
    "name": "bandao-500-2173",
    "title": "伴岛社区角色 5",
    "project": "bandao",
    "src": "/assets/portfolio/gallery/bandao-500-2173.webp",
    "width": 234,
    "height": 234
  },
  {
    "name": "inner-species-500-906",
    "title": "内心物种 3",
    "project": "inner-species",
    "src": "/assets/portfolio/gallery/inner-species-500-906.webp",
    "width": 551,
    "height": 459
  },
  {
    "name": "miaoshi-brand-500-1934",
    "title": "妙时生活海报 1",
    "project": "miaoshi-brand",
    "src": "/assets/portfolio/gallery/miaoshi-brand-500-1934.webp",
    "width": 227,
    "height": 407
  },
  {
    "name": "bandao-500-2166",
    "title": "伴岛社区角色 2",
    "project": "bandao",
    "src": "/assets/portfolio/gallery/bandao-500-2166.webp",
    "width": 234,
    "height": 234
  },
  {
    "name": "lemo-model-4",
    "title": "日本活动视觉模型",
    "project": "lemo-ai",
    "src": "/assets/portfolio/gallery/lemo-model-4.webp",
    "width": 785,
    "height": 392
  },
  {
    "name": "miaoshi-brand-500-1780",
    "title": "妙时品牌图形 1",
    "project": "miaoshi-brand",
    "src": "/assets/portfolio/gallery/miaoshi-brand-500-1780.webp",
    "width": 859,
    "height": 470
  },
  {
    "name": "miaoshi-brand-500-1938",
    "title": "妙时生活海报 5",
    "project": "miaoshi-brand",
    "src": "/assets/portfolio/gallery/miaoshi-brand-500-1938.webp",
    "width": 227,
    "height": 407
  },
  {
    "name": "lemo-model-1",
    "title": "Lemo IP 模型",
    "project": "lemo-ai",
    "src": "/assets/portfolio/gallery/lemo-model-1.webp",
    "width": 785,
    "height": 392
  },
  {
    "name": "inner-species-500-907",
    "title": "内心物种 4",
    "project": "inner-species",
    "src": "/assets/portfolio/gallery/inner-species-500-907.webp",
    "width": 551,
    "height": 459
  },
  {
    "name": "miaoshi-brand-500-1935",
    "title": "妙时生活海报 2",
    "project": "miaoshi-brand",
    "src": "/assets/portfolio/gallery/miaoshi-brand-500-1935.webp",
    "width": 228,
    "height": 407
  },
  {
    "name": "bandao-500-2167",
    "title": "伴岛社区角色 3",
    "project": "bandao",
    "src": "/assets/portfolio/gallery/bandao-500-2167.webp",
    "width": 236,
    "height": 234
  }
];
