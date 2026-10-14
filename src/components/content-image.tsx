'use client';

import NextImage, { type ImageProps } from 'next/image';

/** OpenNext's local image optimizer reads ASSETS, not the R2 /media route. */
export default function ContentImage(props: ImageProps) {
  const uploaded = typeof props.src === 'string' && props.src.startsWith('/media/');
  return <NextImage {...props} unoptimized={uploaded || props.unoptimized} />;
}
