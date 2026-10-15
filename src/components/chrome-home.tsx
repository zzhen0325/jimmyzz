"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";
import { ScrollTrigger, useGSAP } from "@/lib/gsap";
import type { FloatingMode } from "@/lib/chrome-world";
import styles from "./chrome-home.module.css";
import { FloatingNav } from "./floating-nav";
import { HomeLoader } from "./home-loader";
import { shouldShowHomeLoader } from "@/lib/home-loading";

const ChromeScene = dynamic(() => import("./chrome-scene"), { ssr: false });
export function ChromeHero() {
  const [loading, setLoading] = useState(shouldShowHomeLoader);
  const finishLoading = useCallback(() => setLoading(false), []);
  const [floatingMode, setFloatingMode] = useState<FloatingMode>("flow-rings");
  const [motionMenu, setMotionMenu] = useState(false);
  const hero = useRef<HTMLElement>(null);
  const workProgress = useRef(0);
  const [view, setView] = useState<"intro" | "transition" | "work">("intro");
  useGSAP(() => {
    if (!hero.current) return;
    const element = hero.current;
    const distance = () => element.offsetHeight - 88;
    const update = (progress: number) => {
      // Finish the logo before the introduction reaches the top of the viewport.
      // Keep the stage tied to actual scroll so the header never jumps ahead.
      const sceneProgress = Math.min(1, progress / .75);
      workProgress.current = sceneProgress;
      element.style.setProperty("--work-progress", String(sceneProgress));
      element.style.setProperty("--hero-scroll", `${progress * distance()}px`);
      setView(sceneProgress === 0 ? "intro" : sceneProgress === 1 ? "work" : "transition");
    };
    ScrollTrigger.create({
      start: 0,
      end: distance,
      onUpdate: (self) => update(self.progress),
      onRefresh: (self) => update(self.progress),
    });
  }, { scope: hero, dependencies: [], revertOnUpdate: true });
  const showIntro = () => window.scrollTo({ top: 0,
    behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });

  return (
    <>
    <FloatingNav ready={!loading} />
    {loading && <HomeLoader scope={hero} onComplete={finishLoading} />}
    <section ref={hero} data-view={view} className={`${styles.page} ${styles.hero}`} aria-label="ZZ 黑色银铬互动首屏" inert={loading}>
      <div className={styles.stage}>
        <ChromeScene paused={loading} weather="sunny" floatingMode={floatingMode} workProgress={workProgress} interactive={!loading && view === "intro"} />
        {view === "intro" && <div className={styles.motionControl} onKeyDown={event => { if (event.key === "Escape") { setMotionMenu(false); event.currentTarget.querySelector<HTMLButtonElement>("button")?.focus(); } }}>
          <button type="button" className={styles.motionTrigger} aria-label="切换漂浮效果" aria-expanded={motionMenu} aria-controls="floating-motion-options" onClick={() => setMotionMenu(open => !open)}>◌</button>
          {motionMenu && <div id="floating-motion-options" className={styles.motionMenu} role="group" aria-label="漂浮效果">
            <span>漂浮方式</span>
            {([["flow-rings", "① 并列环流"], ["flow-wave", "② 横向波带"], ["flow-twist", "③ 扭转环流"], ["flow-helix", "④ 螺旋流"], ["diagonal-drift", "⑤ 斜向漫游"], ["gravity", "⑥ 重力"], ["physics", "原版 · 自由漂浮"]] as const).map(([mode, label]) =>
              <button key={mode} type="button" aria-pressed={floatingMode === mode} onClick={() => setFloatingMode(mode)}>{label}</button>
            )}
            <button type="button" onClick={() => setMotionMenu(false)}>收起 ×</button>
          </div>}
        </div>}
        <p className={styles.skyTagline}>THE WORLD<br />INSIDE<br />MY HEAD</p>
        <p className={styles.skyYear}>@2026</p>
        <button className={styles.homeLogo} onClick={showIntro} aria-label="返回首页" tabIndex={view === "work" ? 0 : -1} />
        <div className={styles.center}>
          <h1 className={styles.srOnly}>Jimmy ZZ — Visual design & creative technology</h1>
        </div>
      </div>
    </section>
    </>
  );
}
