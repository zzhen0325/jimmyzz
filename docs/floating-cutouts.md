# 首页透明飘浮物

使用内置 image_gen 工具，以用户提供的六张图片分别作为编辑目标。
输出为真实 alpha PNG，再保留透明通道编码为 WebP；网页素材位于
`public/assets/images/floating/`。尺寸配置位于 `src/lib/home-3d-config.ts` 的 `cutouts`。

## 使用的提示词

以下模板分别用于 barrier、chrome-head、cat-head、fries、cash-roll、trash-bag：

> Use case: background-extraction. Edit target: attached image. Asset type: transparent floating website cutout named {name}. Remove only the white or gray background and ground shadow, output a real alpha transparent PNG with the full isolated object centered and small transparent margin. Preserve the exact original subject, shape, perspective, colors, texture and printed text. Do not redesign or add anything. No white rectangle or checkerboard baked in.

trash-bag 额外要求：Remove the two bottom-right screenshot UI icons and reconstruct the tiny covered bag surface.

cash-roll 额外要求：Remove the stray black fragment at the left edge.

## 验证

- 六张素材 alpha 范围均为 0–255。
- TypeScript、修改文件的 ESLint 检查通过。
- 浏览器验证桌面 1440×1000 与手机 390×844：六个物件加载并运动，无素材加载错误或横向溢出。
- 页面截图：`output/playwright/floating-cutouts-desktop.png` 与 `output/playwright/floating-cutouts-mobile.png`。

## 2026-10-07：四个新元素

当前首页改用以下四张透明 WebP（目录 `public/assets/images/floating/`）：
- `weather-cylinder.webp`：好天气气罐，size 1.15。
- `flat-apple.webp`：扁苹果，size 1.25。
- `tufted-flower.webp`：绒毛花瓶，size 1.4。
- `cape-horse.webp`：红披风奔马，size 1.85；原图已有 alpha，直接保留。

前三张使用内置 image_gen 分别抠图，提示词（name 分别为 weather-cylinder、flat-apple、tufted-flower）：

> Use case: background-extraction. Edit target: provided image. Asset type: transparent homepage floating cutout, {name}. Remove only the white background and ground shadow. Output real alpha transparency, isolated full object with small transparent margin. Preserve the exact subject shape, perspective, colors, texture, details, and all printed text (CLEAR 好天气 WEATHER on cylinder). Do not redesign, distort, add, or crop the object. No baked-in checkerboard.

四张素材保留真实 alpha（0–255），编码为 quality 92 / alphaQuality 100 的 WebP。
从首页配置移除 bird-courier、mint-starburst、lemon-molecule、aqua-squiggle、cherry-chess-knight、lime-resin-bubble；原模型文件留存。

验证：TypeScript 与配置文件 ESLint 通过；1440×1000 和 390×844 浏览器场景均 ready，加载四个新 cutout，无横向溢出；运行时物体列表确认六个旧元素不再出现。
截图：`output/playwright/floating-four-desktop.png`、`output/playwright/floating-four-mobile.png`。
