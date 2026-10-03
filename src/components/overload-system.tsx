"use client";

import Link from "next/link";
import { createContext, useContext, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { ArrowDown, ArrowUpRight, Pause, Play } from "lucide-react";
import { gsap, useGSAP } from "@/lib/gsap";
import { profile } from "@/lib/site-data";

const MotionContext = createContext({ moving: false, paused: false, reduced: true, toggle: () => {} });
const subscribe = (notify: () => void) => {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
};
export function OverloadProvider({ children }: { children: ReactNode }) {
  const reduced = useSyncExternalStore(subscribe, () => window.matchMedia("(prefers-reduced-motion: reduce)").matches, () => true);
  const [paused, setPaused] = useState(false);
  const moving = !paused && !reduced;
  return <MotionContext.Provider value={{ moving, paused, reduced, toggle: () => setPaused(value => !value) }}>
    <div className="overload-site" data-motion={moving ? "on" : "off"}>{children}</div>
  </MotionContext.Provider>;
}
export const useOverloadMotion = () => useContext(MotionContext);

export function Spark({ className = "" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 100 100" fill="currentColor" aria-hidden="true"><path d="M50 0 59 31 85 15 69 41 100 50 69 59 85 85 59 69 50 100 41 69 15 85 31 59 0 50 31 41 15 15 41 31Z" /></svg>;
}
export function Orbit({ className = "" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 160 160" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">{Array.from({ length: 8 }, (_, i) => <ellipse key={i} cx="80" cy="80" rx="73" ry="25" transform={`rotate(${i * 22.5} 80 80)`} />)}</svg>;
}

const links = [["Work", "作品", "/work"], ["Play", "视觉漫游", "/#gallery"], ["About", "关于我", "/#introduction"]] as const;
export function OverloadNav({ light = false }: { light?: boolean }) {
  const { moving, reduced, toggle } = useOverloadMotion();
  const menu = useRef<HTMLDetailsElement>(null);
  return <header className={`ol-nav${light ? " ol-nav-light" : ""}`}>
    <Link className="ol-logo" href="/" aria-label="Jimmy ZZ 首页">Jimmy.zz<Spark /></Link>
    <span className="ol-nav-note">INDEPENDENT MIND.<br />MULTIPLE DIMENSIONS.</span>
    <nav className="ol-nav-links" aria-label="主导航">{links.map(([label, title, href]) => <Link key={href} href={href} aria-label={`${label} · ${title}`}>{label}<span>↗</span></Link>)}</nav>
    <button className="ol-motion" type="button" onClick={toggle} disabled={reduced} aria-label={reduced ? "已遵循系统减少动态设置" : moving ? "暂停动效" : "开启动效"} aria-pressed={!moving}>{moving ? <Pause size={12} /> : <Play size={12} />}<span>MOTION {moving ? "ON" : "OFF"}</span></button>
    <details className="ol-mobile-menu" ref={menu} onKeyDown={event => { if (event.key === "Escape" && menu.current) { menu.current.open = false; menu.current.querySelector("summary")?.focus(); } }}>
      <summary aria-label="打开导航">Menu <span>+</span></summary>
      <nav aria-label="移动导航">{links.map(([label, title, href]) => <Link key={href} href={href} onClick={() => { if (menu.current) menu.current.open = false; }}>{label}<span>{title} ↗</span></Link>)}<a href={`mailto:${profile.email}`}>Contact<span>聊聊项目 ↗</span></a></nav>
    </details>
  </header>;
}

export function OverloadFooter() {
  return <footer id="contact" className="ol-footer">
    <div className="ol-section-kicker"><span>HAVE A GOOD ONE IN MIND?</span><span>一起，把想法变成现实 ↙</span></div>
    <a className="ol-contact" href={`mailto:${profile.email}`}><span>LET’S MAKE<br /><em>SOMETHING.</em></span><ArrowUpRight aria-hidden="true" /></a>
    <div className="ol-footer-info"><a href={`mailto:${profile.email}`}>{profile.email} ↗</a><span>视觉设计 / 创意技术 / 无限可能</span><a href="#top">BACK TO TOP ↑</a></div>
    <div className="ol-footer-bottom"><span>© 2026 JIMMY ZZ · 张振</span><span>ALWAYS CURIOUS. NEVER FINISHED.</span><Spark /></div>
  </footer>;
}

export function OverloadReveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const scope = useRef<HTMLDivElement>(null);
  const { moving } = useOverloadMotion();
  useGSAP(() => {
    if (!moving) return;
    scope.current?.querySelectorAll<HTMLElement>("[data-reveal]").forEach(element => {
      gsap.from(element, { y: 65, opacity: 0, duration: .85, ease: "power3.out", scrollTrigger: { trigger: element, start: "top 94%", once: true } });
    });
  }, { scope, dependencies: [moving], revertOnUpdate: true });
  return <div ref={scope} className={className}>{children}</div>;
}

export function DownLink() {
  return <a className="ol-down" href="#selected-work"><span>SCROLL TO EXPLORE<br /><small>下滑，进入我的创意世界</small></span><ArrowDown size={23} /></a>;
}
