# 上传媒体交付

上传仍保留原件和原始 URL。无需改写 content.json，也无需重新上传历史图片。

## 图片

`ContentImage` 对 `/media/*.jpg|png|webp|avif` 使用固定尺寸的响应式 srcset。请求例：

```
/media/<uuid>.png?w=750&v=v1
```

- 固定白名单尺寸匹配 Next 的默认图片尺寸，质量固定 85，禁止任意变换参数造成无限缓存组合。
- 原 URL 不受影响，仍返回原件；GIF 保留原交付方式。PNG/WebP 等动画在转换时保留动画，透明度保留。
- Node 本地环境通过 Sharp 生成；Cloudflare 通过已有的 IMAGES binding 从 R2 读取原件并生成。
- 结果缓存于本地 `data/derived/images/v1/` 或 R2 `derived/images/v1/`，不进入内容 JSON，不需要跟随内容同步上传。
- 变换服务失败或文件超过绑定处理限制时，返回不缓存的临时重定向至原件，避免图片消失或长期缓存失败结果。
- 后台清理不再引用的原件时，同时删除其固定尺寸派生图。修改压缩参数时必须递增版本，保留 immutable URL 语义。
- 原始文件使用 UUID，禁止覆盖相同名字的文件内容。

详情图、首页封面、独立画廊图片及叠层底图均通过这一组件交付。旧的静态 `/assets/` 路径仍使用既有 Next 图片优化。

Cloudflare 依据：[Images binding 文档](https://developers.cloudflare.com/images/optimization/binding/)。缓存存入 R2，避免每次访问重复转换。线上首次请求会生成对应尺寸，之后读取缓存；本地压缩测量不等同于线上首次生成延迟或真实用户性能分数。

## 视频

- 详情及叠层视频初始不设置 src，距离视口 200px 内才加载元信息，在视口内播放；离屏或切换后台标签页暂停。
- 减少动态效果模式不自动播放，显示播放控件；浏览器拒绝自动播放时显示控件。
- 画廊继续由既有动画控制准确的可见性，但不再在页面初始化时挂载全部视频地址；首次需要播放时才挂载。
- 本地媒体路由新增单段 Range、后缀 Range、206/416，便于视频按段下载与定位；Cloudflare 保留既有 R2 Range 实现。
- 本次没有重编码或替换原始视频。观看某个视频时仍需要下载它的播放数据，主要改善未观看内容的提前下载和离屏解码。

## 验证

`npm run test:media`：范围解析边界、尺寸白名单和非图片兼容性。使用当前项目 Node 24 运行。

本次本地实测图片（2912×1632 PNG）：原图 9,727,448 字节；750px WebP 24,590 字节；1920px WebP 402,696 字节。原图保留，透明 PNG 测试通过。

浏览器验证了手机视口详情页：3 个离屏视频初始 src 均为空，进入视口后首个视频播放，离屏后暂停。减少动态效果模式中，详情和画廊视频保持暂停且可手动播放。

TypeScript、针对改动文件的 ESLint、Cloudflare 生产打包通过。另在 `wrangler dev --local` 中验证 R2 → IMAGES → 派生 WebP 链路：750px 返回 200 / image/webp（16,364 字节），派生图写入本地 R2 缓存。此验证没有发布线上 Worker 或修改线上媒体。

完整测量见 `output/media-optimization/results.json`；该目录被 Git 忽略。
