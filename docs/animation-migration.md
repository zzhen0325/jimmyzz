# GSAP 动画迁移

## 分层与职责

- `src/lib/gsap.ts`：统一注册 GSAP、ScrollTrigger、useGSAP，集中媒体查询和弹层时序。
- 组件层：React 管理内容和开关；GSAP 管理视觉属性。通过 ref 限定目标，useGSAP / matchMedia 在卸载和偏好变化时清理动画。
- `GsapPresence`：弹层保留到退出完成；关闭期间 inert，避免不可见内容接收交互。
- `WorkLink`：作品列表预览扩展、详情页下一作品悬停效果；保留服务端页面与 metadata。
- `SmoothScroll`：保留 Lenis 的滚动手感，由 GSAP ticker 统一驱动并同步 ScrollTrigger；减少动态效果时使用原生滚动。

## 场景映射

| 场景 | GSAP 实现 | 行为 |
| --- | --- | --- |
| 首屏标题 | from | 0.85 秒入场 |
| 背景视差 | ScrollTrigger + scrub | 沿首屏滚动进度移动、缩放 |
| 品牌滚动 | xPercent + repeat | 完整一组宽度循环，离屏暂停，宽屏不露空白 |
| 首页作品 | 可暂停循环与 hover tween | 标题按自身宽度循环，视频播放与悬停同步 |
| Reels 卡片 | set + tween | 保持错位堆叠，悬停缩放 |
| 服务切换 | ScrollTrigger + 可反向 tween | 双向滚动更新视频，背景高亮可打断 |
| 评价切换 | 退出 tween + 入场 tween | 先退出再更新内容，快速点击以累计目标为准 |
| 视频弹层、菜单 | timeline | 背景与面板同步进入，退出后卸载 |
| 浮动入口 | autoAlpha | 隐藏时不接收点击或键盘焦点 |
| Film runner | timeline + repeat | 点击重新起跳，随菜单卸载清理 |
| 作品列表 / 下一作品 | tween | 桌面预览扩展，支持键盘聚焦与反向恢复 |
| 顶部导航 | 可反向 tween | 透明度 hover / focus 反馈 |

## 约束

- 已移除 Motion 及 CSS transition，避免两个动画系统竞争同一属性。
- 位移、缩放优先使用 transform；作品预览使用宽高以维持视频 object-cover 裁切，且不改变网格占位。
- 不使用全局 killAll；组件只清理自身动画、监听器和 ScrollTrigger。
- prefers-reduced-motion 动态切换时移除视差、持续跑马灯、小游戏运动和平滑滚动；内容切换保持可用。
- npm 与 pnpm 锁文件均更新。旧 npm 锁文件缺失版本的可选依赖条目已重新解析。

## 验证

已通过 `pnpm lint`、`pnpm exec tsc --noEmit`、`pnpm build` 和 `git diff --check`。
浏览器回归覆盖首页入场、弹层挂载 / 退出、菜单、小游戏、评价连续切换、作品悬停与路由往返、桌面 / 移动断点及动态减少动画偏好。

参考：[GSAP React 生命周期](https://gsap.com/resources/React/)、[Lenis 与 GSAP 同步](https://github.com/darkroomengineering/lenis#gsap-scrolltrigger)。

浏览器截图与日志位于 `output/playwright/`（已被 Git 忽略）。移动端菜单在生产模式下复验，避免开发工具浮标遮挡点击。浏览器日志未发现应用错误。
