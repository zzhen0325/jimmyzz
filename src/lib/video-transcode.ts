'use client';

const MAX_INPUT = 200 * 1024 * 1024;
const MAX_OUTPUT = 30 * 1024 * 1024;
const BASE = '/assets/video-transcoder/v1';
export const isVideoFile = (file: File) => file.type.startsWith('video/') || /\.(mov|mp4|webm)$/i.test(file.name);
export const formatMB = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/** Decode in WASM so MOV input does not depend on the browser's video decoder. */
export async function transcodeVideo(file: File, report: (message: string) => void, signal: AbortSignal): Promise<File> {
  if (file.size > MAX_INPUT) throw new Error('原视频超过 200MB，请先裁短后再上传');
  signal.throwIfAborted();
  report('正在加载视频处理引擎…首次使用需要下载约 32MB');
  const { FFmpeg } = await import('@ffmpeg/ffmpeg');
  const ffmpeg = new FFmpeg();
  const logs: string[] = [];
  ffmpeg.on('log', ({ message }) => { logs.push(message); if (logs.length > 20) logs.shift(); });
  const controller = new AbortController();
  const urls: string[] = [];
  let timedOut = false;
  let loading = true;
  const cancel = () => { controller.abort(); ffmpeg.terminate(); };
  signal.addEventListener('abort', cancel, { once: true });
  // Also bounds worker startup failures and stalled decoders, not just exec().
  let timer = setTimeout(() => { timedOut = true; cancel(); }, 60000);
  try {
    signal.throwIfAborted();
    const parts = await Promise.all([0, 1].map(async index => {
      const response = await fetch(`${BASE}/core-${index}.bin`, { signal: controller.signal });
      if (!response.ok) throw new Error('视频处理引擎加载失败，请刷新重试');
      return response.arrayBuffer();
    }));
    const wasmURL = URL.createObjectURL(new Blob(parts, { type: 'application/wasm' }));
    urls.push(wasmURL);
    await ffmpeg.load({
      classWorkerURL: `${location.origin}${BASE}/worker.js`,
      coreURL: `${location.origin}${BASE}/ffmpeg-core.js`,
      wasmURL,
    }, { signal: controller.signal });
    loading = false;
    clearTimeout(timer);
    timer = setTimeout(() => { timedOut = true; cancel(); }, 15 * 60 * 1000);
    report('正在读取原视频…');
    const extension = file.name.match(/\.(mov|mp4|webm)$/i)?.[1].toLowerCase() || 'video';
    const input = `input.${extension}`;
    await ffmpeg.writeFile(input, new Uint8Array(await file.arrayBuffer()), { signal: controller.signal });
    let percent = 0;
    ffmpeg.on('progress', ({ progress }) => {
      percent = Math.max(percent, Math.min(99, Math.round(progress * 100)));
      report(`正在压缩为 WebM · ${percent}%`);
    });
    report('正在压缩为 WebM · 0%');
    const result = await ffmpeg.exec([
      '-threads', '1', '-i', input, '-map', '0:v:0', '-an',
      '-vf', "scale=w='min(1920,iw)':h='min(1080,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,setsar=1",
      '-c:v', 'libvpx', '-crf', '10', '-b:v', '4M', '-deadline', 'good', '-cpu-used', '4',
      '-lag-in-frames', '0', '-auto-alt-ref', '0',
      '-pix_fmt', 'yuv420p', '-threads', '1', 'output.webm',
    ], -1, { signal: controller.signal });
    if (result !== 0) throw new Error('视频转换失败，文件可能损坏或编码不受支持，请尝试重新导出 MOV / MP4');
    const output = await ffmpeg.readFile('output.webm', undefined, { signal: controller.signal });
    if (typeof output === 'string' || output.byteLength === 0) throw new Error('视频转换失败：没有生成有效文件');
    if (output.byteLength > MAX_OUTPUT) throw new Error(`压缩后仍有 ${formatMB(output.byteLength)}，超过 30MB，请裁短视频后重试`);
    return new File([new Uint8Array(output)], file.name.replace(/\.[^.]+$/, '') + '.webm', { type: 'video/webm' });
  } catch (error) {
    if (signal.aborted) throw new Error('已取消视频处理');
    if (timedOut) throw new Error(loading ? '视频处理引擎加载超时，请检查网络后重试' : '视频处理超过 15 分钟，请裁短视频后重试');
    console.error('Video transcode failed:', error, logs.join('\n'));
    throw error instanceof Error ? error : new Error('视频处理失败，请尝试裁短视频或重新导出原文件');
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', cancel);
    ffmpeg.terminate();
    urls.forEach(url => URL.revokeObjectURL(url));
  }
}
