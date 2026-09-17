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
