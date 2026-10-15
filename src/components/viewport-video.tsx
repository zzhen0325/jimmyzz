"use client";

import { useEffect, useRef, type VideoHTMLAttributes } from "react";

/** Buffer before arrival; decode/play only while the video is on screen. */
export function ViewportVideo(props: Omit<VideoHTMLAttributes<HTMLVideoElement>, "autoPlay">) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    let visible = false;
    let disposed = false;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const wanted = () => visible && !document.hidden && !motion.matches && !disposed;
    const sync = () => {
      if (!wanted()) { video.pause(); return; }
      void video.play().then(() => { if (!wanted()) video.pause(); }, () => {});
    };
    const preload = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      video.preload = motion.matches ? "metadata" : "auto";
      preload.disconnect();
    }, { rootMargin: "1000px 0px" });
    const playback = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    preload.observe(video);
    playback.observe(video);
    document.addEventListener("visibilitychange", sync);
    motion.addEventListener("change", sync);
    return () => {
      disposed = true;
      preload.disconnect();
      playback.disconnect();
      document.removeEventListener("visibilitychange", sync);
      motion.removeEventListener("change", sync);
      video.pause();
    };
  }, [props.src]);
  return <video {...props} ref={ref} autoPlay={false} preload="none" />;
}
