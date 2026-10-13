"use client";

import Link from "next/link";
import { TextRoll, textRollDuration, useTextRollInteraction } from "./text-roll";
import { ScrambleText } from "./scramble-text";
import { type CSSProperties } from "react";
import { ContactPanel, useContactDrawer } from "./contact-panel";
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

export function FloatingNav({ ready, variant = "home", showLogo = true }: { ready: boolean; variant?: "home" | "project"; showLogo?: boolean }) {
  const isContact = variant === "home";
  const { open, setOpen, header, toggle, contact } = useContactDrawer(isContact);
  const interaction = useTextRollInteraction(textRollDuration(isContact ? "Contact" : "More"));

  return <>
    {isContact && <ContactPanel open={open} panelRef={contact} id="home-contact" />}
    <header ref={header} className={`${styles.header} ${variant === "project" ? styles.project : ""}`} data-ready={ready} data-open={open} inert={!ready}>
      {showLogo && <Link href="/#top" className={styles.logo} onClick={() => setOpen(false)} aria-label="Jimmy.zz 返回顶部"><ScrambleText enabled={ready}>Jimmy.zz</ScrambleText></Link>}
    <div className={styles.controls}>
      <button {...interaction} ref={toggle} className={styles.toggle} type="button" aria-expanded={open} aria-controls={isContact ? "home-contact" : "home-navigation"} aria-label={isContact ? "Contact" : "More"} onClick={() => setOpen((value) => !value)}>
        <TextRoll enabled={ready}>{isContact ? "Contact" : "More"}</TextRoll>
      </button>
    {!isContact && <nav id="home-navigation" className={styles.menu} aria-label="主导航" inert={!open}>
      {links.map(({ label, href }, index) => <NavigationLink key={label} label={label} href={href} index={index} enabled={ready && open} close={() => setOpen(false)} />)}
    </nav>}
    </div>
  </header></>;
}
