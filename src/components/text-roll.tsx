"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ScrambleText } from "./scramble-text";
import styles from "./text-roll.module.css";

export const textRollDuration = (text: string) => 360 + Math.max(0, (Array.from(text).length - 1) / 2) * 35;

/** Queue the latest interaction until every staggered character has settled. */
export function useTextRollInteraction(duration: number) {
  const [active, setActive] = useState(false);
  const current = useRef(false);
  const hovered = useRef(false);
  const focused = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current !== null) clearTimeout(timer.current); }, []);

  const settle = () => {
    if (timer.current !== null) return;
    const next = hovered.current || focused.current;
    if (current.current === next) return;
    current.current = next;
    setActive(next);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    timer.current = setTimeout(() => {
      timer.current = null;
      settle();
    }, duration);
  };
  return {
    "data-roll-active": active,
    "data-active": active,
    onPointerEnter: (event: React.PointerEvent<HTMLElement>) => {
      if (event.pointerType !== "mouse") return;
      hovered.current = true;
      settle();
    },
    onPointerLeave: () => { hovered.current = false; settle(); },
    onPointerCancel: () => { hovered.current = false; settle(); },
    onFocus: () => { focused.current = true; settle(); },
    onBlur: () => { focused.current = false; settle(); },
  };
}

export function TextRoll({ children, enabled = true, reveal = false }: { children: string; enabled?: boolean; reveal?: boolean }) {
  const characters = Array.from(children);
  return <span className={styles.roll} data-reveal={reveal} aria-label={children}>
    {[0, 1].map((layer) => <span key={layer} aria-hidden="true" className={layer ? styles.copy : styles.line}>
      {characters.map((character, index) => <span key={index} style={{
        "--roll-delay": `${Math.abs(index - (characters.length - 1) / 2) * 35}ms`,
      } as CSSProperties}><ScrambleText enabled={enabled}>{character === " " ? "\u00a0" : character}</ScrambleText></span>)}
    </span>)}
  </span>;
}
