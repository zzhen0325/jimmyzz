"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, X } from "lucide-react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { profile } from "@/lib/site-data";
import styles from "./chrome-home.module.css";

const ChromeScene = dynamic(() => import("./chrome-scene"), { ssr: false });
export function ChromeHero() {
  const hero = useRef<HTMLElement>(null);
  const workProgress = useRef(0);
  const transition = useRef<gsap.core.Timeline | null>(null);
  const [view, setView] = useState<"intro" | "transition" | "work">("intro");
  const { contextSafe } = useGSAP(() => () => {
    transition.current?.kill();
    window.dispatchEvent(new CustomEvent("hero-game-change", { detail: false }));
  }, { scope: hero });
  const showWork = () => contextSafe(() => {
    if (transition.current?.isActive()) return;
    setMenu(false);
    if (workProgress.current === 1) { window.scrollTo({ top: 0, behavior: "instant" }); return; }
    setView("transition");
    window.dispatchEvent(new CustomEvent("hero-game-change", { detail: true }));
    window.scrollTo({ top: 0, behavior: "instant" });
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let refreshed = false;
    transition.current = gsap.timeline({
      onComplete: () => {
        setView("work");
        ScrollTrigger.refresh();
        window.dispatchEvent(new CustomEvent("hero-game-change", { detail: false }));
        document.getElementById("selected-work")?.focus({ preventScroll: true });
      },
    }).to(workProgress, {
      current: 1, duration: reduced ? 0.01 : 2.4, ease: "power2.in",
      onUpdate: () => {
        const p = workProgress.current;
        const t = gsap.utils.clamp(0, 1, (p - .35) / .65);
        hero.current?.style.setProperty("--work-layout", String(t));
        hero.current?.style.setProperty("--work-progress", String(p));
        if (p > .7 && !refreshed) { refreshed = true; ScrollTrigger.refresh(); }
      },
    });
  })();
  const showIntro = () => contextSafe(() => {
    if (transition.current?.isActive()) return;
    window.scrollTo({ top: 0, behavior: "instant" });
    transition.current?.kill();
    workProgress.current = 0;
    hero.current?.style.removeProperty("--work-layout");
    hero.current?.style.removeProperty("--work-progress");
    setMenu(false);
    setView("intro");
    requestAnimationFrame(() => ScrollTrigger.refresh());
  })();
  const menuButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    if (!menu) return;
    closeButton.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setMenu(false); menuButton.current?.focus(); }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [menu]);

  return (
    <section ref={hero} data-view={view} className={`${styles.page} ${styles.hero}`} aria-label="ZZ 黑色银铬互动首屏">
      <div className={styles.stage}>
        <div className={styles.fallback} aria-hidden="true">ZZ</div>
        <ChromeScene workProgress={workProgress} interactive={view === "intro"} />
        <header className={styles.header}>
          <Link href="/" aria-label="ZZ 首页" className={styles.wordmark}>Jimmy ZZ<span>®</span></Link>
          <span className={styles.headerNote}>INDEPENDENT DESIGNER<br />& CREATIVE ENGINEER</span>
          <a href={`mailto:${profile.email}`} className={styles.contact}>LET’S TALK <ArrowUpRight size={12} /></a>
        </header>
        <button className={styles.homeLogo} onClick={showIntro} aria-label="返回首页" tabIndex={view === "work" ? 0 : -1} />
        <div className={styles.center}>
          <h1 className={styles.srOnly}>Jimmy ZZ — Visual design & creative technology</h1>
          <div className={styles.dock}>
            <button onClick={showWork} disabled={view === "transition"} aria-controls="selected-work">Work <ArrowUpRight size={14} /></button>
            <span className={styles.dockMark} aria-hidden="true">✳</span>
            <button ref={menuButton} onClick={() => setMenu(!menu)} aria-expanded={menu} aria-controls="chrome-menu">{menu ? "Close" : "Menu"}<span aria-hidden="true">{menu ? "−" : "+"}</span></button>
          </div>
          <p id="chrome-interaction-hint">Drag to orbit. Click to scatter.</p>
        </div>
        <div className="hero-profile" inert={view !== "intro"}>
          <a href="#about" className="hero-editor-card">
            <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-sm bg-[#f2f2f2] text-lg font-semibold text-[#172010]" />
            <span className="flex-1">
              <b className="block text-xs">Hey, I&apos;m ZZ</b>
              <small className="text-[10px] text-white/70">Creative Engineer</small>
            </span>
            <ArrowUpRight size={16} />
          </a>
          <p className="hero-introduction">
            Building brands through visuals and connecting people through experiences. Exploring illustration, type, 3D and motion — with AI and code.
          </p>
        </div>
        {menu && <nav className={styles.menu} id="chrome-menu" aria-label="主导航">
          <div className={styles.menuTop}><span>LET’S LOOK AROUND.</span><button ref={closeButton} onClick={() => { setMenu(false); menuButton.current?.focus(); }} aria-label="关闭菜单"><X size={22} /></button></div>
          <button onClick={showWork} disabled={view === "transition"}>Selected work<ArrowUpRight /></button>
          <Link onClick={() => setMenu(false)} href="/#gallery">Playground<ArrowUpRight /></Link>
          <Link onClick={() => setMenu(false)} href="/#about">About me<ArrowUpRight /></Link>
          <a href={`mailto:${profile.email}`}>Let’s talk<ArrowUpRight /></a>
          <small>VISUAL DESIGN · ART DIRECTION · CREATIVE TECHNOLOGY</small>
        </nav>}
      </div>
    </section>
  );
}
