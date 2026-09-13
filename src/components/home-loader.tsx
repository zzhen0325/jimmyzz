"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import styles from "./home-loader.module.css";

const frames = Array.from({ length: 11 }, (_, i) => `/assets/loading/frame-${String(i + 1).padStart(2, "0")}.png`);
const frameDuration = 100;

export function HomeLoader({ scope, onComplete }: { scope: RefObject<HTMLElement | null>; onComplete: () => void }) {
  const sequence = useRef<HTMLDivElement>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let finishing = false;
    let interval: ReturnType<typeof setInterval> | undefined;
    let exitTimer: ReturnType<typeof setTimeout> | undefined;
    let removeTimer: ReturnType<typeof setTimeout> | undefined;
    let playbackStarted = 0;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finish = (immediate = false) => {
      if (finishing || cancelled) return;
      finishing = true;
      observer.disconnect();
      // Finish the current loop before revealing an already rendered scene.
      const elapsed = playbackStarted ? performance.now() - playbackStarted : 0;
      const cycle = frames.length * frameDuration;
      const wait = immediate || reduced || !playbackStarted ? 0 : cycle - (elapsed % cycle);
      exitTimer = setTimeout(() => {
        clearInterval(interval);
        setLeaving(true);
        removeTimer = setTimeout(onComplete, reduced ? 0 : 240);
      }, wait);
    };
    const checkScene = () => {
      const canvas = scope.current?.querySelector("canvas");
      if (canvas?.dataset.assetError === "true" || scope.current?.querySelector("canvas ~ [role='status']")) finish(true);
      else if (canvas?.dataset.ready === "true" && playbackStarted) finish();
    };
    const observer = new MutationObserver(checkScene);
    if (scope.current) observer.observe(scope.current, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-ready", "data-asset-error"] });
    const deadline = setTimeout(() => finish(true), 12000);
    Promise.all(frames.map(async (src) => {
      const img = new Image();
      img.src = src;
      await img.decode();
    })).then(() => {
      if (cancelled || finishing) return;
      playbackStarted = performance.now();
      let index = 0;
      if (!reduced) interval = setInterval(() => {
        index = (index + 1) % frames.length;
        sequence.current?.style.setProperty("--frame", String(index));
      }, frameDuration);
      checkScene();
    }).catch(() => finish(true));
    return () => {
      cancelled = true;
      observer.disconnect();
      clearInterval(interval);
      clearTimeout(deadline);
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, [scope, onComplete]);

  return <div className={styles.overlay} data-leaving={leaving} role="status" aria-label="首页加载中">
    <div className={styles.viewport} aria-hidden="true">
      <div ref={sequence} className={styles.sequence}>
        {/* Native images preserve the exact same canvas and are decoded before playback. */}
        {/* eslint-disable @next/next/no-img-element */}
        {frames.map((src, i) => <img key={src} src={src} alt="" width={384} height={384} loading="eager" fetchPriority={i === 0 ? "high" : "auto"} />)}
      </div>
    </div>
  </div>;
}
