"use client";

import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { homeAssetUrl } from "@/lib/home-asset-url";
import styles from "./home-loader.module.css";

const frames = Array.from({ length: 21 }, (_, i) => i);
const sequenceUrl = homeAssetUrl("/assets/loading/sequence.webp");
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
const slowLoadingMs = 8_000;

export function HomeLoader({ scope, onReveal, onComplete, compact = false }: { scope: RefObject<HTMLElement | null>; onReveal: () => void; onComplete: () => void; compact?: boolean }) {
  const sequence = useRef<HTMLDivElement>(null);
  const shuffled = useRef(false);
  const [progress, setProgress] = useState(0);
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
        (frame as HTMLDivElement).style.order = String(order[i]);
      });
      shuffled.current = true;
    }
    let cancelled = false;
    let finishing = false;
    let awaitingPresentation = false;
    let presentationComplete = false;
    let animationStarted = performance.now();
    let sceneReady = false;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    let exitTimer: ReturnType<typeof setTimeout> | undefined;
    let revealTimer: ReturnType<typeof setTimeout> | undefined;
    let removeTimer: ReturnType<typeof setTimeout> | undefined;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finish = () => {
      if (finishing || cancelled || !sceneReady) return;
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
      const reported = Number(canvas?.dataset.loadProgress ?? 0);
      if (Number.isFinite(reported)) setProgress(previous => Math.max(previous, Math.min(99, Math.max(0, reported))));
      if (awaitingPresentation && !presentationComplete && canvas?.dataset.presentation === "scene") {
        presentationComplete = true;
        setProgress(100);
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
    if (scope.current) observer.observe(scope.current, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-ready", "data-presentation", "data-asset-error", "data-scene-error", "data-load-progress"] });
    // Slow downloads keep loading; only a reported error shows the failure UI.
    const deadline = setTimeout(() => {
      if (cancelled || presentationComplete) return;
      document.body.style.overflow = previousOverflow;
    }, slowLoadingMs);
    checkScene();
    const image = new Image();
    image.src = sequenceUrl;
    void image.decode().then(() => {
      if (cancelled || finishing) return;
      animationStarted = performance.now();
      if (!reduced) sequence.current?.setAttribute("data-playing", "true");
    }).catch(() => { /* The progress remains usable without the logo. */ });
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

  const progressShade = Math.round(190 * (1 - progress / 100));

  return <div className={styles.overlay} style={overlayStyle} data-home-loader data-compact={compact} data-fallback={unavailable} data-leaving={leaving} data-revealed={revealed} role="status" aria-label={unavailable ? "首页场景暂未加载" : "首页加载中"}>
    {unavailable ? <div className={styles.fallback}>
      <p>场景暂时未能加载</p>
      <span>你可以先浏览作品，或重新尝试。</span>
      <div className={styles.actions}>
        <a href="#selected-work">浏览作品</a>
        <button type="button" onClick={() => window.location.reload()}>重新加载</button>
      </div>
    </div> : <div className={styles.loadingContent}>
    <div className={styles.viewport} aria-hidden="true">
      <div ref={sequence} className={styles.sequence} style={sequenceStyle}>
        {frames.map(i => <div key={i} className={styles.logoFrame} style={{ backgroundImage: `url("${sequenceUrl}")`, backgroundPosition: `${i * 100 / (frames.length - 1)}% center` }} />)}
      </div>
    </div>
    <div className={styles.loadingStatus}>
      <span className={styles.percentage} style={{ color: `rgb(${progressShade}, ${progressShade}, ${progressShade})` }} role="progressbar" aria-label="场景加载进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>{progress}%</span>
    </div>
    </div>}
  </div>;
}
