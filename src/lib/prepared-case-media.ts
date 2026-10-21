import manifest from './case-media-manifest.json';
import { mediaImageUrl } from './media-image';

type PreparedImage = { width: number; height: number; variants: { width: number; src: string; bytes: number }[] };
type PreparedVideo = { src: string; poster: string; bytes: number };
const prepared = manifest as Record<string, PreparedImage | PreparedVideo>;
export function preparedCaseImage(src: unknown): PreparedImage | undefined {
  const entry = typeof src === 'string' ? prepared[src] : undefined;
  return entry && 'variants' in entry ? entry : undefined;
}
export function preparedCaseVideo(src: string): PreparedVideo | undefined {
  const entry = prepared[src];
  return entry && 'poster' in entry ? entry : undefined;
}
export function caseMediaImageLoader({ src, width }: { src: string; width: number }) {
  const image = preparedCaseImage(src);
  return image ? (image.variants.find(v => v.width >= width) ?? image.variants[image.variants.length - 1]).src : mediaImageUrl(src, width);
}
