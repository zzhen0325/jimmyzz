"use client";

import { getHeroPalette } from "@/lib/hero-palettes";

import { useEffect, useRef, type RefObject } from "react";
import { createLatticeCollage } from "@/lib/lattice-collage";
import { heroVideoRect } from "@/lib/hero-video-geometry";
import { collagePanels, createRisographRenderer, risographSettings, type RisographStyle } from "@/lib/risograph";

export function RisographVideo({
  videoRef,
  enabled = risographSettings.enabled,
  skipEntrance = false,
  entranceAt,
  onReady,
  secretTriggerRef,
  style = risographSettings,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  enabled?: boolean;
  skipEntrance?: boolean;
  entranceAt?: number;
  onReady?: () => void;
  style?: RisographStyle;
  secretTriggerRef?: RefObject<HTMLButtonElement | null>;
}) {
  const onReadyRef = useRef(onReady);
  useEffect(() => { onReadyRef.current = onReady; }, [onReady]);
  const redrawRef = useRef<(() => void) | null>(null);
  const styleRef = useRef(style);
  const rendererRef = useRef<ReturnType<typeof createRisographRenderer>>(null);
  useEffect(() => {
    styleRef.current = style;
    rendererRef.current?.setStyle(style);
    redrawRef.current?.();
  }, [style]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelsRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!enabled) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const labels = labelsRef.current;
    if (!video || !canvas || !labels) return;
    const palette = getHeroPalette();
    canvas.dataset.palette = palette.id;
    const panelColors = [palette.main, palette.main, palette.paper, palette.accent, palette.soft, palette.main, palette.accent, palette.soft];
    const labelContext = labels.getContext("2d");
    const collage = labelContext ? createLatticeCollage(labelContext) : null;
    let labelWidth = canvas.clientWidth;
    let labelHeight = canvas.clientHeight;
    let fitProgress = 0;
    const drawLabels = () => {
      if (!labelContext || !renderer || !labelWidth || !labelHeight) return;
      if (labels.width !== canvas.width || labels.height !== canvas.height) {
        labels.width = canvas.width;
        labels.height = canvas.height;
      }
      labelContext.setTransform(labels.width / labelWidth, 0, 0, labels.height / labelHeight, 0, 0);
      labelContext.clearRect(0, 0, labelWidth, labelHeight);
      labelContext.font = `${labelWidth < 600 ? 7 : 8}px monospace`;
      labelContext.textBaseline = "top";
      const positions = renderer.getWindowPositions();
      const rotations = renderer.getWindowRotations();
      const secret = secretTriggerRef?.current;
      if (secret && !canvas.closest("[inert]")) {
        const [cx, cy, w, h] = positions.subarray(12, 16);
        const rect = canvas.getBoundingClientRect();
        const heroRect = canvas.closest("section")!.getBoundingClientRect();
        Object.assign(secret.style, { left: `${rect.left - heroRect.left + (cx - w / 2) * rect.width}px`, top: `${rect.top - heroRect.top + (1 - cy - h / 2) * rect.height}px`, width: `${w * rect.width}px`, height: `${h * rect.height}px`, transform: `rotate(${rotations[3]}rad)` });
      }
      const videoBounds = heroVideoRect(labelWidth, labelHeight, video.videoWidth, video.videoHeight, fitProgress);
      labelContext.save();
      labelContext.beginPath();
      labelContext.rect(videoBounds.x, videoBounds.y, videoBounds.w, videoBounds.h);
      labelContext.clip();
      labelContext.strokeStyle = "rgba(255,255,255,0.32)";
      labelContext.lineWidth = 0.75;
      labelContext.setLineDash([3, 4]);
      const reach = Math.hypot(labelWidth, labelHeight) * 2;
      for (let i = 0; i < positions.length / 4; i++) {
        const [cx, cy, width, height] = positions.subarray(i * 4, i * 4 + 4);
        if (width * labelWidth < 8 || height * labelHeight < 8) continue;
        labelContext.save();
        labelContext.translate(cx * labelWidth, (1 - cy) * labelHeight);
        labelContext.rotate(rotations[i]);
        labelContext.beginPath();
        for (const side of [-1, 1]) {
          const x = side * width * labelWidth / 2;
          const y = side * height * labelHeight / 2;
          labelContext.moveTo(x, -reach);
          labelContext.lineTo(x, reach);
          labelContext.moveTo(-reach, y);
          labelContext.lineTo(reach, y);
        }
        labelContext.stroke();
        labelContext.restore();
      }
      labelContext.restore();
      const caption = (text: string, x: number, y: number, right = false) => {
        const width = labelContext.measureText(text).width;
        const left = right ? x - width : x;
        labelContext.fillStyle = "rgba(0,0,0,0.72)";
        labelContext.fillRect(left - 2, y - 1, width + 4, 11);
        labelContext.fillStyle = "rgba(255,255,255,0.9)";
        labelContext.fillText(text, left, y);
      };
      const drawPanelLabels = (i: number) => {
        const [cx, cy, width, height] = positions.subarray(i * 4, i * 4 + 4);
        if (width * labelWidth < 8 || height * labelHeight < 8) return;
        // Convert bottom-origin shader coordinates to top-origin display coordinates.
        const left = cx - width / 2;
        const top = 1 - cy - height / 2;
        labelContext.save();
        labelContext.translate(cx * labelWidth, (1 - cy) * labelHeight);
        labelContext.rotate(rotations[i]);
        labelContext.translate(-cx * labelWidth, -(1 - cy) * labelHeight);
        caption(labelWidth < 600 ? `S0${i + 1}` : collagePanels[i].label,
          left * labelWidth, top * labelHeight - 14);
        [[left, top], [left + width, top], [left + width, top + height], [left, top + height]].forEach(([x, y], corner) => {
          const px = x * labelWidth;
          const py = y * labelHeight;
          const right = corner === 1 || corner === 2;
          labelContext.fillStyle = panelColors[i];
          labelContext.fillRect(px - 1.5, py - 1.5, 3, 3);
          if (width * labelWidth < 145 && (corner === 1 || corner === 3)) return;
          const availableWidth = width * labelWidth - 10;
          const availableHeight = height * labelHeight - 10;
          const fits = (text: string) => labelContext.measureText(text).width + 4 <= availableWidth;
          const compact = `${Math.round(x * 100)},${Math.round(y * 100)}`;
          const lines = fits(compact) ? [compact] : [
            `${Math.round(x * 100)}`,
            `${Math.round(y * 100)}`,
          ];
          // Narrow windows use stacked X/Y; omit labels that cannot remain legible.
          if (!lines.every(fits) || availableHeight < lines.length * 11) return;
          if (corner >= 2 && availableHeight < lines.length * 22 + 4) return;
          const labelY = corner < 2 ? py + 5 : py - lines.length * 11 - 2;
          lines.forEach((line, row) => caption(line, px + (right ? -5 : 5), labelY + row * 11, right));
        });
        labelContext.restore();
      };
      collage?.draw(video, positions, labelWidth, labelHeight, motionTime, fitProgress, rotations, drawPanelLabels);
    };
    let renderer = createRisographRenderer(canvas);
    rendererRef.current = renderer;
    if (!renderer) onReadyRef.current?.();
    renderer?.setStyle(styleRef.current);
    const section = canvas.closest("section");
    let panelsAnnounced = false;
    const announcePanels = () => {
      if (panelsAnnounced) return;
      panelsAnnounced = true;
      if (section) section.dataset.panelsReady = "true";
      section?.dispatchEvent(new Event("hero-panels-ready"));
    };
    const beginEntrance = () => {
      renderer?.beginEntrance(skipEntrance);
      if (!renderer) announcePanels();
    };
    if (entranceAt === undefined) {
      section?.addEventListener("hero-film-revealed", beginEntrance);
      if (skipEntrance || section?.dataset.filmRevealed === "true") beginEntrance();
    }
    let timedEntranceStarted = false;
    let pending = 0;
    let frameCallback = 0;
    let visible = true;
    let disposed = false;
    let grainTimer: ReturnType<typeof setTimeout> | undefined;
    let motionTime = 0;
    let lastDrawTime = 0;
    let textureReady = false;
    let readyAnnounced = false;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const hasFrameCallback = typeof video.requestVideoFrameCallback === "function";
    const active = () => !disposed && visible && !document.hidden;
    const hide = () => { canvas.style.opacity = "0"; labels.style.opacity = "0"; };
    const draw = (newFrame = false) => {
      if (!active()) return;
      if (entranceAt !== undefined && !timedEntranceStarted && video.readyState >= 2 &&
          !video.seeking && video.currentTime >= entranceAt) {
        timedEntranceStarted = true;
        beginEntrance();
      }
      const now = performance.now();
      if (!reducedMotion.matches && lastDrawTime) motionTime += Math.min((now - lastDrawTime) / 1000, 0.1);
      lastDrawTime = now;
      fitProgress = Number(getComputedStyle(canvas.parentElement!).getPropertyValue("--hero-fit-progress")) || 0;
      renderer?.setFitProgress(fitProgress);
      renderer?.setScrollProgress(Number(getComputedStyle(canvas.parentElement!).getPropertyValue("--hero-scroll-progress")) || 0);
      if (video.videoWidth && video.videoHeight) {
        const rect = heroVideoRect(canvas.clientWidth, canvas.clientHeight, video.videoWidth, video.videoHeight, fitProgress);
        Object.assign(video.style, { position: "absolute", maxWidth: "none", width: `${rect.w}px`, height: `${rect.h}px`, left: `${rect.x}px`, top: `${rect.y}px` });
      }
      renderer?.setReducedMotion(reducedMotion.matches);
      renderer?.setGrainFrame(Math.floor(motionTime * risographSettings.grainAnimationFps));
      try {
        if (renderer?.draw(video, newFrame)) {
          canvas.style.opacity = "1";
          drawLabels();
          labels.style.opacity = "1";
          if (!readyAnnounced) { readyAnnounced = true; onReadyRef.current?.(); }
          if (renderer.isEntranceComplete()) announcePanels();
        }
      } catch {
        hide();
      }
    };
    redrawRef.current = () => draw();
    const schedule = () => {
      if (!pending && active()) pending = requestAnimationFrame(() => {
        pending = 0;
        draw();
        if (!hasFrameCallback && !video.paused) schedule();
      });
    };
    // Listen on the hero because its typography/gradient sit above the canvas.
    const surface = canvas.closest("section");
    const originalCursor = surface?.style.cursor ?? "";
    let drag: { pointerId: number } | null = null;
    const point = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      return [(event.clientX - bounds.left) / bounds.width, 1 - (event.clientY - bounds.top) / bounds.height];
    };
    const hit = (event: PointerEvent) => {
      if (canvas.closest("[inert]") || event.pointerType !== "mouse" || canvas.style.opacity !== "1" ||
          (event.target instanceof Element && event.target.closest("a, button, input, textarea, select"))) return -1;
      const positions = renderer?.getWindowPositions();
      if (!positions || !renderer?.canDrag()) return -1;
      const [x, y] = point(event);
      for (let i = positions.length / 4 - 1; i >= 0; i--) {
        const angle = renderer.getWindowRotations()[i];
        const dx = (x - positions[i * 4]) * canvas.clientWidth;
        const dy = -(y - positions[i * 4 + 1]) * canvas.clientHeight;
        const localX = Math.cos(angle) * dx + Math.sin(angle) * dy;
        const localY = -Math.sin(angle) * dx + Math.cos(angle) * dy;
        if (Math.abs(localX) <= positions[i * 4 + 2] * canvas.clientWidth / 2 &&
            Math.abs(localY) <= positions[i * 4 + 3] * canvas.clientHeight / 2) return i;
      }
      return -1;
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || drag || !surface || !renderer) return;
      const index = hit(event);
      if (index < 0) return;
      const [x, y] = point(event);
      drag = { pointerId: event.pointerId };
      renderer.beginDrag(x, y);
      surface.setPointerCapture(event.pointerId);
      surface.style.cursor = "grabbing";
      event.preventDefault();
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!surface || canvas.closest("[inert]")) return;
      if (!drag) { surface.style.cursor = hit(event) >= 0 ? "grab" : originalCursor; return; }
      if (event.pointerId !== drag.pointerId) return;
      const [x, y] = point(event);
      renderer?.dragTo(x, y);
      schedule();
      event.preventDefault();
    };
    const endDrag = () => {
      if (!drag || !surface) return;
      const pointerId = drag.pointerId;
      drag = null;
      renderer?.endDrag();
      if (surface.hasPointerCapture(pointerId)) surface.releasePointerCapture(pointerId);
      surface.style.cursor = originalCursor;
      schedule();
    };
    const onPointerEnd = (event: PointerEvent) => {
      if (event.pointerId === drag?.pointerId) endDrag();
    };
    const onPointerLeave = () => { if (surface && !drag) surface.style.cursor = originalCursor; };
    const onScroll = () => {
      if (!active() || surface?.classList.contains("is-playing")) return;
      endDrag();
      if (surface) surface.style.cursor = originalCursor;
      schedule();
    };
    const onWheel = (event: WheelEvent) => {
      if (!active() || reducedMotion.matches || canvas.closest("[inert]") ||
          surface?.classList.contains("is-playing") || event.ctrlKey) return;
      if (event.target instanceof Element && event.target.closest("input, textarea, select, [role=dialog]")) return;
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? canvas.clientHeight : 1;
      const delta = (Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX) * unit;
      if (!delta) return;
      onScroll();
      schedule();
    };
    // Scrolling samples the same seekable choreography as the hero image.
    surface?.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    surface?.addEventListener("pointerdown", onPointerDown);
    surface?.addEventListener("pointermove", onPointerMove);
    surface?.addEventListener("pointerup", onPointerEnd);
    surface?.addEventListener("pointercancel", onPointerEnd);
    surface?.addEventListener("lostpointercapture", onPointerEnd);
    surface?.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("blur", endDrag);
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
        // Reuse the uploaded video texture: only the independent noise layer changes.
        draw();
        animateGrain();
      }, 1000 / 30);
    };
    const stop = () => {
      endDrag();
      lastDrawTime = 0;
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
    const onResize = () => {
      labelWidth = canvas.clientWidth;
      labelHeight = canvas.clientHeight;
      renderer?.resize();
      schedule();
    };
    const awaitTexture = () => {
      textureReady = false;
      renderer?.ready.then(() => {
        if (!disposed) { textureReady = true; resume(); }
      }).catch(() => { hide(); announcePanels(); onReadyRef.current?.(); });
    };
    const onMotionChange = () => {
      stop();
      motionTime = 0;
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
      rendererRef.current = null;
      for (const property of ["position", "max-width", "width", "height", "left", "top"]) video.style.removeProperty(property);
      renderer = null;
    };
    const restored = () => {
      renderer = createRisographRenderer(canvas);
      rendererRef.current = renderer;
      renderer?.setStyle(styleRef.current);
      if (timedEntranceStarted || (entranceAt === undefined && (skipEntrance || section?.dataset.filmRevealed === "true"))) beginEntrance();
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
      redrawRef.current = null;
      section?.removeEventListener("hero-film-revealed", beginEntrance);
      stop();
      surface?.removeEventListener("wheel", onWheel);
      window.removeEventListener("scroll", onScroll);
      surface?.removeEventListener("pointerdown", onPointerDown);
      surface?.removeEventListener("pointermove", onPointerMove);
      surface?.removeEventListener("pointerup", onPointerEnd);
      surface?.removeEventListener("pointercancel", onPointerEnd);
      surface?.removeEventListener("lostpointercapture", onPointerEnd);
      surface?.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("blur", endDrag);
      if (surface) surface.style.cursor = originalCursor;
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
      rendererRef.current = null;
      for (const property of ["position", "max-width", "width", "height", "left", "top"]) video.style.removeProperty(property);
    };
  }, [videoRef, enabled, secretTriggerRef, skipEntrance, entranceAt]);

  if (!enabled) return null;
  return <>
    <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 size-full opacity-0" data-effect="risograph" />
    <canvas ref={labelsRef} aria-hidden="true" className="pointer-events-none absolute inset-0 size-full opacity-0" data-effect="risograph-coordinates" />
  </>;
}
