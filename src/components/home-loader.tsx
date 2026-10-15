"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { homeAssetUrl } from "@/lib/home-asset-url";
import styles from "./home-loader.module.css";

const frames = Array.from({ length: 11 }, (_, i) => homeAssetUrl(`/assets/loading/frame-${String(i + 1).padStart(2, "0")}.png`));
const frameDuration = 100;

export function HomeLoader({ scope, onComplete }: { scope: RefObject<HTMLElement | null>; onComplete: () => void }) {
  const sequence = useRef<HTMLDivElement>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let finishing = false;
    let animationStarted = 0;
    let framesReady = false;
    let sceneReady = false;
    let interval: ReturnType<typeof setInterval> | undefined;
    let exitTimer: ReturnType<typeof setTimeout> | undefined;
    let removeTimer: ReturnType<typeof setTimeout> | undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finish = (force = false) => {
      if (finishing || cancelled || (!force && (!sceneReady || !framesReady))) return;
      finishing = true;
      observer.disconnect();
      // Finish one complete ZZ sequence before revealing a freshly loaded scene.
      // Returning to a retained scene skips this component entirely.
      exitTimer = setTimeout(() => {
        clearInterval(interval);
        setLeaving(true);
        removeTimer = setTimeout(onComplete, reduced ? 0 : 240);
      }, force || reduced ? 0 : Math.max(0, frames.length * frameDuration - (performance.now() - animationStarted)));
    };
    const checkScene = () => {
      const canvas = scope.current?.querySelector("canvas");
      if (canvas?.dataset.assetError === "true" || scope.current?.querySelector("[data-scene-error='true']")) finish(true);
      else if (canvas?.dataset.ready === "true") { sceneReady = true; finish(); }
    };
    const observer = new MutationObserver(checkScene);
    if (scope.current) observer.observe(scope.current, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-ready", "data-asset-error"] });
    checkScene();
    Promise.all(frames.map(async (src) => {
      const img = new Image();
      img.src = src;
      await img.decode();
    })).then(() => {
      if (cancelled || finishing) return;
      framesReady = true;
      animationStarted = performance.now();
      let index = 0;
      if (!reduced) interval = setInterval(() => {
        index = (index + 1) % frames.length;
        sequence.current?.style.setProperty("--frame", String(index));
      }, frameDuration);
      checkScene();
    }).catch(() => {
      // A missing animation frame must not hide a scene that is still loading.
      framesReady = true;
      checkScene();
    });
    return () => {
      cancelled = true;
      document.body.style.overflow = previousOverflow;
      observer.disconnect();
      clearInterval(interval);
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
