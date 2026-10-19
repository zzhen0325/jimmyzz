"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { projectRevealFrame } from "@/lib/project-reveal";
import styles from "./project-cover-reveal.module.css";

/** Reveal immediately on hover, keeping the cover underneath while video loads. */
export function HoverCoverVideo({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const video = ref.current;
    const layer = layerRef.current;
    const overlay = overlayRef.current;
    const link = video?.closest("a");
    if (!video || !link || !layer || !overlay) return;
    let reveal: gsap.core.Timeline | null = null;
    let hovered = false;
    let focused = false;
    let visible = true;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const wanted = () => (hovered || focused) && visible && !document.hidden && !reduced.matches;
    const stop = () => {
      reveal?.kill();
      reveal = null;
      layer.style.opacity = "0";
      video.pause();
      if (video.readyState > 0) video.currentTime = 0;
    };
    const sync = () => {
      if (wanted()) {
        // Resume from the current mask when hover changes during a transition.
        if (reveal) reveal.play();
        else {
          startReveal();
          void video.play().catch(() => { if (video.paused && wanted()) stop(); });
        }
      } else if (!visible || document.hidden || reduced.matches) {
        stop();
      } else if (reveal) {
        // Keep the video frame alive until the gradient uncovers the cover.
        if (reveal.time() === 0) stop();
        else reveal.reverse();
      } else {
        stop();
      }
    };
    const startReveal = () => {
      if (reveal) return;
      const frame = (revealed: boolean) => {
        const width = layer.clientWidth, height = layer.clientHeight;
        if (!revealed) return projectRevealFrame(width, height, false);
        // End when the opaque center covers the corners, avoiding an invisible
        // oversized tail that would delay the visible reverse transition.
        const diameter = Math.hypot(width, height) / .0992 + 2;
        return { backgroundSize: `${diameter}px ${diameter}px`, backgroundPosition: `50% ${(height - diameter) / 2}px` };
      };
      gsap.set(layer, {
        opacity: 1,
        maskImage: "radial-gradient(circle closest-side at 50% 50%, #000 0%, #000 9.92%, transparent 14.25%, transparent 100%)",
      });
      gsap.set(overlay, { display: "block", autoAlpha: 1 });
      reveal = gsap.timeline({ onReverseComplete: stop })
        .fromTo(layer, {
          "--cover-reveal-size": () => frame(false).backgroundSize,
          "--cover-reveal-position": () => frame(false).backgroundPosition,
        }, {
          "--cover-reveal-size": () => frame(true).backgroundSize,
          "--cover-reveal-position": () => frame(true).backgroundPosition,
          duration: .3,
          ease: "none",
        })
        .set(overlay, { autoAlpha: 0 })
        .set(layer, { maskImage: "none" });
    };
    const enter = (event: PointerEvent) => { hovered = event.pointerType !== "touch"; sync(); };
    const leave = () => { hovered = false; sync(); };
    const focus = () => { focused = link.matches(":focus-visible"); sync(); };
    const blur = () => { focused = false; sync(); };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    const preload = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || reduced.matches) return;
      video.preload = "auto";
      preload.disconnect();
    }, { rootMargin: "800px 0px" });
    observer.observe(link);
    preload.observe(link);
    link.addEventListener("pointerenter", enter);
    link.addEventListener("pointerleave", leave);
    link.addEventListener("focus", focus);
    link.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", sync);
    reduced.addEventListener("change", sync);
    return () => {
      observer.disconnect();
      preload.disconnect();
      link.removeEventListener("pointerenter", enter);
      link.removeEventListener("pointerleave", leave);
      link.removeEventListener("focus", focus);
      link.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", sync);
      reduced.removeEventListener("change", sync);
      stop();
    };
  }, [src]);

  return <div ref={layerRef} className={styles.cover} aria-hidden="true"
    style={{ position: "absolute", inset: 0, opacity: 0, pointerEvents: "none" }}>
    <video ref={ref} src={src} muted loop playsInline preload="none"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
    <div ref={overlayRef} className={styles.pastel} />
  </div>;
}
