'use client';

import NextImage, { type ImageProps } from 'next/image';
import { isUploadedImage, mediaImageUrl } from '@/lib/media-image';

/** R2 uploads use their own cached variants; static assets use Next's optimizer. */
export default function ContentImage(props: ImageProps) {
  if (isUploadedImage(props.src)) {
    return <NextImage {...props} unoptimized={false} loader={({ src, width }) => mediaImageUrl(src, width)} />;
  }
  const uploaded = typeof props.src === 'string' && props.src.startsWith('/media/');
  return <NextImage {...props} unoptimized={uploaded || props.unoptimized} />;
}
