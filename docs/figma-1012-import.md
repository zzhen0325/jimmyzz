# 1012 作品集详情图导入

来源：[0913 / 1012](https://www.figma.com/design/Fa7MwAlImSZD7D8D29vvgf/0913?node-id=250-1932)。导入日期：2026-10-13。

按项目和原稿章节导出 102 张详情图，更新 13 个已有项目，新增 6 个项目。LEMO Studio 的现有 8 张详情图、青春纪念册和 Portfolio V1 保持原样。已有项目的首页封面、文字、排序与用户后台设置不变；新项目加入作品列表。

## 项目边界

| Figma 画板 / 节点 | 网页项目 |
| --- | --- |
| 5 / 250:5317 | Cucumber |
| 6 / 250:4042 | AI Workshop、LoRA Training、Vibe Coding & Image Skills（新建） |
| 8 / 250:6273 | Welcome to Lemon8、情人节活动（新建）、泰国活动、活动视觉合集（新建） |
| 9 / 250:7319 | 鉴一鉴你的内心物种 |
| 10 / 250:7971 | 黑胶纪念墙、冬至有酒局 |
| 12 / 250:11955 | 妙时品牌、奇妙接头计划 |
| 13 / 250:11080 | 伴岛 |
| 14 / 250:11469 | 社交品牌体系 |
| 16 / 250:12424 | 设计团队与资源规划、LOOK 营收设计年鉴（新建）、视觉探索与更多 |
| 画板外的 250:12750、250:12751 | LOOK 直播盛典，两张完整方图 |

只保留作品详情，去掉章节间的 NEXT 导航条与总分类封面。全宽展示原稿中成组排版的作品，不拆散手机画面或品牌规范。

## 图片与数据

- 原始 PNG：`output/figma-1012/`（忽略目录，保留本机备份）。
- 网页高清图：`public/assets/portfolio/<slug>/figma-1012/detail-XX.webp`，WebP quality 94。
- 请求 2× 导出。一般全宽图为 3840px；超长画板受 Figma 32768px 高度限制，保留实际导出尺寸，不放大插值。LOOK 方图为 1920px。
- 裁切方案：`docs/figma-1012-export-plan.json`，坐标单位为原始 Figma 像素。
- 默认内容：`src/lib/figma-project-details.json` 与 `src/lib/figma-new-projects.ts`。
- 当前后台内容：`data/content.json`；导入前备份于 `output/figma-1012/content-before.json`。
- 图片记录真实宽高以预留版面，首图优先加载，其余按需加载。

## 再次导入

使用 Figma download_assets 以 2× 导出表内节点，将 PNG 存入原始目录，命名为节点 ID（冒号改为短横线）。不把临时下载 URL 写入源码。

```sh
node scripts/import-figma-1012.mjs
node scripts/sync-figma-1012-content.mjs
```

第一条命令可附带 slug，仅重新生成指定项目。同步只替换本次匹配的项目图片列表、补上尚不存在的新项目和列表入口，保留其余后台字段；运行前先备份当前 `data/content.json`。
