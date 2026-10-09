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
    let interval: ReturnType<typeof setInterval> | undefined;
    let exitTimer: ReturnType<typeof setTimeout> | undefined;
    let removeTimer: ReturnType<typeof setTimeout> | undefined;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finish = () => {
      if (finishing || cancelled) return;
      finishing = true;
      observer.disconnect();
      // Cached scenes can be ready before the animation has even decoded.
      exitTimer = setTimeout(() => {
        clearInterval(interval);
        setLeaving(true);
        removeTimer = setTimeout(onComplete, reduced ? 0 : 240);
      }, 0);
    };
    const checkScene = () => {
      const canvas = scope.current?.querySelector("canvas");
      if (canvas?.dataset.assetError === "true" || scope.current?.querySelector("canvas ~ [role='status']")) finish();
      else if (canvas?.dataset.ready === "true") finish();
    };
    const observer = new MutationObserver(checkScene);
    if (scope.current) observer.observe(scope.current, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-ready", "data-asset-error"] });
    checkScene();
    const deadline = setTimeout(() => finish(), 12000);
    Promise.all(frames.map(async (src) => {
      const img = new Image();
      img.src = src;
      await img.decode();
    })).then(() => {
      if (cancelled || finishing) return;
      let index = 0;
      if (!reduced) interval = setInterval(() => {
        index = (index + 1) % frames.length;
        sequence.current?.style.setProperty("--frame", String(index));
      }, frameDuration);
      checkScene();
    }).catch(() => finish());
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
