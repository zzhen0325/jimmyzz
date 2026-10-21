'use client';

import NextImage, { type ImageProps } from 'next/image';
import { isUploadedImage } from '@/lib/media-image';
import { preparedCaseImage, caseMediaImageLoader } from '@/lib/prepared-case-media';

/** R2 uploads use their own cached variants; static assets use Next's optimizer. */
export default function ContentImage(props: ImageProps) {
  if (preparedCaseImage(props.src) || isUploadedImage(props.src)) {
    return <NextImage {...props} unoptimized={false} loader={caseMediaImageLoader} />;
  }
  const uploaded = typeof props.src === 'string' && props.src.startsWith('/media/');
  return <NextImage {...props} unoptimized={uploaded || props.unoptimized} />;
}
