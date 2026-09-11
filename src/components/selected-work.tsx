"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useRef, useState } from "react";
import { ArrowUp, ArrowDown, ArrowUpRight } from "lucide-react";
import { Observer } from "gsap/Observer";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import { gsap, useGSAP } from "@/lib/gsap";
import { projects } from "@/lib/site-data";
import styles from "./selected-work.module.css";

gsap.registerPlugin(Observer, MorphSVGPlugin);

const selected = ["lemo-ai", "miaoshi-brand", "inner-species", "bandao"].map(
  (slug) => projects.find((project) => project.slug === slug)!,
);

// A bowed leading edge fills the image, following the GSAP Curve Swipe reference.
const curves = {
  forward: ["M0 1 V1 Q.5 1 1 1 V1 Z", "M0 1 V.5 Q.5 -.3 1 .5 V1 Z", "M0 1 V0 Q.5 0 1 0 V1 Z"],
  backward: ["M0 0 V0 Q.5 0 1 0 V0 Z", "M0 0 V.5 Q.5 1.3 1 .5 V0 Z", "M0 0 V1 Q.5 1 1 1 V0 Z"],
};

// Normalized clip coordinates need more than MorphSVG's default two decimals.
const morphShape = (shape: string) => ({ shape, shapeIndex: 0, precision: 5 });

