"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";
import { ScrollTrigger, useGSAP } from "@/lib/gsap";
import type { FloatingMode } from "@/lib/chrome-world";
import styles from "./chrome-home.module.css";
import { HomeLoader } from "./home-loader";
import { FloatingNav } from "./floating-nav";

const ChromeScene = dynamic(() => import("./chrome-scene"), { ssr: false });
export function ChromeHero() {
  const [floatingMode, setFloatingMode] = useState<FloatingMode>("physics");
  const [motionMenu, setMotionMenu] = useState(false);
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
    <>
    <FloatingNav ready={!loading} />
    <section ref={hero} data-view={view} className={`${styles.page} ${styles.hero}`} aria-label="ZZ 黑色银铬互动首屏">
      {loading && <HomeLoader scope={hero} onComplete={finishLoading} />}
      <div className={styles.stage} inert={loading}>
        <div className={styles.fallback} aria-hidden="true">ZZ</div>
        <ChromeScene floatingMode={floatingMode} workProgress={workProgress} interactive={view === "intro"} paused={loading} />
        {view === "intro" && <div className={styles.motionControl} onKeyDown={event => { if (event.key === "Escape") { setMotionMenu(false); event.currentTarget.querySelector<HTMLButtonElement>("button")?.focus(); } }}>
          <button type="button" className={styles.motionTrigger} aria-label="切换漂浮效果" aria-expanded={motionMenu} aria-controls="floating-motion-options" onClick={() => setMotionMenu(open => !open)}>◌</button>
          {motionMenu && <div id="floating-motion-options" className={styles.motionMenu} role="group" aria-label="漂浮效果">
            <span>漂浮方式</span>
            {([["planet-belt", "⑤ 行星带 · 按住加速"], ["physics-wave", "原版 + 波浪接力"], ["orbit", "② 椭圆环绕"], ["wave", "③ 波浪接力"], ["parallax", "④ 分层视差"], ["physics", "原版 · 自由漂浮"]] as const).map(([mode, label]) =>
              <button key={mode} type="button" aria-pressed={floatingMode === mode} onClick={() => setFloatingMode(mode)}>{label}</button>
            )}
            <button type="button" onClick={() => setMotionMenu(false)}>收起 ×</button>
          </div>}
        </div>}
        <button className={styles.homeLogo} onClick={showIntro} aria-label="返回首页" tabIndex={view === "work" ? 0 : -1} />
        <div className={styles.center}>
          <h1 className={styles.srOnly}>Jimmy ZZ — Visual design & creative technology</h1>
        </div>
      </div>
    </section>
    </>
  );
}
