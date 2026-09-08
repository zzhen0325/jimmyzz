"use client";

import { useEffect, useId, useRef } from "react";

/** Analog scanner: warped feed, vertical ink drag, sensor streaks and paper grain. */
export function ScannerType({ children, enabled = true }: { children: string; enabled?: boolean }) {
  const id = `scanner-${useId().replace(/:/g, "")}`;
  const root = useRef<HTMLSpanElement>(null);
  const warp = useRef<SVGFETurbulenceElement>(null);

  useEffect(() => {
    const element = root.current;
    if (!element || !enabled) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let phase = 0;

    const stop = () => {
      clearTimeout(timer);
      timer = undefined;
    };
    const tick = () => {
      timer = undefined;
      if (!visible || document.hidden || reduced.matches) return;
      phase += 0.025;
      // Keep the grain fixed; only the scanner feed drifts, without flashing.
      warp.current?.setAttribute(
        "baseFrequency",
        `${0.026 + Math.sin(phase) * 0.0012} ${0.035 + Math.cos(phase * 0.7) * 0.0015}`,
      );
      timer = setTimeout(tick, 1000 / 12);
    };
    const resume = () => { stop(); tick(); };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      resume();
    });
    observer.observe(element);
    document.addEventListener("visibilitychange", resume);
    reduced.addEventListener("change", resume);
    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener("visibilitychange", resume);
      reduced.removeEventListener("change", resume);
    };
  }, [enabled]);

  if (!enabled) return <span>{children}</span>;

  return (
    <span ref={root} className="scanner-type">
      <svg className="scanner-type-filters" aria-hidden="true" focusable="false">
        <defs>
          <filter id={id} x="-5%" y="-20%" width="110%" height="140%" colorInterpolationFilters="sRGB">
            {/* Low-frequency feed distortion creates soft, uneven letter edges. */}
            <feTurbulence ref={warp} type="fractalNoise" baseFrequency="0.026 0.0365" numOctaves="2" seed="8" result="feed" />
            <feDisplacementMap in="SourceGraphic" in2="feed" scale="5.5" xChannelSelector="R" yChannelSelector="G" result="warped" />

            {/* Patchy vertical dragging, like ink caught under the scanner glass. */}
            <feTurbulence type="fractalNoise" baseFrequency="0.045 0.004" numOctaves="2" seed="4" result="dragNoise" />
            <feColorMatrix in="dragNoise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  12 0 0 0 -6.8" result="dragMask" />
            <feGaussianBlur in="warped" stdDeviation="0.2 2.2" result="ink" />
            <feOffset in="ink" dy="-1.5" result="dragged" />
            <feComposite in="dragged" in2="dragMask" operator="in" result="smear" />
            <feComposite in="warped" in2="dragMask" operator="out" result="clean" />
            <feComposite in="smear" in2="clean" operator="arithmetic" k2="1" k3="1" result="printed" />

            {/* Grain changes ink color, not opacity: white stays dense over video. */}
            <feTurbulence type="fractalNoise" baseFrequency="1.35" numOctaves="2" seed="12" result="paper" />
            <feColorMatrix in="paper" type="matrix" values="0.42 0 0 0 0.8  0.42 0 0 0 0.8  0.42 0 0 0 0.8  0 0 0 0 1" result="grain" />
            <feTurbulence type="fractalNoise" baseFrequency="0.65 0.003" numOctaves="1" seed="6" result="sensor" />
            <feColorMatrix in="sensor" type="matrix" values="0.12 0 0 0 0.94  0.12 0 0 0 0.94  0.12 0 0 0 0.94  0 0 0 0 1" result="streaks" />
            <feBlend in="grain" in2="streaks" mode="multiply" result="inkColor" />
            <feComposite in="inkColor" in2="printed" operator="in" />
          </filter>
        </defs>
      </svg>
      <span className="scanner-type-ink" style={{ color: "#fff", filter: `url(#${id})` }}>{children}</span>
    </span>
  );
}
