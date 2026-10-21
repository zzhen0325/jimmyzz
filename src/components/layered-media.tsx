'use client';

import Image from './content-image';
import { ViewportVideo } from './viewport-video';
import { getVideoLayers } from '@/lib/video-layers';
import { useState, type ReactNode } from 'react';
import type { Asset, VideoLayer } from '@/lib/projects-config';
import styles from './viewport-video.module.css';

export function layerStyle(layer: VideoLayer) {
  return { position: 'absolute' as const, left: `${layer.x}%`, top: `${layer.y}%`, width: `${layer.width}%`, height: `${layer.height}%`, overflow: 'hidden', borderRadius: `${layer.radius}% / ${layer.radius * layer.width / layer.height}%`, zIndex: layer.order === 'above' ? 2 : 0 };
}

/** Shared canvas keeps the editor and published page in exact alignment. */
export function LayeredMedia({ asset, alt, children, priority = false, eager = false, playerControls = false }: { asset: Asset; alt: string; children?: ReactNode; priority?: boolean; eager?: boolean; playerControls?: boolean }) {
  const layers = getVideoLayers(asset);
  return <div data-layered-media style={{ position: 'relative', isolation: 'isolate', width: '100%', overflow: 'hidden' }}>
    <Image src={asset.src} alt={alt} width={asset.width || 960} height={asset.height || 540} sizes="(max-width: 599px) calc(100vw - 32px), 58.333vw" loading={priority || eager ? "eager" : "lazy"} fetchPriority={priority ? "high" : "low"} draggable={false}
      style={{ display: 'block', position: 'relative', zIndex: 1, width: '100%', height: 'auto', margin: 0, background: 'transparent' }} />
    {layers.map((layer, index) => <LayerVideo key={index} layer={layer} asset={asset} alt={alt} priority={priority} playerControls={playerControls} />)}
    {children}
  </div>;
}


function LayerVideo({ layer, asset, alt, priority, playerControls }: { layer: VideoLayer; asset: Asset; alt: string; priority: boolean; playerControls: boolean }) {
  const [controlsHost, setControlsHost] = useState<HTMLDivElement | null>(null);
  const frameStyle = { ...layerStyle(layer), borderRadius: `${layer.radius}% / ${layer.radius * layer.width * (asset.width || 1) / (layer.height * (asset.height || 1))}%` };
  return <>
    <div style={frameStyle}>
      <ViewportVideo src={layer.src} eager={priority} controls={false} minimalControls={playerControls} embedded={playerControls} controlsContainer={controlsHost} aria-label={`${alt} · 叠层视频`}
        style={{ display: 'block', width: '100%', height: layer.fit === 'cover' ? 'auto' : '100%', objectFit: layer.fit === 'center-crop' ? 'cover' : layer.fit, objectPosition: layer.fit === 'center-crop' ? 'center center' : 'center top', maxWidth: 'none' }} />
    </div>
    {playerControls && <div ref={setControlsHost} className={styles.embeddedHost} style={{
      ...frameStyle, zIndex: 3,
    }} />}
  </>;
}
