"use client";

import Link from "next/link";
import { TextRoll, textRollDuration, useTextRollInteraction } from "./text-roll";
import { ScrambleText } from "./scramble-text";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { profile } from "@/lib/site-data";
import styles from "./floating-nav.module.css";

const links = [
  { label: "Work", href: "/#selected-work" },
  { label: "Lab", href: "/#gallery" },
  { label: "About", href: "/#introduction" },
  { label: "Contact", href: `mailto:${profile.email}` },
];

function NavigationLink({ label, href, index, enabled, close }: { label: string; href: string; index: number; enabled: boolean; close: () => void }) {
  const interaction = useTextRollInteraction(textRollDuration(label));
  return <Link href={href} aria-label={label} tabIndex={enabled ? 0 : -1} onClick={close} style={{ "--index": index } as CSSProperties} {...interaction}>
    <TextRoll enabled={enabled}>{label}</TextRoll>
  </Link>;
}

export function FloatingNav({ ready }: { ready: boolean }) {
  const [open, setOpen] = useState(false);
  const interaction = useTextRollInteraction(textRollDuration("More"));
  const header = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !header.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); toggle.current?.focus(); }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return <header ref={header} className={styles.header} data-ready={ready} data-open={open} inert={!ready}>
      <Link href="/#top" className={styles.logo} onClick={() => setOpen(false)} aria-label="Jimmy.zz 返回顶部"><ScrambleText enabled={ready}>Jimmy.zz</ScrambleText></Link>
    <div className={styles.controls}>
      <button {...interaction} ref={toggle} className={styles.toggle} type="button" aria-expanded={open} aria-controls="home-navigation" aria-label="More" onClick={() => setOpen((value) => !value)}>
        <TextRoll enabled={ready}>More</TextRoll>
      </button>
    <nav id="home-navigation" className={styles.menu} aria-label="主导航" inert={!open}>
      {links.map(({ label, href }, index) => <NavigationLink key={label} label={label} href={href} index={index} enabled={ready && open} close={() => setOpen(false)} />)}
    </nav>
    </div>
  </header>;
}
