"use client";

import { useRef, type ReactNode } from "react";
import { gsap, ScrollTrigger, useGSAP, motionConditions } from "@/lib/gsap";
import styles from "./project-cover-reveal.module.css";

export function ProjectCoverReveal({ children, className }: {
  children: ReactNode;
  className: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const host = root.current;
    const overlay = overlayRef.current;
    const media = host?.querySelector<HTMLImageElement | HTMLVideoElement>("img, video");
    if (!host || !overlay || !media) return;
    const video = media instanceof HTMLVideoElement ? media : null;
    video?.pause();
    const mm = gsap.matchMedia();
    mm.add(motionConditions, ({ conditions }) => {
      let entered = false;
      const resumeVideo = () => { if (entered && video) void video.play().catch(() => {}); };
      if (conditions?.reduced) {
        ScrollTrigger.create({
          trigger: host, start: "top bottom", end: "bottom top",
          onToggle: (self) => { entered = self.isActive; if (entered) resumeVideo(); else video?.pause(); },
        });
        return;
      }

      let ready = video ? video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA : (media as HTMLImageElement).complete;
      let poster: HTMLImageElement | null = null;
      const size = () => {
        const width = host.clientWidth;
        const height = host.clientHeight;
        return { height, edge: Math.max(width, height), diagonal: Math.hypot(width, height) };
      };
      // Refero's welcome reveal: expand a spectral ring over the original media.
      // Black is neutral in screen blending; white conceals the unrevealed area.
      // Adapt its viewport geometry to each cover, including portrait covers.
      gsap.set(overlay, { display: "block", autoAlpha: 1 });
      const timeline = gsap.timeline({ paused: true, onComplete: resumeVideo })
        .fromTo(overlay, {
          backgroundSize: () => `${2 * size().edge}px ${2 * size().edge}px`,
          backgroundPosition: () => `50% ${size().height - 0.8 * size().edge}px`,
        }, {
          backgroundSize: () => {
            const diameter = 21.7865 * size().diagonal + 43.573;
            return `${diameter}px ${diameter}px`;
          },
          backgroundPosition: () => `50% ${(size().height - (21.7865 * size().diagonal + 43.573)) / 2}px`,
          duration: 1.75,
          ease: "none",
        })
        .set(overlay, { autoAlpha: 0 });
      const play = () => {
        if (!ready || !entered || timeline.progress() > 0) return;
        video?.pause();
        timeline.play();
      };
      const reset = () => {
        timeline.pause(0);
        overlay.style.visibility = "visible";
        overlay.style.opacity = "1";
        video?.pause();
      };
      const loaded = () => { ready = true; play(); };
      media.addEventListener("load", loaded);
      media.addEventListener("loadeddata", loaded);
      media.addEventListener("error", loaded);
      if (video?.poster && !ready) {
        poster = new window.Image();
        poster.onload = loaded;
        poster.src = video.poster;
      }
      const observer = new ResizeObserver(() => {
        // Refresh function-based geometry without replaying a completed entrance.
        const progress = timeline.progress();
        timeline.invalidate().progress(progress);
      });
      observer.observe(host);
      ScrollTrigger.create({
        trigger: host, start: "top bottom", end: "bottom top",
        onToggle: (self) => {
          entered = self.isActive;
          reset();
          if (entered) play();
        },
      });
      if (!entered) video?.pause();
      return () => {
        observer.disconnect();
        media.removeEventListener("load", loaded);
        media.removeEventListener("loadeddata", loaded);
        media.removeEventListener("error", loaded);
        if (poster) poster.onload = null;
      };
    }, root);
    return () => mm.revert();
  }, { scope: root });

  return (
    <div ref={root} className={`${className} ${styles.cover}`} data-work-skew>
      {children}
      <div ref={overlayRef} className={styles.pastel} aria-hidden="true" />
    </div>
  );
}
