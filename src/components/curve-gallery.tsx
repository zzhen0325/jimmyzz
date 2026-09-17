"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { gsap, ScrollTrigger, useGSAP, motionConditions } from "@/lib/gsap";
import images from "@/lib/curve-gallery-assets.json";
import { projects } from "@/lib/site-data";
import Image from "next/image";
import "./ribbon-gallery.css";
import { HomeSectionHeading } from "./home-section-heading";

export function CurveGallery() {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const jump = useRef<(index: number) => void>(() => {});
  const current = useRef(0);
  const [active, setActive] = useState(0);
  const project = projects.find((item) => item.slug === images[active].project)!;

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(motionConditions, ({ conditions }) => {
      const root = stage.current!;
      const cards = Array.from(root.querySelectorAll<HTMLElement>(".ribbon-card"));
      if (conditions?.reduced) {
        jump.current = (index) => {
          current.current = index; setActive(index); cards[index]?.focus();
        };
        return;
      }
      root.classList.add("is-animated");
      const playhead = { value: 0 };
      const render = () => {
        const w = root.clientWidth;
        const h = root.clientHeight;
        const size = w <= 809 ? Math.min(w * .62, 260) : Math.min(w * .24, 330);
        const anchor = w * .5;
        cards.forEach((card, i) => {
          const d = i - playhead.value;
          const focus = Math.exp(-Math.pow(d / 1.6, 2));
          // Integrating the magnification spreads cards around the playhead,
          // while the far-away images collapse into a continuous film strip.
          const spread = Math.tanh(d * .48) * size * 1.5;
          const x = anchor + d * Math.max(24, w * .029) + spread;
          const y = h * .5 + Math.sin(i * 2.4 + .5) * h * .18 * focus;
          const scale = .13 + .87 * focus;
          const height = size;
          card.style.width = `${size}px`;
          card.style.height = `${height}px`;
          card.style.transform = `translate3d(${x - size / 2}px, ${y - height / 2}px, 0) scale(${scale})`;
          card.style.zIndex = String(Math.round(focus * 100));
          card.style.visibility = x < -size || x > w + size ? "hidden" : "visible";
        });
        const index = Math.max(0, Math.min(images.length - 1, Math.round(playhead.value)));
        if (index !== current.current) { current.current = index; setActive(index); }
      };
      const animation = gsap.to(playhead, {
        value: images.length - 1, ease: "none", onUpdate: render,
        scrollTrigger: {
          id: "ribbon-gallery", trigger: root, start: "top top", pin: true,
          end: () => `+=${Math.max(3200, innerHeight * 5)}`, scrub: .65,
          anticipatePin: 1, invalidateOnRefresh: true, onRefresh: render,
        },
      });
      const trigger = animation.scrollTrigger!;
      jump.current = (index) => {
        const clamped = Math.max(0, Math.min(images.length - 1, index));
        // Native scrolling also keeps Lenis and the pinned timeline in sync.
        window.scrollTo({ top: trigger.start + (clamped / (images.length - 1)) * (trigger.end - trigger.start), behavior: "instant" });
        ScrollTrigger.update();
      };
      let startX = 0;
      let startY = 0;
      let startScroll = 0;
      let dragged = false;
      const down = (event: PointerEvent) => {
        if ((event.target as HTMLElement).closest(".ribbon-footer")) return;
        startX = event.clientX; startY = event.clientY; startScroll = window.scrollY; dragged = false;
      };
      const move = (event: PointerEvent) => {
        if (!event.buttons && event.pointerType !== "touch") return;
        const delta = startX - event.clientX;
        if (Math.abs(delta) < 10 || Math.abs(delta) < Math.abs(startY - event.clientY)) return;
        dragged = true;
        window.scrollTo({ top: Math.max(trigger.start, Math.min(trigger.end, startScroll + delta * 3)), behavior: "instant" });
      };
      const click = (event: MouseEvent) => {
        if (dragged) { event.preventDefault(); event.stopPropagation(); dragged = false; }
      };
      root.addEventListener("pointerdown", down);
      root.addEventListener("pointermove", move);
      root.addEventListener("click", click, true);
      render();
      return () => {
        root.classList.remove("is-animated");
        root.removeEventListener("pointerdown", down);
        root.removeEventListener("pointermove", move);
        root.removeEventListener("click", click, true);
        cards.forEach((card) => card.removeAttribute("style"));
        jump.current = () => {};
      };
    });
    return () => mm.revert();
  }, { scope: section });

  return (
    <section id="gallery" ref={section} className="ribbon-section" aria-label="视觉漫游">
      <HomeSectionHeading index="02" label="VISUAL LAB / 视觉漫游" title="A closer look." id="gallery-title">
        <p>走近作品里的角色、色彩与细节。沿着横向画廊，看看同一个想法的不同切面。</p>
      </HomeSectionHeading>
      <div ref={stage} className="ribbon-stage" aria-label="滚动画廊">
        <div className="ribbon-instructions"><p><span className="ribbon-motion-hint">滚动继续 · 左右拖动 · </span>点击图片查看项目</p><a href="#services">继续了解设计实践 <span aria-hidden="true">↘</span></a></div>
        <div className="ribbon-guides" aria-hidden="true" />
        <div className="ribbon-playhead" aria-hidden="true"><i /> <i /></div>
        <div className="ribbon-images">
          {images.map((item, i) => (
            <Link className="ribbon-card" key={item.name} href={`/work/${item.project}`} data-hover-label={projects.find((project) => project.slug === item.project)?.title ?? item.title}
              onFocus={(event) => { if (event.currentTarget.matches(":focus-visible")) jump.current(i); }} draggable={false} aria-label={`查看${item.title}`}>
              <span className="motion-image"><Image src={item.src} alt={item.title} width={item.width} height={item.height} sizes="(max-width: 809px) 65vw, 330px" draggable={false} /></span>
            </Link>
          ))}
        </div>
        <div className="ribbon-footer">
          <span className="ribbon-count">{String(active + 1).padStart(2, "0")} <small>/ {images.length}</small></span>
          <div className="ribbon-title" aria-live="polite"><span>▸ {project.title}</span><small>{images[active].title}</small></div>
          <div className="ribbon-actions"><button onClick={() => jump.current(active - 1)} disabled={active === 0} aria-label="上一张"><ArrowLeft size={18} /></button><button onClick={() => jump.current(active + 1)} disabled={active === images.length - 1} aria-label="下一张"><ArrowRight size={18} /></button><Link href={`/work/${project.slug}`}>查看项目 <ArrowUpRight size={16} /></Link></div>
        </div>
      </div>
    </section>
  );
}
