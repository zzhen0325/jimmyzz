"use client";

import { useEffect, useRef, type RefObject } from "react";

// Centers and footprints measured on the final 16:9 video frame (center/top cover).
const shapes = [
  { name: "Think", x: 0.1805, y: 0.432, w: 0.09, h: 0.145 },
  { name: "Plan", x: 0.339, y: 0.429, w: 0.09, h: 0.18 },
  { name: "Do", x: 0.498, y: 0.432, w: 0.09, h: 0.16 },
  { name: "Review", x: 0.658, y: 0.429, w: 0.09, h: 0.18 },
  { name: "Repeat", x: 0.818, y: 0.432, w: 0.09, h: 0.16 },
];

export function HeroStoneReveal({ videoRef }: { videoRef: RefObject<HTMLVideoElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const section = canvas?.closest("section");
    const context = canvas?.getContext("2d");
    if (!video || !canvas || !context || !section) return;
    const atlas = new window.Image();
    const opacity = shapes.map(() => 0);
    let crops: { x: number; y: number; w: number; h: number }[] = [];
    let hovered = -1;
    let pending = 0;
    let previous = 0;
    let disposed = false;
    let pointer: { x: number; y: number } | null = null;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const atEnd = () => Number.isFinite(video.duration) && video.readyState >= 2 &&
      !video.seeking && video.currentTime >= video.duration - 1 / 24 - 0.005;
    const boxes = () => {
      const bounds = canvas.getBoundingClientRect();
      const scale = Math.max(bounds.width / (video.videoWidth || 1920), bounds.height / (video.videoHeight || 1080));
      const width = (video.videoWidth || 1920) * scale;
      const height = (video.videoHeight || 1080) * scale;
      return shapes.map(s => ({ x: (bounds.width - width) / 2 + (s.x - s.w / 2) * width,
        y: (s.y - s.h / 2) * height, w: s.w * width, h: s.h * height }));
    };
    const detect = () => {
      hovered = -1;
      if (!pointer || !atEnd()) return;
      const bounds = canvas.getBoundingClientRect();
      const x = pointer.x - bounds.left;
      const y = pointer.y - bounds.top;
      hovered = boxes().findIndex(b => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
    };
    const draw = (now: number) => {
      pending = 0;
      const dt = previous ? Math.min(now - previous, 50) : 16;
      previous = now;
      detect();
      const bounds = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.round(bounds.width * dpr), height = Math.round(bounds.height * dpr);
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, bounds.width, bounds.height);
      let animating = false;
      const destinations = boxes();
      opacity.forEach((value, i) => {
        const target = i === hovered ? 1 : 0;
        // Leaving the final frame clears the overlay immediately, so it never floats over moving footage.
        const next = !atEnd() ? 0 : reduced.matches ? target : value + (target - value) * (1 - Math.exp(-dt / 145));
        opacity[i] = Math.abs(next - target) < 0.003 ? target : next;
        if (opacity[i] !== target) animating = true;
        if (!crops[i] || opacity[i] === 0) return;
        const s = crops[i], b = destinations[i];
        context.globalAlpha = opacity[i];
        context.drawImage(atlas, s.x, s.y, s.w, s.h, b.x, b.y, b.w, b.h);
      });
      context.globalAlpha = 1;
      canvas.dataset.activeShape = hovered < 0 ? "" : shapes[hovered].name;
      if (animating) pending = requestAnimationFrame(draw);
      else previous = 0;
    };
    const schedule = () => { if (!disposed && !pending) pending = requestAnimationFrame(draw); };
    atlas.onload = () => {
      if (disposed) return;
      // Trim each transparent atlas cell independently, including the completed tile edges.
      const scratch = document.createElement("canvas");
      scratch.width = atlas.width; scratch.height = atlas.height;
      const ctx = scratch.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(atlas, 0, 0);
      const pixels = ctx.getImageData(0, 0, atlas.width, atlas.height).data;
      crops = shapes.map((_, i) => {
        const divisions = [0, 0.223, 0.394, 0.592, 0.784, 1];
        const left = Math.round(divisions[i] * atlas.width), right = Math.round(divisions[i + 1] * atlas.width);
        let minX = right, minY = atlas.height, maxX = left, maxY = 0;
        for (let y = 0; y < atlas.height; y++) for (let x = left; x < right; x++) {
          if (pixels[(y * atlas.width + x) * 4 + 3] > 32) {
            minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
          }
        }
        return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
      });
      schedule();
    };
    atlas.src = "/assets/images/hero-stone-atlas.png";
    const move = (event: PointerEvent) => {
      pointer = event.pointerType === "touch" || (event.target instanceof Element && event.target.closest("a,button,input,textarea,select"))
        ? null : { x: event.clientX, y: event.clientY };
      schedule();
    };
    const leave = () => { pointer = null; schedule(); };
    const resize = new ResizeObserver(schedule);
    resize.observe(canvas);
    section.addEventListener("pointermove", move);
    section.addEventListener("pointerleave", leave);
    window.addEventListener("blur", leave);
    window.addEventListener("scroll", schedule, { passive: true });
    for (const event of ["seeking", "seeked", "loadeddata", "timeupdate", "error"]) video.addEventListener(event, schedule);
    return () => {
      disposed = true;
      cancelAnimationFrame(pending);
      resize.disconnect();
      atlas.onload = null;
      section.removeEventListener("pointermove", move);
      section.removeEventListener("pointerleave", leave);
      window.removeEventListener("blur", leave);
      window.removeEventListener("scroll", schedule);
      for (const event of ["seeking", "seeked", "loadeddata", "timeupdate", "error"]) video.removeEventListener(event, schedule);
    };
  }, [videoRef]);
  return <canvas ref={canvasRef} aria-hidden="true" data-effect="stone-reveal" className="pointer-events-none absolute inset-0 size-full" />;
}
