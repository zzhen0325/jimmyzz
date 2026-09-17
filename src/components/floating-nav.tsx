"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import styles from "./floating-nav.module.css";

const links = [
  { label: "Work", href: "/#selected-work" },
  { label: "Lab", href: "/#gallery" },
  { label: "About", href: "/#about" },
  { label: "Contact", href: "/#contact" },
];

// Skiper58's two-layer roll, staggered outward from the centre (35ms/character).
function TextRoll({ children }: { children: string }) {
  const characters = Array.from(children);
  return <span className={styles.roll} aria-hidden="true">
    {[0, 1].map((layer) => <span key={layer} className={layer ? styles.rollCopy : styles.rollLine}>
      {characters.map((character, index) => <span key={index} style={{
        "--delay": `${Math.abs(index - (characters.length - 1) / 2) * 35}ms`,
      } as CSSProperties}>{character === " " ? "\u00a0" : character}</span>)}
    </span>)}
  </span>;
}

export function FloatingNav({ ready }: { ready: boolean }) {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const header = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let previous = window.scrollY;
    let travel = 0;
    let direction = 0;
    const scroll = () => {
      const current = Math.max(0, Math.min(window.scrollY, document.documentElement.scrollHeight - window.innerHeight));
      const delta = current - previous;
      previous = current;
      if (current < 64 || open || header.current?.contains(document.activeElement)) {
        setHidden(false);
        travel = 0;
        return;
      }
      const nextDirection = Math.sign(delta);
      if (nextDirection !== direction) travel = 0;
      direction = nextDirection;
      travel += Math.abs(delta);
      if (travel > (direction > 0 ? 18 : 8)) setHidden(direction > 0);
    };
    window.addEventListener("scroll", scroll, { passive: true });
    return () => window.removeEventListener("scroll", scroll);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !header.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); toggle.current?.focus(); }
    };
    const desktop = window.matchMedia("(min-width: 701px)");
    const close = () => { if (desktop.matches) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    desktop.addEventListener("change", close);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
      desktop.removeEventListener("change", close);
    };
  }, [open]);

  return <header ref={header} className={styles.header} data-ready={ready} data-hidden={hidden && !open} data-open={open} inert={!ready}
    onFocusCapture={() => setHidden(false)}>
    <div className={styles.bar}>
      <nav className={styles.desktop} aria-label="主导航">
        {links.map(({ label, href }) => <Link key={label} href={href} aria-label={label}><TextRoll>{label}</TextRoll></Link>)}
      </nav>
      <Link href="/#top" className={styles.logo} aria-label="ZZ 返回顶部"></Link>
      <button ref={toggle} className={styles.toggle} type="button" aria-expanded={open} aria-controls="home-mobile-navigation" aria-label={open ? "关闭导航" : "打开导航"} onClick={() => setOpen(!open)}>
        <TextRoll>{open ? "Close" : "Menu"}</TextRoll><span className={styles.toggleIcon} aria-hidden="true"><i /><i /></span>
      </button>
    </div>
    <nav id="home-mobile-navigation" className={styles.mobile} aria-label="移动导航" inert={!open}>
      {links.map(({ label, href }, index) => <Link key={label} href={href} aria-label={label} tabIndex={open ? 0 : -1} onClick={() => setOpen(false)} style={{ "--index": index } as CSSProperties}>
        <TextRoll>{label}</TextRoll><span aria-hidden="true">↗</span>
      </Link>)}
    </nav>
  </header>;
}
