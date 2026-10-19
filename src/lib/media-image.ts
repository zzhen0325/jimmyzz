/** Fixed variants bound transformation work and keep URLs immutable. */
export const MEDIA_IMAGE_WIDTHS = [32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840] as const;
export const MEDIA_IMAGE_VERSION = 'v1';
export const MEDIA_IMAGE_QUALITY = 85;
export const isUploadedImage = (src: unknown) => typeof src === 'string' && /^\/media\/[a-f0-9-]+\.(jpg|png|webp|avif)$/.test(src);
export function mediaImageUrl(src: string, width: number) {
  if (!isUploadedImage(src)) return src;
  const variant = MEDIA_IMAGE_WIDTHS.find(size => size >= width) ?? MEDIA_IMAGE_WIDTHS[MEDIA_IMAGE_WIDTHS.length - 1];
  return `${src}?w=${variant}&v=${MEDIA_IMAGE_VERSION}`;
}
export const mediaImageKey = (name: string, width: number) => `derived/images/${MEDIA_IMAGE_VERSION}/${name}/${width}.webp`;
