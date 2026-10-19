"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { homeAssetUrl } from "@/lib/home-asset-url";
import styles from "./home-loader.module.css";

const frames = Array.from({ length: 11 }, (_, i) => homeAssetUrl(`/assets/loading/frame-${String(i + 1).padStart(2, "0")}.png`));
const loadingTimeoutMs = 15_000;

export function HomeLoader({ scope, onComplete }: { scope: RefObject<HTMLElement | null>; onComplete: () => void }) {
  const sequence = useRef<HTMLDivElement>(null);
  const [leaving, setLeaving] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let finishing = false;
    let exitTimer: ReturnType<typeof setTimeout> | undefined;
    let removeTimer: ReturnType<typeof setTimeout> | undefined;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finish = () => {
      if (finishing || cancelled) return;
      finishing = true;
      clearTimeout(deadline);
      observer.disconnect();
      // Cached scenes can be ready before the animation has even decoded.
      exitTimer = setTimeout(() => {
        setLeaving(true);
        removeTimer = setTimeout(onComplete, reduced ? 0 : 240);
      }, 0);
    };
    const showFallback = () => {
      if (cancelled || finishing) return;
      clearTimeout(deadline);
      sequence.current?.removeAttribute("data-playing");
      setUnavailable(true);
    };
    const checkScene = () => {
      const canvas = scope.current?.querySelector("canvas");
      if (canvas?.dataset.assetError === "true" || scope.current?.querySelector("[data-scene-error='true']")) showFallback();
      else if (canvas?.dataset.ready === "true") finish();
    };
    const observer = new MutationObserver(checkScene);
    if (scope.current) observer.observe(scope.current, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-ready", "data-asset-error", "data-scene-error"] });
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
      sequence.current?.setAttribute("data-playing", "true");
      checkScene();
    }).catch(() => { /* Keep the first frame until the scene is ready if a frame fails. */ });
    return () => {
      cancelled = true;
      observer.disconnect();
      clearTimeout(deadline);
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, [scope, onComplete]);

  return <div className={styles.overlay} data-home-loader data-fallback={unavailable} data-leaving={leaving} role="status" aria-label={unavailable ? "首页场景暂未加载" : "首页加载中"}>
    {unavailable ? <div className={styles.fallback}>
      <p>场景暂时未能加载</p>
      <span>你可以先浏览作品，或重新尝试。</span>
      <div className={styles.actions}>
        <a href="#selected-work">浏览作品</a>
        <button type="button" onClick={() => window.location.reload()}>重新加载</button>
      </div>
    </div> : <div className={styles.viewport} aria-hidden="true">
      <div ref={sequence} className={styles.sequence}>
        {/* Native images preserve the exact same canvas and are decoded before playback. */}
        {/* eslint-disable @next/next/no-img-element */}
        {frames.map((src, i) => <img key={src} src={src} alt="" width={384} height={384} loading="eager" fetchPriority={i === 0 ? "high" : "auto"} />)}
      </div>
    </div>}
  </div>;
}
