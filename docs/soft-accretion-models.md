# 首页 Blender 漂浮模型

来源：当前 Blender 打开的 `03_Soft_Accretion.blend` 中的
`03_Soft_Accretion` 和 `06_Knotted_Veil`，包含导出时尚未保存的材质。
通过 `bpy.data.libraries.write` 将当前场景写入临时副本，再在后台处理，未修改或保存原文件。

- `public/assets/models/soft-accretion/soft-accretion.glb`：39,200 个三角面，约 1.7 MB；原程序化 Gabor 粉黄颜色烘焙为 1024×1024 sRGB 贴图并嵌入 GLB。保留独立 PNG 供检查和再次编辑。
- `public/assets/models/soft-accretion/knotted-veil.glb`：39,210 个三角面，约 689 KB；保留原蓝色、粗糙度和清漆参数。
- `scripts/export-soft-accretion.py`：可复用的后台减面、UV 展开、颜色烘焙和导出脚本。颜色采用 emission bake，避免重复烘焙场景光照。
- 尺寸位于 `src/lib/home-3d-config.ts` 的 `sculptedProps`，分别为 1.35 和 1.4；复用现有加载、漂浮、碰撞与资源释放流程。

验证：1440×1000 桌面和 390×844 手机浏览器加载成功，两个物件均为独立动态刚体，手机无横向溢出。截图保存在 `output/playwright/soft-accretion-desktop.png` 和 `output/playwright/soft-accretion-mobile.png`。
配置 ESLint 和排除 output 备份后的应用 TypeScript 检查通过。全仓 `tsc --noEmit` 被已有 `output/figma-home/chrome-world.original.ts` 的无效相对引用阻挡。
