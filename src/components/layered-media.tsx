/* eslint-disable @next/next/no-img-element */
import { getVideoLayers } from '@/lib/video-layers';
import type { ReactNode } from 'react';
import type { Asset, VideoLayer } from '@/lib/projects-config';

export function layerStyle(layer: VideoLayer) {
  return { position: 'absolute' as const, left: `${layer.x}%`, top: `${layer.y}%`, width: `${layer.width}%`, height: `${layer.height}%`, overflow: 'hidden', borderRadius: `${layer.radius}% / ${layer.radius * layer.width / layer.height}%`, zIndex: layer.order === 'above' ? 2 : 0 };
}

/** Shared canvas keeps the editor and published page in exact alignment. */
export function LayeredMedia({ asset, alt, children }: { asset: Asset; alt: string; children?: ReactNode }) {
  const layers = getVideoLayers(asset);
  return <div style={{ position: 'relative', isolation: 'isolate', width: '100%', overflow: 'hidden' }}>
    <img src={asset.src} alt={alt} width={asset.width} height={asset.height} loading="lazy" draggable={false}
      style={{ display: 'block', position: 'relative', zIndex: 1, width: '100%', height: 'auto', margin: 0, background: 'transparent' }} />
    {layers.map((layer, index) => <div key={index} style={{ ...layerStyle(layer), borderRadius: `${layer.radius}% / ${layer.radius * layer.width * (asset.width || 1) / (layer.height * (asset.height || 1))}%` }}>
      <video src={layer.src} aria-label={`${alt} · 叠层视频`} autoPlay muted loop playsInline preload="metadata"
        style={{ display: 'block', width: '100%', height: layer.fit === 'cover' ? 'auto' : '100%', objectFit: layer.fit === 'center-crop' ? 'cover' : layer.fit, objectPosition: layer.fit === 'center-crop' ? 'center center' : 'center top', maxWidth: 'none' }} />
    </div>)}
    {children}
  </div>;
}
