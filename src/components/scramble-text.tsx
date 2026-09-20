"use client";

import { useEffect, useRef } from "react";
import styles from "./scramble-text.module.css";

const latin = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#%+";
const cjk = "设计视觉创意品牌动态空间字符构成";

/** Keep the accessible, naturally wrapping text intact; only animate visual copies. */
export function ScrambleText({ children, enabled = true }: { children: string; enabled?: boolean }) {
  const root = useRef<HTMLSpanElement>(null);
  const words = children.split(/(\s+|[\p{Script=Han}])/u);

  useEffect(() => {
    const element = root.current;
    if (!element || !enabled) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const copies = Array.from(element.querySelectorAll<HTMLElement>("[data-scramble-copy]"));
    let frame = 0;
    let visible = false;
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      delete element.dataset.running;
      copies.forEach((copy) => { copy.textContent = ""; });
    };
    const play = () => {
      stop();
      if (reduced.matches || document.hidden || !visible) return;
      const start = performance.now();
      let last = -1;
      const tick = (now: number) => {
        const elapsed = now - start;
        if (elapsed >= 850) { stop(); return; }
        const step = Math.floor(elapsed / 45);
        if (step !== last) {
          last = step;
          element.dataset.running = "true";
          copies.forEach((copy, index) => {
            const original = Array.from(copy.dataset.scrambleCopy ?? "");
            const progress = Math.max(0, (elapsed - Math.min(index * 18, 140)) / 650);
            copy.textContent = original.map((char, position) => {
              if (!/[\p{L}\p{N}]/u.test(char) || (position + 1) / (original.length + 1) < progress) return char;
              const pool = /\p{Script=Han}/u.test(char) ? cjk : latin;
              return pool[Math.floor(Math.random() * pool.length)];
            }).join("");
          });
        }
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) play(); else stop();
    }, { threshold: 0, rootMargin: "0px 0px -4% 0px" });
    observer.observe(element);
    const visibility = () => { if (document.hidden) stop(); else play(); };
    reduced.addEventListener("change", play);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      stop();
      observer.disconnect();
      reduced.removeEventListener("change", play);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [children, enabled]);

  return <span ref={root} className={styles.root}>{words.map((word, index) =>
    /\S/u.test(word) ? <span className={styles.word} key={index}>
      <span className={styles.original}>{word}</span>
      <span className={styles.copy} data-scramble-copy={word} aria-hidden="true" />
    </span> : word,
  )}</span>;
}
