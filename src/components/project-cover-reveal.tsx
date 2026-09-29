"use client";

import { useRef, type ReactNode } from "react";
import { gsap, ScrollTrigger, useGSAP, motionConditions } from "@/lib/gsap";
import styles from "./project-cover-reveal.module.css";

// Bake the #31BEFF-to-background (#F7F7F7) mapping once, rather than running a
// multi-pass SVG filter on every full-resolution image/video frame.
const colours = [[49, 190, 255], [188, 229, 250], [222, 240, 248], [240, 245, 247], [255, 255, 255]];
const ramp = new Uint8ClampedArray(256 * 3);
for (let value = 0; value < 256; value++) {
  // Keep pale-blue detail through the midtones, fading to the background at highlights.
  const position = Math.pow(value / 255, 0.8) * 4;
  const start = Math.min(3, Math.floor(position));
  const mix = position - start;
  for (let channel = 0; channel < 3; channel++) {
    ramp[value * 3 + channel] = colours[start][channel] * (1 - mix) + colours[start + 1][channel] * mix;
  }
}

function paintPastel(canvas: HTMLCanvasElement, source: HTMLImageElement | HTMLVideoElement) {
  const width = source instanceof HTMLVideoElement ? source.videoWidth : source.naturalWidth;
  const height = source instanceof HTMLVideoElement ? source.videoHeight : source.naturalHeight;
  if (!width || !height) return false;
  // The temporary soft-colour layer never needs a device-pixel-sized texture.
  const scale = Math.min(1, 640 / Math.max(width, height));
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return false;
  try {
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = pixels.data;
    for (let i = 0; i < data.length; i += 4) {
      const index = Math.round(data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722) * 3;
      data[i] = ramp[index];
      data[i + 1] = ramp[index + 1];
      data[i + 2] = ramp[index + 2];
    }
    context.putImageData(pixels, 0, 0);
    return true;
  } catch {
    // Cross-origin or unavailable frames still get the ordinary entrance fade.
    return false;
  }
}

export function ProjectCoverReveal({ children, className }: {
  children: ReactNode;
  className: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useGSAP(() => {
    const host = root.current;
    const canvas = canvasRef.current;
    const media = host?.querySelector<HTMLImageElement | HTMLVideoElement>("img, video");
    if (!host || !canvas || !media) return;
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
      let prepared = false;
      let mapped = false;
      let poster: HTMLImageElement | null = null;
      let source: HTMLImageElement | HTMLVideoElement = media;
      gsap.set(host, { opacity: 0 });
      gsap.set(canvas, { display: "block", opacity: 0, maskPosition: "0% 0%" });
      const setOpacity = gsap.quickSetter(host, "opacity");
      const setOverlayOpacity = gsap.quickSetter(canvas, "opacity");
      const timeline = gsap.timeline({ paused: true, onComplete: resumeVideo })
        .fromTo(host, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: "power1.inOut" }, 0.05)
        .fromTo(canvas, { maskPosition: "0% 0%" }, { maskPosition: "0% 100%", duration: 0.35, ease: "power2.inOut" }, 0.4)
        .to(canvas, { opacity: 0, duration: 0.04 }, 0.71)
        .set(host, { clearProps: "opacity,willChange" });
      const play = () => {
        if (!ready || !entered || timeline.progress() > 0) return;
        video?.pause();
        if (!prepared) {
          mapped = paintPastel(canvas, source);
          prepared = true;
        }
        setOverlayOpacity(mapped ? 1 : 0);
        host.style.willChange = "opacity";
        timeline.play();
      };
      const reset = () => {
        timeline.pause(0);
        setOpacity(0);
        setOverlayOpacity(0);
        host.style.removeProperty("will-change");
        video?.pause();
        // Static images reuse their cached map; videos snapshot once per entrance.
        if (video) prepared = false;
      };
      const loaded = () => { ready = true; source = media; play(); };
      const failed = () => { ready = true; prepared = true; mapped = false; play(); };
      media.addEventListener("load", loaded);
      media.addEventListener("loadeddata", loaded);
      media.addEventListener("error", failed);
      if (video?.poster && !ready) {
        poster = new window.Image();
        poster.onload = () => { if (!ready && poster) { source = poster; ready = true; play(); } };
        poster.src = video.poster;
      }
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
        media.removeEventListener("load", loaded);
        media.removeEventListener("loadeddata", loaded);
        media.removeEventListener("error", failed);
        if (poster) poster.onload = null;
      };
    }, root);
    return () => mm.revert();
  }, { scope: root });

  return (
    <div ref={root} className={className} data-work-skew>
      {children}
      <canvas ref={canvasRef} className={styles.pastel} aria-hidden="true" />
    </div>
  );
}
