"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { profile } from "@/lib/site-data";
import styles from "./floating-nav.module.css";

export function useContactDrawer(enabled = true) {
  const [open, setOpen] = useState(false);
  const header = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const contact = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!enabled || !contact.current) return;
    const page = header.current?.closest<HTMLElement>(".home-page, .case-page");
    const panel = contact.current;
    const update = () => page?.style.setProperty("--home-contact-offset", open ? `${panel.offsetHeight}px` : "0px");
    update();
    const observer = new ResizeObserver(update);
    observer.observe(panel);
    return () => {
      observer.disconnect();
      page?.style.removeProperty("--home-contact-offset");
    };
  }, [open, enabled]);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !header.current?.contains(event.target) && !contact.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); toggle.current?.focus(); }
    };
    // Wheel intent also closes the drawer when the page cannot scroll further.
    const wheel = (event: WheelEvent) => {
      if (event.deltaY > 0 && !event.ctrlKey) setOpen(false);
    };
    let previousScrollY = window.scrollY;
    const scroll = () => {
      const nextScrollY = window.scrollY;
      if (nextScrollY > previousScrollY) setOpen(false);
      previousScrollY = nextScrollY;
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    window.addEventListener("wheel", wheel, { passive: true });
    window.addEventListener("scroll", scroll, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("wheel", wheel);
      window.removeEventListener("scroll", scroll);
    };
  }, [open]);
  return { open, setOpen, header, toggle, contact };
}

export function ContactPanel({ open, panelRef, id }: { open: boolean; panelRef: RefObject<HTMLElement | null>; id: string }) {
  return (
    <section ref={panelRef} id={id} role="region" aria-labelledby={`${id}-title`} aria-hidden={!open} inert={!open} className={styles.contactPanel} data-open={open} data-native-cursor>
      <div className={styles.contactHeading}>
        <h2 id={`${id}-title`}><span>LET&apos;S MAKE SOMETHING.</span></h2>
      </div>
      <p className={styles.contactNote}>Visual design, creative coding &amp; everything in between.</p>
      <div className={styles.contactLinks}>
        <a href={`mailto:${profile.email}`}><span>{profile.email}</span><span aria-hidden="true">↗</span></a>
      </div>
      <div className={`${styles.contactLinks} ${styles.resourceLinks}`}>
        <a href="https://effect-studio-zeta.vercel.app/" target="_blank" rel="noopener noreferrer"><span>Tool</span><span aria-hidden="true">↗</span></a>
        <a href="https://my.feishu.cn/wiki/TsWQwCHhfi2CeukHxonc7Zwznwb?from=from_copylink" target="_blank" rel="noopener noreferrer"><span>Doc</span><span aria-hidden="true">↗</span></a>
      </div>
    </section>
  );
}
