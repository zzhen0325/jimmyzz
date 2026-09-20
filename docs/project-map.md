# 项目地图 / Project Map

Jimmy ZZ 个人作品集站点（`package.json` 名称 `Jimmy-ZZ`）。定位是「视觉设计师 + 创意技术」的双重展示：常规排版内容 + 一整屏可物理互动的 Chrome 金属 3D 世界。

- 仓库根目录：`/Users/bytedance/Desktop/seeseezz/zz`
- 技术栈：Next.js 16.2.10（App Router、Turbopack）+ React 19.2.7 + TypeScript 5.9（strict）+ Three.js 0.184 + cannon-es 0.20 + GSAP 3.15（ScrollTrigger / SplitText / ScrambleText）+ Lenis 1.3 + Tailwind CSS 4（少量原子类）+ CSS Modules / 全局 CSS
- 别名：`@/*` → `./src/*`
- 源码规模：约 9.3k 行（TS/TSX/CSS），其中 `src/app/globals.css` 1777 行

---

## 1. 顶层目录

| 路径 | 作用 |
| --- | --- |
| `src/app/` | App Router 路由与全局样式 |
| `src/components/` | 页面区块与交互组件（UI 层） |
| `src/lib/` | 与框架无关的实现：3D 世界、着色器、动效、数据 |
| `src/vendor/lattice/` | 拷贝进来的第三方 Canvas2D 滤镜（`filters.js` + `palettes.js`，含 `.d.ts`） |
| `public/assets/` | 全部静态素材，约 410 MB |
| `scripts/` | Blender / Node 素材构建与导入脚本（离线，不参与构建） |
| `docs/` | 设计还原记录、素材规划、本文件 |
| `output/` | Blender 产物与 Playwright 截图等过程产物（非站点资源） |
| `design-qa.md`、根目录若干 `*.png` | 设计走查记录与参考图 |

## 2. 路由

| 路由 | 文件 | 说明 |
| --- | --- | --- |
| `/` | `src/app/page.tsx` → `components/home-page.tsx` | 首页主入口 |
| `/work` | `src/app/work/page.tsx` | `redirect("/")`，无独立列表页 |
| `/work/[slug]` | `src/app/work/[slug]/page.tsx` | 项目详情，`generateStaticParams()` 预生成 12 个 slug |
| `/v2` | `src/app/v2/page.tsx` | `permanentRedirect("/")` |
| `/palette-preview` | `src/app/palette-preview/page.tsx` | 配色对比预览台（`iframe` 实时预览 + `?palette=` 参数） |

全站骨架：`src/app/layout.tsx` — 本地字体 `bdo-grotesk.woff2`（`--font-bdo`）、全局背景 `#090909`、`SmoothScroll`（Lenis + GSAP ticker）以及 `GlobalChrome`（`site-chrome.tsx:143`，当前返回 `null`）。

## 3. 首页结构（`components/home-page.tsx`）

`HomePage` 按顺序渲染，滚动进入 Lenis + ScrollTrigger 驱动：

1. `HoverLabel` — 视口空间光标贴纸
2. `ChromeHero` — 全屏 3D 首屏（见第 4 节）
3. `.home-content` 内：
   - `Introduction` — 个人介绍
   - `FeaturedProjects` — 三张主推图 + `SelectedWork`
   - `CurveGallery` — 横向「丝带」画廊（GSAP 固定滚动 + 胶片条算法）
   - `Capabilities` — 设计实践，悬停切换预览图（`services` 数据）
   - `About` — 关于与经历
   - `Footer`

布局规则集中在 `components/home-grid.css`（仅作用于 `.home-page`，桌面 12 列 / <810px 6 列 / <600px 4 列，间距变量 `--page-pad`、`--grid-gap`、`--section-space`、`--line`），细节见 `docs/home-grid.md`。

## 4. 首屏 3D 系统（项目最重的部分）

调用链：`chrome-home.tsx` → `chrome-scene.tsx`（`dynamic(..., { ssr: false })`）→ `createChromeWorld()`（`lib/chrome-world.ts`，526 行）。

- **装配**：`chrome-scene.tsx` 挂载 `<canvas>`，把 `workProgress` ref、`interactive`、`paused` 传进世界；失败时降级为静态 `ZZ` 字（`styles.fallback`）或 `dataset.assetError`。
- **物理**：`cannon-es` 无重力世界（`ChromeWorldOptions` 见 `chrome-world.ts:15`），所有漂浮物为 `Body`，含静态墙/地板与可拖拽交互；`canvas.dataset.*` 暴露阶段、接触数、加载项数量等调试状态（`phase` / `ready` / `contacts` / `visibleItems` …）。
- **物件来源**（统一由 `lib/home-3d-config.ts` 调参）：
  - GLB 模型：`public/assets/models/emotions/*.glb`（情绪角色、蓝色 ZZ、笑脸键帽、strongman）、`plaques/*.glb`（Think/Plan/Do/Review/Repeat 立牌）
  - 程序化几何：`chrome-logo-geometry.ts`（银色 ZZ 三角）、`jimmy-wordmark-geometry.ts`（由 `jimmy-wordmark-contours.json` 轮廓重建的手写体）、`chrome-portal-gun.ts`、`chrome-celestial.ts`（金属行星与雨云）、`chrome-gamepad.ts`（**当前未被引用**）、`pixel-vortex.ts`
  - 贴图抠图：`public/assets/images/floating/*.webp`（6 个 billboard）+ `skater-cutout.webp`
