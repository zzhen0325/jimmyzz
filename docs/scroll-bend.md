# 滚动曲线的 GPU 实现

首页封面和项目页媒体使用同一个 `ScrollBend`。曲线沿用原 SVG 的二次曲线和速度响应，渲染改为共享 WebGL 网格。

- 每个可见媒体由 48 列网格表示，曲线改变顶点的纵坐标。弯曲幅度上限为桌面 210、手机 90，比最初版本提高 50%；速度响应、平滑接管和回弹时长保持一致。最大位移下，分段插值误差小于 0.02 CSS 像素。
- 一页只创建一个视口大小、上下各预留 144px 的透明画布，按设备像素比输出；保留 DOM 的布局、链接、焦点和辅助文本。更大的预留区容纳加强后的弯曲边缘，可见性观察范围同步扩大。画布随文档滚动，与原生内容共享浏览器的滚动合成，避免固定画布晚一帧导致图片和标题错位。预留区域裁切在文档内，不增加滚动高度。
- 提前 1600px 加载附近的图片，先异步 `decode()`，再在空闲时段逐张上传纹理并试绘制。画布在创建时分配真实分辨率；滚动及回弹期间暂停新增纹理，不使用可能在滚动途中超时强制执行的 idle 回调。使用浏览器选中的 `currentSrc`，不额外缩图。显存纹理缓存设有桌面 128 MiB、手机 64 MiB 的预算，并回收较久未使用的纹理。
- 视频复用原来的 video 元素，以 `requestVideoFrameCallback` 标记新帧，仅在滚动变形需要时上传新帧；不创建额外播放器或视频副本。
- 渐变揭示期间由 WebGL 读取 DOM 动画当前的尺寸和位置，在同一张变形网格中应用 screen 渐变及透明遮罩，因此渐变与滚动弯曲可以同时出现；项目入场透明度也同步到 GPU。纹理尚未就绪时保留 DOM 动画。接管第一帧保持零弯曲，用 140ms 平滑过渡到当前曲线，避免从静态图突然跳到已弯曲的形状。滚动停止、页面隐藏或开始切页时立即恢复原生媒体并停止绘制。
- WebGL 不可用或上下文丢失时使用 CSS 倾斜近似效果；超出纹理上限、尚未准备好或不允许跨域采样的媒体保留原生显示。减少动态效果模式关闭变形。
- 卸载时移除画布、观察器、ticker、视频帧回调，并释放纹理和 WebGL 上下文。

主要实现：`src/components/scroll-bend.tsx` 与 `src/lib/scroll-bend-renderer.ts`。

## 本地前后对比

2026-10-15，Chromium，1440×900、DPR 2；相同 4 秒往返滚动路径。帧间隔来自 requestAnimationFrame，慢帧定义为超过 25 ms。这是本机单次对比，不代表所有设备或真实用户分布。

| 页面 | SVG 帧间隔中位数 | WebGL 帧间隔中位数 | SVG / WebGL P95 | SVG / WebGL 慢帧数 |
| --- | ---: | ---: | ---: | ---: |
| 首页 | 16.7 ms | 16.7 ms | 33.4 / 17.6 ms | 21 / 0 |
| Cucumber 项目页 | 33.3 ms | 16.7 ms | 50.0 / 17.6 ms | 88 / 0 |

采样保存在 `output/performance-2026-10-15/svg-bend-benchmark.log` 和 `webgl-bend-benchmark-final.log`。浏览器还检查了视频播放、原生媒体恢复、移动端、减少动态效果、WebGL 不可用和上下文丢失场景。2.5 秒滚动期间视频推进约 2.51 秒、收到 74 次新帧回调；停止后所有媒体恢复原生显示，模拟上下文丢失后切换 CSS 近似效果。页面切换后仅保留一个弯曲画布。详细结果保存在 `output/performance-2026-10-15/webgl-bend-validation.log`。

## 首次出现的专项检查

同日新增首次进入测试：此前图片还未进入视口，不预先往返滚动。修复前记录到滚动途中新纹理上传占用约 9–22.5ms，媒体接管时弯曲值直接跳到约 -35px；此外首页 3D 隐藏道具的首次贴图上传曾达到约 139ms。3D 材质贴图现在在开场 Loading 内用 `renderer.initTexture()` 预先上传，并分批让出主线程。

桌面与移动视口的首页、Cucumber 项目页四种组合验证通过：滚动前画布尺寸已分配，首次接管全部从零弯曲开始，滚动期间没有新增变形纹理上传，随后弯曲正常增长；停止后恢复原图。项目页首次滚动 P95 分别为 17.7ms / 17.6ms，无超过 25ms 的帧。首页整段测试还包含 3D 收起和封面揭示，仍有慢帧，不能将项目页结果等同于首页全程帧率。记录见 `webgl-first-appearance-validation.log`。

视频、减少动态效果、WebGL 不可用、上下文丢失和页面切换的回归结果见 `webgl-first-appearance-regression.log`；2.5 秒滚动期间视频推进约 2.51 秒，停止后无残留隐藏媒体。

进一步追踪发现头像首次可见时还会同步解码精灵图并执行 1152 次 Canvas 三角形贴图。`PortraitWarp` 现在提前解码和绘制静态首帧，首次拖拽才切换到已解码的表情帧；网格密度和 600×600 原始画布均保留。桌面首次向下滚动的单次追踪中，最长 JavaScript 回调由 68.6ms 降到 2.7ms（`home-first-scroll-trace.log` / `home-first-scroll-trace-final.log`），这不等同于整页每帧耗时。桌面、手机均在 scrollY=0 时已有完整头像像素，控制点变形和最终返回第 54 帧微笑通过，见 `portrait-first-appearance-validation.log`。

参考：[MDN WebGL 性能实践](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)；[Three.js VideoTexture 的帧更新说明](https://threejs.org/docs/pages/VideoTexture.html)。
