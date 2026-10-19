import Image from './content-image';
import { ViewportVideo } from './viewport-video';
import { getVideoLayers } from '@/lib/video-layers';
import type { ReactNode } from 'react';
import type { Asset, VideoLayer } from '@/lib/projects-config';

export function layerStyle(layer: VideoLayer) {
  return { position: 'absolute' as const, left: `${layer.x}%`, top: `${layer.y}%`, width: `${layer.width}%`, height: `${layer.height}%`, overflow: 'hidden', borderRadius: `${layer.radius}% / ${layer.radius * layer.width / layer.height}%`, zIndex: layer.order === 'above' ? 2 : 0 };
}

/** Shared canvas keeps the editor and published page in exact alignment. */
export function LayeredMedia({ asset, alt, children, priority = false }: { asset: Asset; alt: string; children?: ReactNode; priority?: boolean }) {
  const layers = getVideoLayers(asset);
  return <div style={{ position: 'relative', isolation: 'isolate', width: '100%', overflow: 'hidden' }}>
    <Image src={asset.src} alt={alt} width={asset.width || 960} height={asset.height || 540} sizes="(max-width: 599px) calc(100vw - 32px), 58.333vw" loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : undefined} draggable={false}
      style={{ display: 'block', position: 'relative', zIndex: 1, width: '100%', height: 'auto', margin: 0, background: 'transparent' }} />
    {layers.map((layer, index) => <div key={index} style={{ ...layerStyle(layer), borderRadius: `${layer.radius}% / ${layer.radius * layer.width * (asset.width || 1) / (layer.height * (asset.height || 1))}%` }}>
      <ViewportVideo src={layer.src} controls={false} aria-label={`${alt} · 叠层视频`}
        style={{ display: 'block', width: '100%', height: layer.fit === 'cover' ? 'auto' : '100%', objectFit: layer.fit === 'center-crop' ? 'cover' : layer.fit, objectPosition: layer.fit === 'center-crop' ? 'center center' : 'center top', maxWidth: 'none' }} />
    </div>)}
    {children}
  </div>;
}
