# 首页 Risograph 视频效果

参考：https://effect.app/ ，2026-09-06 用户打开的 Risograph + Exposure 面板。

实现：`src/lib/risograph.ts` 的 `risographSettings`，由 `RisographVideo` 在视频解码完成或尺寸变化时绘制。鼠标横向位置控制 `4.mp4` 视频进度。

## 对应参数

总开关：在 `src/lib/risograph.ts` 中设置 `risographSettings.enabled`，`true`（默认）开启效果，`false` 显示原视频且不创建滤镜画布、WebGL 资源或颗粒动画。组件也支持通过 `enabled` 属性覆盖默认值；运行时关闭会清理已有渲染资源。

| 参数 | 参考值 |
| --- | --- |
| Paper color | #f5f2e8 |
| Grain scale / opacity / softness / contrast | 0.23 / 0.85 / 0.50 / 1.00 |
| Ink 1 | Red；六色权重 -1.04, 3, 3, 3, 3, 0.35；位移 0, 0 |
| Ink 2 | Blue；六色权重 2.30, 3, -2, -2, 0.89, 0.63；位移 0, 0.002 |
| Ink 3 | Melon；六色权重 0.54, -2, 3, 3, 3, 1.87；位移 0.003, 0.001 |
| Ink 4 | 关闭 |
| Exposure / Gamma | 0.26 / 2.20 |
| Gamut mapping / Reinhard / Show clipping | 0 / 关闭 / 关闭 |

六色顺序为红、黄、绿、青、蓝、品红。油墨颜色按可见名称映射为 Red #ff665e、Blue #0078bf、Melon #ffae3b；面板没有显示这些油墨的具体十六进制值。

## 重建方式与边界

将 RGB 分解为六个色相区，用面板权重生成三张油墨覆盖率图；每层单独偏移、添加固定纸面颗粒，以线性颜色空间乘色叠印，最后施加曝光和 Gamma。颗粒通过固定的纸面纹理采样生成，避免同一视频帧在鼠标移动时随机闪烁。

这是基于可见参数和预览的独立视觉近似，未获得原站的色彩分离与颗粒算法，不承诺像素级一致。滤镜只作用于视频背景，文字保持清晰。

WebGL 不可用或上下文丢失时显示原视频，恢复后重建滤镜；视频加载失败继续使用现有封面。绘制分辨率宽度上限 1920，页面离屏或隐藏时停止绘制；事件、观察器和 GPU 资源在卸载时释放。

## 对齐 effect 项目的实时实现

参考本机 `effect/vendor/shader-lab/runtime/renderer/risograph-pass.ts` 与 `media-texture.ts`：

- 使用同一张 1920×1920 `riso-pattern.webp`，替换每像素 hash/value noise。纹理来自 effect 项目，其记录的上游为 `https://effect.app/effects/Effects/riso-pattern.webp`。仅颗粒纹理是静态资源，视频和分色仍逐帧实时处理。
- Grain scale 使用纹理像素与输出像素比例；三层相位为 `(i×0.173, i×0.317)`，softness 直接参与 smoothstep，纸面使用同源纹理。保留现有三色、六色权重、错位、Exposure 和 Gamma。
- WebGL2 支持 1920 非二次幂纹理的 REPEAT；采用 LinearFilter，不生成 mipmap。纸色和油墨的线性转换移到初始化阶段，几何尺寸只在 ResizeObserver 通知时重新读取。
- 正常播放使用 requestVideoFrameCallback，与 effect 的 VideoTexture 更新机制对齐；跳帧完成先提交画面，再由下一次 requestAnimationFrame 处理最新鼠标位置。无帧回调的浏览器使用播放期间的 rAF 后备。视频暂停时仅颗粒按 12fps 更新，复用现有视频纹理；离屏或隐藏时取消回调。
- 当前源视频为用户选择的 `4.mp4`，不修改或预渲染视频。滤镜画布仍为原先的最高 1920 宽度与 1.5 DPR 上限。WebGL2 或纹理加载不可用时保留原视频。

effect 的媒体层以正常播放为主，时间偏差超过 0.25 秒才跳转。首页的鼠标定位属于随机解码，不能用普通播放的流畅度推断任意跳帧也具有相同速度。

## 本机验证

`4.mp4` 为 1280×720、24fps。首页实际播放约 2.95 秒时提交 69 次滤镜绘制；左右鼠标定位分别到 3.970487 秒和 0.714687 秒。暂停后 0.5 秒新增绘制为 0；WebGL 上下文丢失隐藏滤镜，恢复后重新加载纹理并绘制，GL error 为 0。ESLint、TypeScript 与生产构建通过。

1920×1080 下同帧重复上传的浏览器调用耗时中位数，新旧均约 0.1ms，P95 约 0.6–0.7ms，未证明 GPU 渲染加速；这些 CPU 侧调用计时也不能等同于 GPU 耗时或端到端播放 FPS。本次主要验证纹理参数对齐、正常播放的新帧回调和跳帧提交顺序。原视频的随机解码成本仍存在。

## 噪点变化与暗部

纸痕层使用 CSS 像素坐标，叠加细长纸纤维、低频深浅纹理和两条轻微不规则折痕。`paperChangeEveryFrames`（默认 8）让纸痕每 8 个噪点动画帧切换一次，当前 12fps 下约为 0.67 秒；间隔内保持固定，漂浮窗口经过时纸痕保持连续。减少动态效果设置开启时随噪点一起停止变化。复用现有颗粒纹理，不增加图片下载或逐帧 CPU 纹理生成。`paperTextureStrength`（默认 0.24）控制纸面纹理，`paperCreaseStrength`（默认 0.16）控制折痕，均设为 0 可关闭新增纸痕。

按用户要求加入独立于视频时间的 12fps 噪点随机变化，纸面纹理坐标固定，切换预先生成的 16 层独立噪声，变化强度 0.35，仅修改噪声层索引 uniform。静止视频不会重复上传；减少动态效果设置开启时停用抖动，隐藏或离屏时暂停。

曝光和 Gamma 后对亮度低于 0.42 的区域平滑去色并加深，最深暗部强度 0.65、去色强度 1，让原先偏红的暗色靠近中性黑，同时保留较亮红蓝油墨区域。参数在 risographSettings 中可调整。此前暂停零重绘的数据属于加入颗粒动画之前的版本。
