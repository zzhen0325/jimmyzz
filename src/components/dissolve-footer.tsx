"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./dissolve-footer.module.css";

// Reference palette: white → blue halo → pink core → pale lime inner core.
const stops = [
  { at: 0, rgb: [255, 255, 255] },
  { at: .3, rgb: [51, 177, 255] },
  { at: .6, rgb: [249, 158, 255] },
  { at: 1, rgb: [234, 255, 158] },
];

export function DissolveFooter({ children }: { children: ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);

  useEffect(() => { pausedRef.current = paused; }, [paused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    const mask = document.createElement("canvas");
    const maskContext = mask.getContext("2d");
    const halo = document.createElement("canvas");
    const haloContext = halo.getContext("2d", { willReadFrequently: true });
    if (!context || !maskContext || !haloContext) return;

    const lut = new Uint8ClampedArray(256 * 3);
    for (let i = 0; i < 256; i++) {
      const value = i / 255;
      const upperIndex = Math.max(1, stops.findIndex(stop => stop.at >= value));
      const lower = stops[upperIndex - 1];
      const upper = stops[upperIndex];
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
    let font = "";
    let fontSize = 0;
    let widths: number[] = [];
    const letters = [..."Jimmyzz"];

    const measure = () => {
      const rect = canvas.getBoundingClientRect();
      // A bounded raster keeps the soft halo inexpensive on wide/retina displays.
      const ratio = Math.min(devicePixelRatio, 1.5, 1200 / Math.max(1, rect.width));
      canvas.width = mask.width = halo.width = Math.max(1, Math.round(rect.width * ratio));
      canvas.height = mask.height = halo.height = Math.max(1, Math.round(rect.height * ratio));
      const family = getComputedStyle(canvas).fontFamily;
      fontSize = Math.min(canvas.width * .2, canvas.height * .48);
      font = `400 ${fontSize}px ${family}`;
      maskContext.font = font;
      const measured = letters.map(letter => maskContext.measureText(letter).width);
      const fit = Math.min(1, canvas.width * .83 / measured.reduce((sum, width) => sum + width, 0));
      fontSize *= fit;
      font = `400 ${fontSize}px ${family}`;
      maskContext.font = font;
      widths = letters.map(letter => maskContext.measureText(letter).width);
      dirty = true;
    };

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      maskContext.clearRect(0, 0, w, h);
      maskContext.font = font;
      maskContext.textAlign = "center";
      maskContext.textBaseline = "middle";
      maskContext.fillStyle = "#fff";
      const textWidth = widths.reduce((sum, width) => sum + width, 0);
      const copies = 18;
      const spacing = Math.min(h * .026, fontSize * .085);
      const amplitude = Math.min(h * .075, fontSize * .27);
      const baseY = h * .43 - copies * spacing * .25;
      for (let echo = copies; echo >= 0; echo--) {
        const fade = Math.pow(1 - echo / copies, 1.5);
        let x = (w - textWidth) / 2;
        for (let index = 0; index < letters.length; index++) {
          const phase = time * .75 + index * .4 - echo * .3;
          const y = baseY + echo * spacing + Math.sin(phase) * amplitude;
          maskContext.save();
          maskContext.translate(x + widths[index] / 2, y);
          maskContext.scale(1, 1.22);
          // Separate contour echoes retain the air between successive layers;
          // a faint body joins them without flattening the wave into a solid smear.
          maskContext.globalAlpha = echo === 0 ? 1 : .1 * fade;
          maskContext.fillText(letters[index], 0, 0);
          if (echo > 0) {
            maskContext.globalAlpha = .85 * fade;
            maskContext.strokeStyle = "#fff";
            maskContext.lineWidth = fontSize * .026;
            maskContext.lineJoin = "round";
            maskContext.strokeText(letters[index], 0, 0);
          }
          maskContext.restore();
          x += widths[index];
        }
      }
      maskContext.globalAlpha = 1;
      haloContext.clearRect(0, 0, w, h);
      haloContext.filter = `blur(${Math.max(.8, fontSize * .016)}px)`;
      haloContext.drawImage(mask, 0, 0);
      haloContext.filter = "none";
      const pixels = haloContext.getImageData(0, 0, w, h);
      const data = pixels.data;
      // Map the blurred mask, with zero stochastic grain as requested.
      for (let i = 0; i < data.length; i += 4) {
        const color = data[i + 3] * 3;
        data[i] = lut[color];
        data[i + 1] = lut[color + 1];
        data[i + 2] = lut[color + 2];
        data[i + 3] = 255;
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
        if (!pausedRef.current && !motion.matches) time += Math.min(elapsed, 80) / 1000;
        if (dirty || (!pausedRef.current && !motion.matches)) draw();
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
    const motionChanged = () => { dirty = true; resume(); };
    motion.addEventListener("change", motionChanged);
    document.addEventListener("visibilitychange", resume);
    void document.fonts.ready.then(() => { if (!disposed) { measure(); resume(); } });
    measure();
    return () => {
      disposed = true;
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
        <span className={styles.fallback} aria-hidden="true">Jimmyzz</span>
        <span className={styles.srOnly}>Jimmyzz</span>
        <button className={styles.pause} type="button" aria-pressed={paused} onClick={() => setPaused(value => !value)}>
          {paused ? "播放动效" : "暂停动效"}
        </button>
      </div>
      {children}
    </footer>
  );
}
