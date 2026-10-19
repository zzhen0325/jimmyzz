"use client";

import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { homeAssetUrl } from "@/lib/home-asset-url";
import styles from "./home-loader.module.css";

const frames = Array.from({ length: 21 }, (_, i) => homeAssetUrl(`/assets/loading/frame-${String(i + 1).padStart(2, "0")}.png`));
const sequenceDurationMs = frames.length * 100;
const finalFrameHoldMs = 200;
const shrinkDurationMs = 160;
const emptyHoldMs = 100;
const fadeDurationMs = 160;
const fadeDelayMs = finalFrameHoldMs + shrinkDurationMs + emptyHoldMs;
const overlayStyle = {
  "--final-frame-hold": `${finalFrameHoldMs}ms`,
  "--shrink-duration": `${shrinkDurationMs}ms`,
  "--fade-duration": `${fadeDurationMs}ms`,
} as CSSProperties;
const sequenceStyle = {
  "--frame-count": frames.length,
  "--sequence-duration": `${sequenceDurationMs}ms`,
  "--sequence-offset": `${-100 * frames.length}%`,
} as CSSProperties;
const loadingTimeoutMs = 30_000;

export function HomeLoader({ scope, onReveal, onComplete, compact = false }: { scope: RefObject<HTMLElement | null>; onReveal: () => void; onComplete: () => void; compact?: boolean }) {
  const sequence = useRef<HTMLDivElement>(null);
  const shuffled = useRef(false);
  const [leaving, setLeaving] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    // Shuffle once after hydration; keep every frame exactly once per cycle.
    if (sequence.current && !shuffled.current) {
      const order = frames.map((_, i) => i);
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      Array.from(sequence.current.children).forEach((frame, i) => {
        (frame as HTMLImageElement).style.order = String(order[i]);
      });
      shuffled.current = true;
    }
    let cancelled = false;
    let finishing = false;
    let awaitingPresentation = false;
    let presentationComplete = false;
    let animationStarted = 0;
    let framesReady = false;
    let sceneReady = false;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    let exitTimer: ReturnType<typeof setTimeout> | undefined;
    let revealTimer: ReturnType<typeof setTimeout> | undefined;
    let removeTimer: ReturnType<typeof setTimeout> | undefined;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finish = () => {
      if (finishing || cancelled || !sceneReady || !framesReady) return;
      finishing = true;
      // A retained scene only needs a short bridge while its canvas reattaches.
      const minimumPlaybackMs = compact ? 300 : sequenceDurationMs;
      exitTimer = setTimeout(() => {
        setLeaving(true);
        revealTimer = setTimeout(() => {
          awaitingPresentation = true;
          onReveal();
          checkScene();
        }, reduced ? 0 : fadeDelayMs);
      }, reduced ? 0 : Math.max(0, minimumPlaybackMs - (performance.now() - animationStarted)));
    };
    const showFallback = () => {
      if (cancelled || presentationComplete) return;
      clearTimeout(deadline);
      clearTimeout(exitTimer);
      clearTimeout(revealTimer);
      finishing = false;
      awaitingPresentation = false;
      sequence.current?.removeAttribute("data-playing");
      document.body.style.overflow = previousOverflow;
      setLeaving(false);
      setUnavailable(true);
    };
    const checkScene = () => {
      const canvas = scope.current?.querySelector("canvas");
      if (awaitingPresentation && !presentationComplete && canvas?.dataset.presentation === "scene") {
        presentationComplete = true;
        clearTimeout(deadline);
        observer.disconnect();
        setRevealed(true);
        removeTimer = setTimeout(() => {
          document.body.style.overflow = previousOverflow;
          onComplete();
        }, reduced ? 0 : fadeDurationMs);
        return;
      }
      if (canvas?.dataset.assetError === "true" || scope.current?.querySelector("[data-scene-error='true']")) showFallback();
      else if (canvas?.dataset.ready === "true") { sceneReady = true; finish(); }
    };
    const observer = new MutationObserver(checkScene);
    if (scope.current) observer.observe(scope.current, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-ready", "data-presentation", "data-asset-error", "data-scene-error"] });
    // Bound the wait even when a request, worker, or dynamic import never settles.
    // Keep observing so a late successful scene can replace the fallback.
    const deadline = setTimeout(showFallback, loadingTimeoutMs);
    checkScene();
    Promise.all(frames.map(async (src) => {
      const img = new Image();
      img.src = src;
      await img.decode();
    })).then(() => {
      if (cancelled || finishing) return;
      framesReady = true;
      animationStarted = performance.now();
      if (!reduced) sequence.current?.setAttribute("data-playing", "true");
      checkScene();
    }).catch(() => {
      framesReady = true;
      checkScene();
    });
    return () => {
      cancelled = true;
      document.body.style.overflow = previousOverflow;
      observer.disconnect();
      clearTimeout(deadline);
      clearTimeout(exitTimer);
      clearTimeout(revealTimer);
      clearTimeout(removeTimer);
    };
  }, [scope, onReveal, onComplete, compact]);

  return <div className={styles.overlay} style={overlayStyle} data-home-loader data-compact={compact} data-fallback={unavailable} data-leaving={leaving} data-revealed={revealed} role="status" aria-label={unavailable ? "首页场景暂未加载" : "首页加载中"}>
    {unavailable ? <div className={styles.fallback}>
      <p>场景暂时未能加载</p>
      <span>你可以先浏览作品，或重新尝试。</span>
      <div className={styles.actions}>
        <a href="#selected-work">浏览作品</a>
        <button type="button" onClick={() => window.location.reload()}>重新加载</button>
      </div>
    </div> : <div className={styles.viewport} aria-hidden="true">
      <div ref={sequence} className={styles.sequence} style={sequenceStyle}>
        {/* Native images preserve the exact same canvas and are decoded before playback. */}
        {/* eslint-disable @next/next/no-img-element */}
        {frames.map((src, i) => <img key={src} src={src} alt="" width={600} height={600} loading="eager" fetchPriority={i === 0 ? "high" : "auto"} />)}
      </div>
    </div>}
  </div>;
}
