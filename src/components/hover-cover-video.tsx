"use client";

import { useEffect, useRef } from "react";

/** The static image underneath remains visible until playback actually starts. */
export function HoverCoverVideo({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    const link = video?.closest("a");
    if (!video || !link) return;
    let hovered = false;
    let focused = false;
    let visible = true;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const wanted = () => (hovered || focused) && visible && !document.hidden && !reduced.matches;
    const stop = () => {
      video.style.opacity = "0";
      video.pause();
      if (video.readyState > 0) video.currentTime = 0;
    };
    const sync = () => {
      if (wanted()) void video.play().catch(stop);
      else stop();
    };
    const playing = () => {
      if (wanted()) video.style.opacity = "1";
      else stop();
    };
    const enter = (event: PointerEvent) => { hovered = event.pointerType !== "touch"; sync(); };
    const leave = () => { hovered = false; sync(); };
    const focus = () => { focused = link.matches(":focus-visible"); sync(); };
    const blur = () => { focused = false; sync(); };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    observer.observe(link);
    link.addEventListener("pointerenter", enter);
    link.addEventListener("pointerleave", leave);
    link.addEventListener("focus", focus);
    link.addEventListener("blur", blur);
    video.addEventListener("playing", playing);
    document.addEventListener("visibilitychange", sync);
    reduced.addEventListener("change", sync);
    return () => {
      observer.disconnect();
      link.removeEventListener("pointerenter", enter);
      link.removeEventListener("pointerleave", leave);
      link.removeEventListener("focus", focus);
      link.removeEventListener("blur", blur);
      video.removeEventListener("playing", playing);
      document.removeEventListener("visibilitychange", sync);
      reduced.removeEventListener("change", sync);
      stop();
    };
  }, [src]);

  return <video ref={ref} src={src} muted loop playsInline preload="none" aria-hidden="true"
    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", opacity: 0, pointerEvents: "none" }} />;
}
