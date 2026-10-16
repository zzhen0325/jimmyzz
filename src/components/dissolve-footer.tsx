"use client";

import { useEffect, useRef } from "react";
import { ArrowUp, Code2, Eye, Heart, Sparkles } from "lucide-react";
import styles from "./dissolve-footer.module.css";

// The transparent outer halo reveals the same background as the page.
const stops = [
  { at: 0, hex: "#ffffff" },
  { at: .3, hex: "#33b1ff" },
  { at: .6, hex: "#f99eff" },
  { at: 1, hex: "#eaff9e" },
];

export function DissolveFooter() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    const mask = document.createElement("canvas");
    const maskContext = mask.getContext("2d");
    const halo = document.createElement("canvas");
    const haloContext = halo.getContext("2d", { willReadFrequently: true });
    if (!context || !maskContext || !haloContext) return;

    const rgbStops = stops.map(({ at, hex }) => ({
      at,
      rgb: [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16)),
    }));
    const lut = new Uint8ClampedArray(256 * 3);
    for (let i = 0; i < 256; i++) {
      const value = i / 255;
      const upperIndex = Math.max(1, rgbStops.findIndex(stop => stop.at >= value));
      const lower = rgbStops[upperIndex - 1];
      const upper = rgbStops[upperIndex];
      const t = (value - lower.at) / (upper.at - lower.at);
      const smooth = t * t * (3 - 2 * t);
      for (let channel = 0; channel < 3; channel++) {
        lut[i * 3 + channel] = lower.rgb[channel] + (upper.rgb[channel] - lower.rgb[channel]) * smooth;
      }
    }

    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let disposed = false;
    let visible = false;
    let frame = 0;
    let lastTime = 0;
    let time = 0;
    let dirty = true;
    let paths: Path2D[] = [];
    let viewBox = [75, 278, 1472, 733];
    let markWidth = 0;
    let markHeight = 0;
    const copies = 8;
    const controller = new AbortController();

    const measure = () => {
      const rect = canvas.getBoundingClientRect();
      // A bounded raster keeps the soft halo inexpensive on wide/retina displays.
      const ratio = Math.min(devicePixelRatio, 1.5, 1200 / Math.max(1, rect.width));
      canvas.width = mask.width = halo.width = Math.max(1, Math.round(rect.width * ratio));
      canvas.height = mask.height = halo.height = Math.max(1, Math.round(rect.height * ratio));
      const desktop = rect.width >= 810;
      // Fit the entire animated silhouette: echoes, vertical travel, stroke,
      // and three blur radii must all stay inside the canvas bitmap.
      const haloPerSide = .038 / 2 + 3 * .012;
      const verticalRoom = Math.max(1, canvas.height * (1 - copies * .01 - 2 * .025) - 6);
      const maxMarkHeight = verticalRoom / (1 + 2 * haloPerSide);
      const scale = Math.min(
        canvas.width * (desktop ? .7 : .96) / viewBox[2],
        maxMarkHeight / viewBox[3],
        Math.max(1, canvas.width - 6) / (viewBox[2] + viewBox[3] * 2 * haloPerSide),
      );
      markWidth = viewBox[2] * scale;
      markHeight = viewBox[3] * scale;
      dirty = true;
    };

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      maskContext.clearRect(0, 0, w, h);
      if (!paths.length) return;
      const scale = markWidth / viewBox[2];
      const spacing = Math.min(h * .01, markHeight * .025);
      const amplitude = Math.min(h * .025, markHeight * .12);
      const baseY = (h - markHeight - copies * spacing) / 2;
      for (let echo = copies; echo >= 0; echo--) {
        const fade = Math.pow(1 - echo / copies, 1.5);
        const y = baseY + echo * spacing + Math.sin(time * .75 - echo * .3) * amplitude;
        maskContext.save();
        maskContext.translate((w - markWidth) / 2, y);
        maskContext.scale(scale, scale);
        maskContext.translate(-viewBox[0], -viewBox[1]);
        maskContext.fillStyle = "#fff";
        maskContext.strokeStyle = "#fff";
        maskContext.lineWidth = viewBox[3] * .038;
        maskContext.lineJoin = "round";
        for (const path of paths) {
          maskContext.globalAlpha = echo === 0 ? 1 : .1 * fade;
          maskContext.fill(path, "evenodd");
          if (echo > 0) {
            maskContext.globalAlpha = .85 * fade;
            maskContext.stroke(path);
          }
        }
        maskContext.restore();
      }
      maskContext.globalAlpha = 1;
      haloContext.clearRect(0, 0, w, h);
      haloContext.filter = `blur(${Math.max(.8, markHeight * .012)}px)`;
      haloContext.drawImage(mask, 0, 0);
      haloContext.filter = "none";
      const pixels = haloContext.getImageData(0, 0, w, h);
      const data = pixels.data;
      // Map the blurred mask, with zero stochastic grain as requested.
      for (let i = 0; i < data.length; i += 4) {
        const intensity = data[i + 3];
        const color = Math.max(77, intensity) * 3;
        data[i] = lut[color];
        data[i + 1] = lut[color + 1];
        data[i + 2] = lut[color + 2];
        data[i + 3] = Math.min(255, intensity / .3);
      }
      context.putImageData(pixels, 0, 0);
      canvas.dataset.ready = "true";
      dirty = false;
    };

    const tick = (now: number) => {
      frame = 0;
      if (disposed || !visible || document.hidden) return;
      const elapsed = lastTime ? now - lastTime : 0;
      if (elapsed >= 1000 / 24 || !lastTime || dirty) {
        if (!motion.matches) {
          const delta = Math.min(elapsed, 80);
          time += delta / 1000;
        }
        if (dirty || (!motion.matches)) draw();
        lastTime = now;
      }
      if (!motion.matches) frame = requestAnimationFrame(tick);
    };
    const resume = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
      if (visible && !document.hidden && !disposed) frame = requestAnimationFrame(tick);
    };
    const resize = new ResizeObserver(() => { measure(); resume(); });
    resize.observe(canvas);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      resume();
    });
    intersection.observe(canvas);
    const motionChanged = () => {
      dirty = true;
      resume();
    };
    motion.addEventListener("change", motionChanged);
    document.addEventListener("visibilitychange", resume);
    void fetch("/assets/images/jimmy-wordmark.svg", { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error("Unable to load footer wordmark");
        return response.text();
      })
      .then(source => {
        if (disposed) return;
        const svg = new DOMParser().parseFromString(source, "image/svg+xml");
        const bounds = svg.documentElement.getAttribute("viewBox")?.trim().split(/\s+/).map(Number);
        if (bounds?.length === 4 && bounds.every(Number.isFinite)) viewBox = bounds;
        paths = Array.from(svg.querySelectorAll("path"), path => new Path2D(path.getAttribute("d") || ""));
        measure();
        resume();
      })
      .catch(() => { /* Keep the SVG fallback visible if loading fails. */ });
    measure();
    return () => {
      disposed = true;
      controller.abort();
      cancelAnimationFrame(frame);
      resize.disconnect();
      intersection.disconnect();
      motion.removeEventListener("change", motionChanged);
      document.removeEventListener("visibilitychange", resume);
    };
  }, []);

  return (
    <footer className={styles.footer} aria-label="Jimmyzz">
      <div className={styles.art}>
        <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
        <span className={styles.fallback} aria-hidden="true" />
        <span className={styles.srOnly}>Jimmyzz</span>
      </div>
      <div className={styles.signature} lang="en">
        <p>Made with curiosity<br /><span>100% CARE</span></p>
        <div className={styles.careSymbols} aria-hidden="true">
          <Eye /><Heart /><Sparkles /><Code2 />
        </div>
        <p>Designed &amp; built by<br /><span>JIMMYZZ</span><br />Always exploring.</p>
      </div>
      <div className={styles.bottom} lang="en">
        <p>Visual design &amp; creative code</p>
        <p>©2026 Jimmyzz. All rights reserved.</p>
        <a className={styles.backToTop} href="#top" data-native-cursor aria-label="Back to top / 返回顶部" onClick={(event) => {
          event.preventDefault();
          window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
        }}>
          Back to top <ArrowUp aria-hidden="true" />
        </a>
      </div>
    </footer>
  );
}
