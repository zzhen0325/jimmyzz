'use client';
import { getVideoLayers } from '@/lib/video-layers';
import { useRef, useState } from 'react';
import type { Asset, VideoLayer } from '@/lib/projects-config';
import { LayeredMedia, layerStyle } from '@/components/layered-media';

export const defaultVideoLayer = (src: string): VideoLayer => ({ src, x: 35.9, y: 10, width: 28.3, height: 81.8, radius: 13, fit: 'cover', order: 'above' });
const clamp = (n: number, max: number) => Math.min(max, Math.max(0, n));
export function VideoLayerEditor({ asset, onChange, onUpload }: { asset: Asset; onChange: (layers: VideoLayer[]) => void; onUpload: (file: File, index?: number) => void }) {
  const layers = getVideoLayers(asset);
  const [selected, setSelected] = useState(0);
  const index = Math.min(selected, Math.max(0, layers.length - 1));
  const layer = layers[index];
  function change(next: VideoLayer | undefined) {
    onChange(next ? layers.map((item, i) => i === index ? next : item) : layers.filter((_, i) => i !== index));
  }
  const drag = useRef<{ x: number; y: number; layer: VideoLayer; width: number; height: number } | null>(null);
  function patch(values: Partial<VideoLayer>) {
    if (!layer) return;
    const next = { ...layer, ...values };
    if (values.width !== undefined) next.width = Math.min(next.width, 100 - layer.x);
    if (values.height !== undefined) next.height = Math.min(next.height, 100 - layer.y);
    next.x = clamp(next.x, 100 - next.width); next.y = clamp(next.y, 100 - next.height);
    change(next);
  }
  return <details className="video-layer-editor">
    <summary>{layer ? '调整视频图层' : '＋ 配置叠层视频'}</summary>
    <p className="hint">拖动视频框调整位置；数值以整张图片的百分比计算，手机端会同比缩放。按宽度缩放时顶部固定，只裁切底部；居中裁剪会等比填满视频框，并居中裁掉超出部分。图片不透明时请选择视频在上层。</p>
    {layers.length > 0 && <label>选择视频<select value={index} onChange={e => setSelected(Number(e.target.value))}>{layers.map((_, i) => <option key={i} value={i}>视频 {i + 1}</option>)}</select></label>}
    <label className="upload">{layer ? '替换视频' : '上传视频'}<input type="file" aria-label="上传叠层视频" accept="video/mp4,video/webm,video/quicktime,.mp4,.mov,.webm" onChange={e => { const file = e.target.files?.[0]; if (file) onUpload(file, layer ? index : undefined); e.target.value = ''; }} /></label>
    {layer && layers.length < 20 && <label className="upload">＋ 添加视频<input type="file" aria-label="添加叠层视频" accept="video/mp4,video/webm,video/quicktime,.mp4,.mov,.webm" onChange={e => { const file = e.target.files?.[0]; if (file) { setSelected(layers.length); onUpload(file); } e.target.value = ''; }} /></label>}
    {layer && <>
      <div className="layer-preview"><LayeredMedia asset={asset} alt="图层对齐预览">
        <div role="slider" tabIndex={0} aria-label="视频位置，方向键移动，Shift 加速" aria-valuetext={`横向 ${layer.x.toFixed(2)}%，纵向 ${layer.y.toFixed(2)}%`} aria-valuenow={layer.x} aria-valuemin={0} aria-valuemax={100}
          style={{ ...layerStyle(layer), zIndex: 3, borderRadius: 0, outline: '2px solid #526e26', cursor: 'move', touchAction: 'none', background: 'transparent' }}
          onPointerDown={e => { const box = e.currentTarget.parentElement!.getBoundingClientRect(); drag.current = { x: e.clientX, y: e.clientY, layer, width: box.width, height: box.height }; e.currentTarget.setPointerCapture(e.pointerId); }}
          onPointerMove={e => { const start = drag.current; if (!start) return; patch({ x: start.layer.x + (e.clientX - start.x) / start.width * 100, y: start.layer.y + (e.clientY - start.y) / start.height * 100 }); }}
          onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}
          onKeyDown={e => { const step = e.shiftKey ? 1 : .1; if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) return; e.preventDefault(); patch({ x: layer.x + (e.key === 'ArrowRight' ? step : e.key === 'ArrowLeft' ? -step : 0), y: layer.y + (e.key === 'ArrowDown' ? step : e.key === 'ArrowUp' ? -step : 0) }); }} />
      </LayeredMedia></div>
      <div className="layer-fields">{([['x','水平位置',0,100-layer.width],['y','垂直位置',0,100-layer.height],['width','宽度',.1,100-layer.x],['height',layer.fit === 'cover' ? '裁切高度（顶部固定）' : '高度',.1,100-layer.y],['radius','圆角',0,50]] as const).map(([key,label,min,max]) => <label key={key}>{label} %<input type="number" min={min} max={max} step="0.1" value={Number(layer[key].toFixed(2))} onChange={e => { const n = e.target.valueAsNumber; if (Number.isFinite(n)) patch({ [key]: Math.max(min, Math.min(max,n)) }); }} /></label>)}
        <label>图层顺序<select value={layer.order} onChange={e => patch({ order: e.target.value as VideoLayer['order'] })}><option value="above">视频在图片上方</option><option value="below">视频在图片下方（透明图）</option></select></label>
        <label>视频适配<select value={layer.fit} onChange={e => patch({ fit: e.target.value as VideoLayer['fit'] })}><option value="cover">按宽度缩放，裁切底部</option><option value="contain">完整显示</option><option value="center-crop">居中裁剪</option></select></label>
      </div>
      <div className="layer-actions"><button type="button" onClick={() => patch({ x: (100-layer.width)/2 })}>水平居中</button><button type="button" onClick={() => patch({ y: (100-layer.height)/2 })}>垂直居中</button><button type="button" onClick={() => change(defaultVideoLayer(layer.src))}>手机屏幕预设</button><button type="button" className="danger" onClick={() => change(undefined)}>移除视频图层</button></div>
    </>}
  </details>;
}
