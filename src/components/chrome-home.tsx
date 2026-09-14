"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { ScrollTrigger, useGSAP } from "@/lib/gsap";
import styles from "./chrome-home.module.css";
import { HomeLoader } from "./home-loader";

const ChromeScene = dynamic(() => import("./chrome-scene"), { ssr: false });

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
      <div className={styles.stage} inert={loading}>
        <div className={styles.fallback} aria-hidden="true">ZZ</div>
        <ChromeScene workProgress={workProgress} interactive={view === "intro"} />
        <header className={styles.header}>
          <Link href="/" aria-label="ZZ 首页" data-vortex-element className={styles.wordmark}>Jimmy ZZ<span>®</span></Link>
          {/* <span className={styles.headerNote}>INDEPENDENT DESIGNER<br />& CREATIVE ENGINEER</span> */}
        </header>
        <button className={styles.homeLogo} onClick={showIntro} aria-label="返回首页" tabIndex={view === "work" ? 0 : -1} />
        <div className={styles.center}>
          <h1 className={styles.srOnly}>Jimmy ZZ — Visual design & creative technology</h1>
        </div>
      </div>
    </section>
  );
}
