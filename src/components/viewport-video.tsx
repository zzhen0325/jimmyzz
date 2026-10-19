'use client';

import { useEffect, useRef, type VideoHTMLAttributes } from 'react';

type Props = Omit<VideoHTMLAttributes<HTMLVideoElement>, 'src' | 'autoPlay' | 'preload'> & { src: string };

/** Do not attach a media URL until close to the viewport; decode only on screen. */
export function ViewportVideo({ src, controls = true, ...props }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false;
    let disposed = false;
    const attach = () => {
      if (video.getAttribute('src') !== src) { video.src = src; video.preload = 'metadata'; video.load(); }
    };
    const sync = () => {
      video.controls = controls || reduced.matches;
      if (!visible || document.hidden || reduced.matches) { video.pause(); return; }
      attach();
      void video.play().then(() => {
        // A late play promise must not restart an offscreen/unmounted video.
        if (disposed || !visible || document.hidden || reduced.matches) video.pause();
      }).catch(() => { if (!disposed) video.controls = true; });
    };
    const near = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { attach(); near.disconnect(); } }, { rootMargin: '200px' });
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    near.observe(video); observer.observe(video);
    document.addEventListener('visibilitychange', sync);
    reduced.addEventListener('change', sync);
    sync();
    return () => {
      disposed = true;
      near.disconnect(); observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
      reduced.removeEventListener('change', sync);
      video.pause(); video.removeAttribute('src'); video.load();
    };
  }, [src, controls]);
  return <video {...props} ref={ref} controls={controls} muted loop playsInline preload="none" data-viewport-video />;
}
