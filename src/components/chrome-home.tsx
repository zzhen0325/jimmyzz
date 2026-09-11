"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUpRight, Pause, Play, RotateCcw, X } from "lucide-react";
import { profile } from "@/lib/site-data";
import styles from "./chrome-home.module.css";

const ChromeScene = dynamic(() => import("./chrome-scene"), { ssr: false });
const works = [
  { slug: "lemo-ai", name: "All about AIGC", category: "CREATIVE TECHNOLOGY", image: "cover" },
  { slug: "miaoshi-brand", name: "This way to love", category: "BRAND & ART DIRECTION", image: "cover" },
  { slug: "visual-explorations", name: "Never stop playing", category: "VISUAL EXPLORATIONS", image: "cover" },
];

export function ChromeHome() {
  const menuButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [paused, setPaused] = useState(false);
  const [replayToken, setReplayToken] = useState(0);
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
    <main className={styles.page} id="top">
      <section className={styles.hero} aria-label="ZZ 黑色银铬互动首屏">
        <div className={styles.stage}>
          <div className={styles.fallback} aria-hidden="true">ZZ</div>
          <ChromeScene paused={paused} replayToken={replayToken} />
          <header className={styles.header}>
            <Link href="/" aria-label="ZZ 首页" className={styles.wordmark}>Jimmy ZZ<span>®</span></Link>
            <span className={styles.headerNote}>INDEPENDENT DESIGNER<br />& CREATIVE ENGINEER</span>
            <Link href="/" className={styles.version}>VOL. 02 <span>↗ V1</span></Link>
          </header>
          <div className={styles.center}>
            <h1 className={styles.srOnly}>Jimmy ZZ — Visual design & creative technology</h1>
            <div className={styles.dock}>
              <Link href="/work">Work <ArrowUpRight size={14} /></Link>
              <span className={styles.dockMark} aria-hidden="true">✳</span>
              <button ref={menuButton} onClick={() => setMenu(!menu)} aria-expanded={menu} aria-controls="chrome-menu">{menu ? "Close" : "Menu"}<span aria-hidden="true">{menu ? "−" : "+"}</span></button>
            </div>
            <p id="chrome-interaction-hint">Drag to orbit. Click to scatter.</p>
          </div>
          <div className={styles.bottom}>
            <p>用视觉表达想法，<br />用技术创造可能。</p>
            <a href="#chrome-work" className={styles.scroll}>VIEW SELECTED WORK <ArrowDown size={14} /></a>
            <div className={styles.controls}><button className={styles.motion} onClick={() => { setPaused(false); setReplayToken(value => value + 1); }} aria-label="重播入场爆炸"><RotateCcw size={12} /><span>REPLAY</span></button><button className={styles.motion} onClick={() => setPaused(!paused)} aria-label={paused ? "播放动画" : "暂停动画"} aria-pressed={paused}>{paused ? <Play size={12} /> : <Pause size={12} />}<span>{paused ? "PLAY" : "PAUSE"}</span></button></div>
          </div>
          {menu && <nav className={styles.menu} id="chrome-menu" aria-label="第二版导航">
            <div className={styles.menuTop}><span>LET’S LOOK AROUND.</span><button ref={closeButton} onClick={() => { setMenu(false); menuButton.current?.focus(); }} aria-label="关闭菜单"><X size={22} /></button></div>
            <Link onClick={() => setMenu(false)} href="/work">Selected work<ArrowUpRight /></Link>
            <Link onClick={() => setMenu(false)} href="/#gallery">Playground<ArrowUpRight /></Link>
            <Link onClick={() => setMenu(false)} href="/#about">About me<ArrowUpRight /></Link>
            <a href={`mailto:${profile.email}`}>Let’s talk<ArrowUpRight /></a>
            <small>VISUAL DESIGN · ART DIRECTION · CREATIVE TECHNOLOGY</small>
          </nav>}
        </div>
      </section>
      <section id="chrome-work" className={styles.work}>
        <div className={styles.workHeading}><span>(01 — 03)</span><h2>Selected work<span> / 精选作品</span></h2><Link href="/work">VIEW ALL <ArrowUpRight size={15} /></Link></div>
        <div className={styles.workGrid}>{works.map((work, index) => <Link key={work.slug} href={`/work/${work.slug}`} className={styles.workCard}>
          <div className={styles.workImage}><Image src={`/assets/portfolio/${work.slug}/${work.image}.webp`} alt={work.name} fill sizes="(max-width: 700px) 100vw, 33vw" /></div>
          <div><h3>{work.name}</h3><ArrowUpRight size={19} /></div><small>0{index + 1} / {work.category}</small>
        </Link>)}</div>
        <footer className={styles.footer}><span>© {new Date().getFullYear()} JIMMY ZZ</span><a href={`mailto:${profile.email}`}>HAVE AN IDEA? LET’S TALK <ArrowUpRight size={14} /></a><a href="#top">BACK TO TOP ↑</a></footer>
      </section>
    </main>
  );
}
