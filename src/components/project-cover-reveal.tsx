"use client";

import { useRef, type ReactNode, type CSSProperties } from "react";
import { gsap, ScrollTrigger, useGSAP, motionConditions } from "@/lib/gsap";
import { projectRevealFrame } from "@/lib/project-reveal";
import styles from "./project-cover-reveal.module.css";

export function ProjectCoverReveal({ children, className, style }: {
  children: ReactNode;
  className: string;
  style?: CSSProperties;
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
      const prepareVideo = () => {
        if (!video || video.preload === "auto") return;
        video.preload = "auto";
        video.load();
      };
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
      const frame = (revealed: boolean) => projectRevealFrame(host.clientWidth, host.clientHeight, revealed);
      // Expand the colored ring and its alpha mask together, leaving the
      // unrevealed area transparent rather than covering it with white.
      const mask = "radial-gradient(circle closest-side at 50% 50%, #000 0%, #000 9.92%, transparent 14.25%, transparent 100%)";
      gsap.set(overlay, { display: "block", autoAlpha: 1 });
      const timeline = gsap.timeline({ paused: true, onComplete: resumeVideo })
        .set(host, { maskImage: mask })
        .fromTo(host, {
          "--cover-reveal-size": () => frame(false).backgroundSize,
          "--cover-reveal-position": () => frame(false).backgroundPosition,
        }, {
          "--cover-reveal-size": () => frame(true).backgroundSize,
          "--cover-reveal-position": () => frame(true).backgroundPosition,
          duration: 1.75,
          ease: "power4.inOut",
        })
        .set(overlay, { autoAlpha: 0 })
        .set(host, { maskImage: "none" });
      const play = () => {
        if (!ready || !entered || timeline.progress() > 0) return;
        video?.pause();
        timeline.play();
      };
      const reset = () => {
        timeline.pause(0);
        host.style.maskImage = mask;
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
          if (entered) { prepareVideo(); play(); }
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
    <div ref={root} className={`${className} ${styles.cover}`} style={style} data-work-skew>
      {children}
      <div ref={overlayRef} className={styles.pastel} aria-hidden="true" />
    </div>
  );
}
