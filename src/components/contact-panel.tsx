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
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return { open, setOpen, header, toggle, contact };
}

export function ContactPanel({ open, panelRef, id }: { open: boolean; panelRef: RefObject<HTMLElement | null>; id: string }) {
  return (
    <section ref={panelRef} id={id} role="region" aria-labelledby={`${id}-title`} aria-hidden={!open} inert={!open} className={styles.contactPanel} data-open={open}>
      <div className={styles.contactHeading}>
        <h2 id={`${id}-title`}><span>Something in mind?</span></h2>
        <p><span>Let’s create something meaningful together.</span></p>
      </div>
      <div className={styles.contactLinks}>
        <a href={`mailto:${profile.email}`}><span>{profile.email}</span><span aria-hidden="true">↗</span></a>
      </div>
      <p className={styles.contactNote}>Visual design & creative technology.<br />For project enquiries, just say hello.</p>
    </section>
  );
}