- **环境光照**：`lib/home-3d-config.ts` 的 `lighting` — HDR/EXR/JPG 三种加载分支（`GLTFLoader` / `HDRLoader` / `EXRLoader` / `TextureLoader`）+ 三盏 RectAreaLight 棚拍光 + 反射帧。
- **彩蛋 / 交互反馈**：`vortex-easter-egg.ts`（点击 vortex 触发吞入动画）、`chrome-home.module.css` 中的 `data-view`（`intro` / `transition` / `work`）与滚动进度驱动 `--work-progress`、`--hero-scroll`；加载动画 `home-loader.tsx`（11 帧序列）。
- **入口调参**：只改 `home-3d-config.ts`（尺寸、材质、灯光、cutouts、vortex）。

## 5. 项目详情页

`app/work/[slug]/page.tsx`（服务端组件）→ `ProjectHeader`（复用 3D 世界的静态帧）+ `ProjectCopy`（About / Challenge / Solution 编辑式排版）+ `CaseGallery`（图片长图/灯箱、键盘与缩放操作，`motion-image.tsx` 提供指针涂抹效果）+ 下一项目卡片 + `Footer variant="project"`。

内容数据全部来自 `lib/site-data.ts`：

- `profile`、`categories`、`projects`（12 个项目，含 `description` / `challenge` / `approach` / `results`）
- `projectAssets(slug)` 读 `lib/portfolio-assets.json`（由 Figma 导出的切图清单）；`projectCover(slug)` → `/assets/portfolio/<slug>/thumbnail.webp`
- `services`（设计实践四项）

## 6. `src/lib` 模块分组

| 分组 | 文件 |
| --- | --- |
| 数据 | `site-data.ts`、`portfolio-assets.json`、`curve-gallery-assets.json`、`jimmy-wordmark-contours.json` |
| 3D 世界 | `chrome-world.ts`、`home-3d-config.ts`、`chrome-*.ts`、`jimmy-wordmark-geometry.ts`、`pixel-vortex.ts`、`vortex-easter-egg.ts` |
| 动效基座 | `gsap.ts`（统一注册 + `motionConditions` / `motionTiming`）、`home-reveals.ts`、`collage-motion.ts`、`pointer-smear.ts`、`motion-image.tsx` |
| 视频 / 印刷效果 | `risograph.ts`、`risograph-video.tsx`、`lattice-collage.ts`、`hero-palettes.ts`、`hero-video-geometry.ts`、`hero-subject-tracker.ts`（部分已停用，见第 8 节） |
| 小游戏 | `minesweeper.ts` |

## 7. 素材与脚本

`public/assets/`：`videos` 234 MB、`images` 130 MB、`portfolio` 22 MB、`models` 16 MB、`environments`（HDR/EXR 棚拍环境）、`fonts`、`loading`（加载序列帧）、`effects`、`video-frames`。

`scripts/`（离线执行，非构建步骤）：

| 脚本 | 用途 |
| --- | --- |
| `build-emotion-characters.py` | Blender 生成 5 个情绪角色 GLB |
| `build-strongman.py` | 肌肉吉祥物两版建模 |
| `build-blue-zz.py` / `build-smiley-keycap.py` | 蓝色 ZZ 挂件 / 笑脸键帽 |
| `export-hero-plaques.py` | 导出 5 块立牌 |
| `build-black-hole.py` / `prepare-black-hole.py` | 处理 CC BY 4.0 黑洞模型（已不用于当前首屏） |
| `trace-jimmy-wordmark.py` / `export-jimmy-wordmark.mjs` | 从参考图提取轮廓 → 运行时几何 → 导出 GLB |
| `import-portfolio.mjs` / `import-curve-gallery.mjs` | 用 `sharp` 按 `docs/*-assets-plan.json` 批量处理切图 |

素材方案与还原记录：`docs/portfolio-content-plan.md`、`docs/curve-gallery-assets-plan.json`、`docs/figma-source-map.json`、`docs/home-grid.md`、`docs/animation-migration.md`、`docs/risograph-reference.md`、`docs/sphere-reference.md`、`docs/floating-cutouts.md`、`docs/hero-stone-reveal.md`。

## 8. 已知冗余 / 待清理

以下模块当前没有任何引用（多为被 `ChromeHero` 替换掉的旧实现，或未接线的接口）：

- 旧滚动视频首屏链路：`components/risograph-video.tsx`、`components/riso-preview.tsx`、`components/scanner-type.tsx`、`components/hero-stone-reveal.tsx`、`components/hero-minesweeper.tsx`、`lib/hero-subject-tracker.ts`、`lib/lattice-collage.ts`
- 旧黑洞首屏：`lib/black-hole-glow.ts`、`lib/black-hole-lens.ts`、`lib/black-hole-ring.ts`（`public/assets/models/black-hole/` 同理），但 `site-chrome.tsx` 页脚仍保留署名文案
- 旧球体画廊：`lib/curve-gallery-scene.ts`（`createCurveScene` + `spherePreset`，见 `docs/sphere-reference.md`）与 `lib/chrome-gamepad.ts`
- 未接线组件：`components/project-index.tsx`（`/work` 已改为跳首页）、`components/work-link.tsx`、`components/gsap-presence.tsx`
- `site-chrome.tsx` 中未被使用的 `TopNav` / `Timeline` / `SectionLabel` 导出，与 `GlobalChrome`（恒返回 `null`）

## 9. 运行与校验

```bash
npm run dev     # next dev（默认 http://localhost:3000）
npm run build   # next build
npm start       # next start
npm run lint    # eslint .
```

无测试框架；改动后的验证依赖 `npm run lint`、`next build` 的类型检查，以及浏览器实测（历史视觉回归截图在 `output/playwright/`）。