export function SelectedWork() {
  const root = useRef<HTMLElement>(null);
  const navigate = useRef<(index: number) => void>(() => {});
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
  const clipId = useId().replace(/:/g, "");

  useGSAP((_, contextSafe) => {
    const section = root.current!;
    const slides = Array.from(section.querySelectorAll<HTMLElement>("[data-slide]"));
    const path = section.querySelector<SVGPathElement>("[data-curve]")!;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let current = 0;
    let moving = false;
    let gestureUsed = false;
    let animation: gsap.core.Timeline | undefined;
    const go = contextSafe!((index: number) => {
      if (moving || index === current || index < 0 || index >= slides.length) return;
      const direction = index > current ? 1 : -1;
      const outgoing = slides[current];
      const incoming = slides[index];
      const [start, bow, end] = direction === 1 ? curves.forward : curves.backward;
      moving = true;
      setBusy(true);
      setActive(index);
      gsap.set(outgoing, { visibility: "visible", zIndex: 1 });
      gsap.set(path, { attr: { d: start } });
      gsap.set(incoming, { visibility: "visible", zIndex: 2, clipPath: `url(#${clipId})` });
      const finish = () => {
        gsap.set(outgoing, { visibility: "hidden", zIndex: 0 });
        gsap.set(incoming, { clipPath: "none" });
        current = index;
        moving = false;
        setBusy(false);
      };
      animation = gsap.timeline({ onComplete: finish });
      if (reduced.matches) {
        gsap.set(incoming.querySelector("[data-image]"), { yPercent: 0, scale: 1 });
        gsap.set(incoming.querySelectorAll("[data-letter]"), { yPercent: 0, opacity: 1 });
        gsap.set(incoming.querySelector("[data-details]"), { y: 0, opacity: 1 });
        animation.set(path, { attr: { d: end } }).fromTo(incoming, { opacity: 0 }, { opacity: 1, duration: .15 });
        return;
      }
      animation
        .to(path, { morphSVG: morphShape(bow), duration: .48, ease: "power2.in" }, 0)
        .to(path, { morphSVG: morphShape(end), duration: .52, ease: "power2.out" }, .48)
        .fromTo(incoming.querySelector("[data-image]"), { yPercent: 16 * direction, scale: 1.13 }, { yPercent: 0, scale: 1, duration: 1.1, ease: "power2.out" }, 0)
        .to(outgoing.querySelector("[data-image]"), { yPercent: -12 * direction, duration: 1, ease: "power2.inOut" }, 0)
        .fromTo(incoming.querySelectorAll("[data-letter]"), { yPercent: 110 * direction, opacity: 0 }, { yPercent: 0, opacity: 1, stagger: .018, duration: .65, ease: "power2.out" }, .35)
        .fromTo(incoming.querySelector("[data-details]"), { y: 24 * direction, opacity: 0 }, { y: 0, opacity: 1, duration: .5 }, .55);
    });
    navigate.current = go;
    const leave = (direction: number) => {
      const bounds = section.getBoundingClientRect();
      const destination = direction > 0 ? window.scrollY + bounds.bottom - 88 : window.scrollY + bounds.top - window.innerHeight;
      window.scrollTo({ top: Math.max(0, destination), behavior: reduced.matches ? "instant" : "smooth" });
    };
    const gesture = (direction: number) => {
      if (moving || gestureUsed) return;
      gestureUsed = true;
      const bounds = section.getBoundingClientRect();
      // First align a partially visible slider; do not switch slides offscreen.
      if (Math.abs(bounds.top - 88) > 8) {
        window.scrollTo({ top: window.scrollY + bounds.top - 88, behavior: reduced.matches ? "instant" : "smooth" });
        return;
      }
      const next = current + direction;
      if (next < 0 || next >= slides.length) leave(direction);
      else go(next);
    };
    const observer = Observer.create({
      target: section, type: "wheel,touch,pointer", wheelSpeed: -1,
      tolerance: 30, preventDefault: true, allowClicks: true,
      ignore: "a, button", onUp: () => gesture(1), onDown: () => gesture(-1),
      onStopDelay: .22, onStop: () => { gestureUsed = false; },
      onRelease: () => { gestureUsed = false; },
    });
    return () => { observer.kill(); animation?.kill(); navigate.current = () => {}; };
  }, { scope: root });

  return (
    <section ref={root} tabIndex={-1} id="selected-work" className={styles.slider}
      aria-label="精选作品" aria-roledescription="轮播" aria-busy={busy} data-lenis-prevent
      onKeyDown={(event) => {
        if (event.target instanceof HTMLElement && event.target.closest("a, button")) return;
        if (["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"].includes(event.key)) {
          event.preventDefault();
          navigate.current(active + (["ArrowDown", "ArrowRight"].includes(event.key) ? 1 : -1));
        }
      }}>
      <svg className={styles.defs} aria-hidden="true"><defs><clipPath id={clipId} clipPathUnits="objectBoundingBox"><path data-curve d={curves.forward[2]} /></clipPath></defs></svg>
      {selected.map((project, index) => (
        <article key={project.slug} data-slide data-active={active === index} className={styles.slide}
          role="group" aria-roledescription="幻灯片" aria-label={`${index + 1} / ${selected.length}：${project.title}`}
          aria-hidden={active !== index} inert={active !== index}>
          <div className={styles.image} data-image>
            <Image src={`/assets/portfolio/${project.slug}/feature.webp`} alt={`${project.title}项目视觉`} fill sizes="100vw" priority={index === 0} draggable={false} />
          </div>
          <div className={styles.shade} />
          <div className={styles.title}>
            <span className={styles.kind}>{project.kind}</span>
            <h2 aria-label={project.title}>{Array.from(project.title).map((letter, i) => <span key={i} className={styles.letterMask} aria-hidden="true"><span data-letter>{letter === " " ? "\u00a0" : letter}</span></span>)}</h2>
          </div>
          <div className={styles.details} data-details>
            <div><p>{project.summary}</p><span>{project.tags.join(" / ")}</span></div>
            <Link href={`/work/${project.slug}`} className={styles.projectLink} data-hover-label="view">查看项目 <ArrowUpRight size={20} /></Link>
          </div>
        </article>
      ))}
      <div className={styles.topline}><span>SELECTED WORK / 精选作品</span><Link href="/work">全部 {projects.length} 个项目 <ArrowUpRight size={14} /></Link></div>
      <nav className={styles.controls} aria-label="项目切换">
        <button aria-label="上一个项目" disabled={busy || active === 0} onClick={() => navigate.current(active - 1)}><ArrowUp size={19} /></button>
        <span className={styles.counter} aria-live="polite" aria-atomic="true">{String(active + 1).padStart(2, "0")}<i />{String(selected.length).padStart(2, "0")}</span>
        <button aria-label="下一个项目" disabled={busy || active === selected.length - 1} onClick={() => navigate.current(active + 1)}><ArrowDown size={19} /></button>
      </nav>
      <div className={styles.bottomline}><span>SCROLL OR SWIPE</span><a href="#gallery">继续视觉漫游 <ArrowDown size={14} /></a></div>
    </section>
  );
}
