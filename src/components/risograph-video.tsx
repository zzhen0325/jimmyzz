"use client";

import { useEffect, useRef, type RefObject } from "react";
import { createRisographRenderer, risographSettings } from "@/lib/risograph";

export function RisographVideo({ videoRef }: { videoRef: RefObject<HTMLVideoElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    let renderer = createRisographRenderer(canvas);
    let pending = 0;
    let frameCallback = 0;
    let visible = true;
    let disposed = false;
    let grainTimer: ReturnType<typeof setTimeout> | undefined;
    let grainFrame = 0;
    let textureReady = false;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const hasFrameCallback = typeof video.requestVideoFrameCallback === "function";
    const active = () => !disposed && visible && !document.hidden;
    const hide = () => { canvas.style.opacity = "0"; };
    const draw = (newFrame = false) => {
      if (!active()) return;
      try {
        if (renderer?.draw(video, newFrame)) canvas.style.opacity = "1";
      } catch {
        hide();
      }
    };
    const schedule = () => {
      if (!pending && active()) pending = requestAnimationFrame(() => {
        pending = 0;
        draw();
        if (!hasFrameCallback && !video.paused) schedule();
      });
    };
    const watchFrames = () => {
      if (!active() || !hasFrameCallback || frameCallback) return;
      frameCallback = video.requestVideoFrameCallback(() => {
        frameCallback = 0;
        draw(true);
        watchFrames();
      });
    };
    const animateGrain = () => {
      if (!active() || !textureReady || reducedMotion.matches || grainTimer !== undefined) return;
      grainTimer = setTimeout(() => {
        grainTimer = undefined;
        if (!active()) return;
        renderer?.setGrainFrame(++grainFrame);
        // Reuse the uploaded video texture: only the independent noise layer changes.
        draw();
        animateGrain();
      }, 1000 / risographSettings.grainAnimationFps);
    };
    const stop = () => {
      clearTimeout(grainTimer);
      grainTimer = undefined;
      cancelAnimationFrame(pending);
      pending = 0;
      if (frameCallback) video.cancelVideoFrameCallback(frameCallback);
      frameCallback = 0;
    };
    const resume = () => {
      if (!active()) { stop(); return; }
      watchFrames();
      schedule();
      animateGrain();
    };
    const onSeeked = () => {
      // Submit this decoded frame before the parent's next rAF-driven seek.
      // Also covers browsers that don't deliver rVFC for a paused seek.
      draw(true);
    };
    const onResize = () => { renderer?.resize(); schedule(); };
    const awaitTexture = () => {
      textureReady = false;
      renderer?.ready.then(() => {
        if (!disposed) { textureReady = true; resume(); }
      }).catch(hide);
    };
    const onMotionChange = () => {
      stop();
      grainFrame = 0;
      renderer?.setGrainFrame(0);
      resume();
    };
    const lost = (event: Event) => {
      event.preventDefault();
      stop();
      hide();
      // Invalidate old resources while lost; their handles cannot be deleted
      // against the restored context, which would raise INVALID_OPERATION.
      renderer?.dispose();
      renderer = null;
    };
    const restored = () => {
      renderer = createRisographRenderer(canvas);
      awaitTexture();
    };
    const resize = new ResizeObserver(onResize);
    resize.observe(canvas);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      resume();
    });
    intersection.observe(canvas);
    video.addEventListener("loadeddata", resume);
    video.addEventListener("play", resume);
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", hide);
    canvas.addEventListener("webglcontextlost", lost);
    canvas.addEventListener("webglcontextrestored", restored);
    document.addEventListener("visibilitychange", resume);
    reducedMotion.addEventListener("change", onMotionChange);
    awaitTexture();
    return () => {
      disposed = true;
      stop();
      resize.disconnect();
      intersection.disconnect();
      video.removeEventListener("loadeddata", resume);
      video.removeEventListener("play", resume);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", hide);
      canvas.removeEventListener("webglcontextlost", lost);
      canvas.removeEventListener("webglcontextrestored", restored);
      document.removeEventListener("visibilitychange", resume);
      reducedMotion.removeEventListener("change", onMotionChange);
      renderer?.dispose();
    };
  }, [videoRef]);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 size-full opacity-0" data-effect="risograph" />;
}
