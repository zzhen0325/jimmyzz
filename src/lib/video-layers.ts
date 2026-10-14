import type { Asset, VideoLayer } from './projects-config';

export function getVideoLayers(asset: Asset): VideoLayer[] {
  return asset.videoLayers ?? (asset.videoLayer ? [asset.videoLayer] : []);
}
