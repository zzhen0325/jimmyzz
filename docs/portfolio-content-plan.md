# 作品集内容规划与素材拆分

来源：[Figma / 24new / Page 3](https://www.figma.com/design/r8qco3DrEwzN7iWP6v6lPk/24new?node-id=500-353)。本次读取日期：2026-09-05。

## 页面组织

- 首页：沿用现有 VibeMaking 首屏、视频滚动与 Lofi 效果；精选 AIGC、妙时品牌、内心物种、伴岛四个案例，保留卡片堆叠缩放、悬停标题滚动；增加视觉漫游，再补充设计实践、个人介绍与相关经历。
- `/work`：12 个项目，按品牌与 IP、H5 营销、海外活动、AIGC、设计管理、视觉探索筛选。
- `/work/[slug]`：项目背景 → 设计思路 → 原稿成果（有记录时）→ 可定位的案例章节 → 下一项目。
- 图片：原稿章节独立展示，支持大图查看、原尺寸浏览、上一张/下一张及键盘操作。移动端用单列布局与可横向滚动的章节导航。

## 项目映射

| 项目 | 路径 | Figma 节点 |
| --- | --- | --- |
| All about AIGC | `/work/lemo-ai` | `4014:3256` |
| Lemon8 Campaigns | `/work/lemon8-campaigns` | `4014:45` |
| 妙时品牌 | `/work/miaoshi-brand` | `500:1652` |
| 鉴一鉴你的内心物种 | `/work/inner-species` | `500:698` |
| 伴岛 | `/work/bandao` | `500:2116` |
| 奇妙接头计划 | `/work/meetup-plan` | `500:1962` |
| 冬至有酒局 | `/work/winter-gathering` | `500:1380` |
| 黑胶纪念墙 | `/work/vinyl-anniversary` | `500:1025` 下半部 |
| 青春纪念册 | `/work/youth-album` | `500:1025` 上半部 |
| 社交直播业务群 | `/work/social-live` | `500:2609` |
| 设计团队与资源规划 | `/work/design-operations` | `500:3299` |
| 视觉探索与更多 | `/work/visual-explorations` | `500:3146` |

个人信息取自封面 `500:354`、经历页 `500:497`。邮箱使用原稿中的 `zzhen0325@gmail.com`。Lemon8 项目经历单独陈列，不推断其任职起止时间；旧稿中的“2020.06 至今”不直接作为当前履历展示。

## 素材策略

原始画板下载在 `output/figma-originals/`（已被项目忽略），网站素材位于 `public/assets/portfolio/<slug>/`。

- `cover.webp`：项目原稿封面或代表性界面。
- `thumbnail.webp`：宽度最多 960px 的列表预览，部分项目使用独立的完整视觉区域，避免只展示横幅标题。
- `feature.webp`：四个首页精选项目使用完整分辨率的代表图，满足大屏展示。
- 其余 `.webp`：按设计策略、主界面、结果页、品牌规范、应用、成果等语义章节拆分。年鉴长图再按视觉章节拆开，避免单张过长。
- 共 78 张封面/章节图，另有 13 张缩略图、4 张精选大图及 24 张画廊独立小图。全部本地保存，保留原比例，图片内的字体、纹理、插画与界面来自 Figma 导出，不重新描摹。
- 页面标题、摘要、背景、设计思路与成果数据是可选择和检索的 HTML 文本；完整案例图保留原作版式。当前图像展示为静态导出，原稿里的动效、二维码和工具界面不代表在本站运行的交互产品。
- 原始导出的复合设计被按章节裁切，未宣称每张图片都是去背景的独立源图层。

`docs/portfolio-assets-plan.json` 是完整切图清单：节点、语义名称和 `[x,y,width,height]` 坐标。`src/lib/portfolio-assets.json` 是页面实际使用的资源清单，包括尺寸与路径。`docs/figma-source-map.json` 保存用于整理的文字节点记录。

## 维护

- 编辑项目内容、排序与分类：`src/lib/site-data.ts`。
- 调整切图区域：`docs/portfolio-assets-plan.json`。
- 重新导入：先使用 Figma `download_assets` 获取表内画板的最新导出 URL，写入本地 `output/figma-downloads.json`，格式为 `[{"id":"500:698","data":{"url":"临时下载地址"}}]`；然后运行 `node scripts/import-portfolio.mjs`。脚本复用已存在的原始文件，需要更新的画板应先移走对应缓存文件。
- 临时下载地址仅存在于已忽略的 `output/` 下，不放入页面、资源清单或版本管理。
- 暂未把原模板的影视素材删除，以免影响后续复用；公开页面已替换不相关的示例项目、评价、社交链接及虚构的经营信息。

## 曲面小图画廊

参考 [Codrops Curve Gallery](https://tympanus.net/Tutorials/CurveGallery/) 的沿曲线移动镜头、空间散列图片与近处放大效果，实现独立 Three.js 场景。画廊位于首页精选案例之后，使用作品集自己的素材。

- 从内心物种、妙时品牌、妙时海报、伴岛 IP 和 Lemo 模型页拆出 24 张小图；WebP 合计约 964 KB，按原比例展示。
- 提供回环、环绕、波浪三条路径；支持滚动推进、横向拖动、自动漫游、前后步进、平铺浏览和点击放大。放大视图可切换图片并进入完整案例。
- 桌面和手机均可浏览；系统选择减少动态效果或 WebGL 不可用时使用静态网格。离屏暂停绘制，离开页面释放纹理、材质、几何体、渲染器和滚动监听。
- 切图坐标与来源节点：`docs/curve-gallery-assets-plan.json`；实际资源清单：`src/lib/curve-gallery-assets.json`；图片：`public/assets/portfolio/gallery/`。
- 更新原始画板后运行 `node scripts/import-curve-gallery.mjs` 重新生成小图。
