"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import styles from "./chrome-home.module.css";
import { HomeLoader } from "./home-loader";

const ChromeScene = dynamic(() => import("./chrome-scene"), { ssr: false });
gsap.registerPlugin(ScrambleTextPlugin);

function ScrambledLabel({ text, delay = 0 }: { text: string; delay?: number }) {
  const label = useRef<HTMLSpanElement>(null);
  useGSAP(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.fromTo(label.current, { opacity: 0 }, {
      opacity: 1, duration: 0.75, delay,
      scrambleText: { text, chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", revealDelay: 0.12, speed: 0.35 },
    });
  }, { scope: label, dependencies: [text, delay], revertOnUpdate: true });
  return <span className={styles.scrambleLabel} aria-hidden="true"><span className={styles.labelMeasure}>{text}</span><span ref={label} className={styles.labelAnimation}>{text}</span></span>;
}

function HeroMenu() {
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !menu.current?.contains(event.target)) setOpen(false);
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
  return <div ref={menu} className={styles.heroMenu}>
    <button ref={toggle} type="button" className={styles.menuToggle} aria-label={open ? "Close menu" : "Menu"} aria-expanded={open} aria-controls="hero-menu-links" onClick={() => setOpen(!open)}>
      <ScrambledLabel text={open ? "Close" : "Menu"} />
    </button>
    <nav id="hero-menu-links" aria-label="首屏导航" className={styles.menuLinks} hidden={!open}>
      {open && [{ text: "About", href: "#about" }, { text: "Work", href: "#selected-work" }, { text: "Contact", href: "#contact" }].map(({ text, href }, index) =>
        <a key={text} href={href} aria-label={text} onClick={() => setOpen(false)}><ScrambledLabel text={text} delay={index * 0.09} /></a>
      )}
    </nav>
  </div>;
}

export function ChromeHero() {
  const hero = useRef<HTMLElement>(null);
  const [loading, setLoading] = useState(true);
  const finishLoading = useCallback(() => setLoading(false), []);
  const workProgress = useRef(0);
  const [view, setView] = useState<"intro" | "transition" | "work">("intro");
  useGSAP(() => {
    if (loading || !hero.current) return;
    const element = hero.current;
    const distance = () => element.offsetHeight - 88;
    const update = (progress: number) => {
      workProgress.current = progress;
      element.style.setProperty("--work-progress", String(progress));
      element.style.setProperty("--hero-scroll", `${progress * distance()}px`);
      setView(progress === 0 ? "intro" : progress === 1 ? "work" : "transition");
    };
    ScrollTrigger.create({
      start: 0,
      end: distance,
      onUpdate: (self) => update(self.progress),
      onRefresh: (self) => update(self.progress),
    });
  }, { scope: hero, dependencies: [loading], revertOnUpdate: true });
  const showIntro = () => window.scrollTo({ top: 0,
    behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });

  return (
    <section ref={hero} data-view={view} className={`${styles.page} ${styles.hero}`} aria-label="ZZ 黑色银铬互动首屏">
      {loading && <HomeLoader scope={hero} onComplete={finishLoading} />}
      <header className={styles.header} inert={loading}>
        <Link href="/" aria-label="Jimmy zz 首页" data-vortex-element className={styles.wordmark}>
          {loading ? <span className={styles.labelMeasure} aria-hidden="true">Jimmy zz</span> : <ScrambledLabel text="Jimmy zz" />}
        </Link>
        {!loading && <HeroMenu />}
      </header>
      <div className={styles.stage} inert={loading}>
        <div className={styles.fallback} aria-hidden="true">ZZ</div>
        <ChromeScene workProgress={workProgress} interactive={view === "intro"} paused={loading} />
        <button className={styles.homeLogo} onClick={showIntro} aria-label="返回首页" tabIndex={view === "work" ? 0 : -1} />
        <div className={styles.center}>
          <h1 className={styles.srOnly}>Jimmy ZZ — Visual design & creative technology</h1>
        </div>
      </div>
    </section>
  );
}
