"use client";

import { ScrambleText } from "./scramble-text";

import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { gsap, ScrollTrigger, useGSAP, motionConditions } from "@/lib/gsap";
import { projects, projectCover } from "@/lib/site-data";
import { curveGallery as detailImages, selectedWork } from "@/lib/projects-config";
import Image from "next/image";
import "./ribbon-gallery.css";

// The end of the grid becomes the beginning of the strip, with identical media.
const selectedProjects = selectedWork.order.flatMap((slug) => {
  const project = projects.find((item) => item.slug === slug);
  return project ? [project] : [];
});
const images = [
  ...[...selectedProjects].reverse().map((project) => ({
    name: `cover-${project.slug}`, project: project.slug, title: project.title,
    src: project.selectedWorkCover, width: 960, height: 960, sourceProject: project.slug,
  })),
  ...detailImages.map((image) => ({ ...image, sourceProject: null })),
];

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
          const clamped = Math.max(0, Math.min(images.length - 1, index));
          current.current = clamped; setActive(clamped); cards[clamped]?.focus();
        };
        return;
      }
      root.classList.add("is-animated");
      const playhead = { value: 0 };
      const entrance = { value: 0 };
      const work = section.current?.closest(".home-content")?.querySelector("#work-index");
      const sources = images.map((image) => image.sourceProject
        ? work?.querySelector<HTMLElement>(`[data-project="${image.sourceProject}"] [data-work-skew]`) ?? null
        : null);
      const savedVisibility = sources.map((source) => source?.style.visibility ?? "");
      let bounds: { x: number; y: number; width: number; height: number }[] = [];
      const videos = cards.map((card) => card.querySelector("video"));
      let playingVideo: HTMLVideoElement | null = null;
      let stageWidth = 0;
      let stageHeight = 0;
      let size = 0;
      const measure = () => {
        stageWidth = root.clientWidth;
        stageHeight = root.clientHeight;
        size = stageWidth <= 809 ? Math.min(stageWidth * .62, 260) : Math.min(stageWidth * .24, 330);
        const origin = section.current!.getBoundingClientRect();
        // Measurements happen on refresh, never in the per-frame write loop.
        bounds = sources.map((source) => {
          if (!source) return { x: 0, y: 0, width: size, height: size };
          const rect = source.getBoundingClientRect();
          return { x: rect.left - origin.left, y: rect.top - origin.top,
            width: source.offsetWidth, height: source.offsetHeight };
        });
      };
      const render = () => {
        const progress = entrance.value;
        const landing = progress >= .9999;
        root.classList.toggle("is-transferring", progress > 0 && !landing);
        const baseline = Math.max(size + 64, stageHeight * .64);
        cards.forEach((card, i) => {
          const d = i - playhead.value;
          const focus = Math.exp(-Math.pow(d / 1.6, 2));
          const scale = .13 + .87 * focus;
          const targetSize = size * scale;
          const targetX = stageWidth * .5 + d * Math.max(24, stageWidth * .029)
            + Math.tanh(d * .48) * size * 1.5 - targetSize / 2;
          const targetY = baseline - targetSize;
          const source = sources[i];
          const from = bounds[i];
          if (source && from && !landing) {
            // Each gallery card starts exactly over its original grid cover.
            // Interpolating the crop box preserves the image's proportions.
            const t = gsap.utils.clamp(0, 1, progress * 1.15 - (i % 4) * .05);
            const eased = t * t * (3 - 2 * t);
            const x = from.x + (targetX - from.x) * eased;
            const y = from.y + (targetY - from.y) * eased;
            card.style.width = `${from.width + (targetSize - from.width) * eased}px`;
            card.style.height = `${from.height + (targetSize - from.height) * eased}px`;
            card.style.transform = `translate3d(${x}px, ${y}px, 0)`;
            card.style.visibility = progress > 0 ? "visible" : "hidden";
            card.style.opacity = "1";
          } else {
            card.style.width = `${size}px`;
            card.style.height = `${size}px`;
            // Scaling about the bottom centre keeps the strip on one baseline.
            card.style.transform = `translate3d(${targetX - (size - targetSize) / 2}px, ${baseline - size}px, 0) scale(${scale})`;
            card.style.visibility = targetX < -size || targetX > stageWidth + size ? "hidden" : "visible";
            card.style.opacity = source ? "1" : String(gsap.utils.clamp(0, 1, (progress - .75) * 4));
          }
          card.style.zIndex = String(Math.round(focus * 100));
          if (source) source.style.visibility = progress > 0 ? "hidden" : savedVisibility[i];
        });
        const index = Math.max(0, Math.min(images.length - 1, Math.round(playhead.value)));
        const nextVideo = landing ? videos[index] : null;
        if (nextVideo !== playingVideo) {
          playingVideo?.pause();
          playingVideo = nextVideo;
          if (playingVideo) void playingVideo.play().catch(() => {});
        }
        if (index !== current.current) { current.current = index; setActive(index); }
      };
      measure();
      const transition = gsap.timeline({
        scrollTrigger: {
          id: "grid-to-ribbon", trigger: root, start: "top bottom", end: "top top", scrub: true,
          invalidateOnRefresh: true, onRefresh: () => { measure(); render(); },
        },
      });
      transition.to(entrance, { value: 1, duration: 1, ease: "none", onUpdate: render }, 0);
      transition.to(work?.querySelectorAll("[data-work-caption]") ?? [], {
        opacity: 0, duration: .18, ease: "none",
      }, 0);
      transition.fromTo(root.querySelector(".ribbon-footer"), { opacity: 0, y: 20 }, {
        opacity: 1, y: 0, duration: .2, ease: "power2.out",
      }, .8);
      const animation = gsap.to(playhead, {
        value: images.length - 1, ease: "none", onUpdate: render,
        scrollTrigger: {
          id: "ribbon-gallery", trigger: root, start: "top top", pin: root,
          end: () => `+=${Math.max(1200, images.length * 90)}`, scrub: .65,
          anticipatePin: 1, invalidateOnRefresh: true, onRefresh: () => { measure(); render(); },
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
        root.classList.remove("is-animated", "is-transferring");
        playingVideo?.pause();
        sources.forEach((source, i) => { if (source) source.style.visibility = savedVisibility[i]; });
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
      <div ref={stage} className="ribbon-stage" aria-label="滚动画廊">
        <div className="ribbon-guides" aria-hidden="true" />
        <div className="ribbon-playhead" aria-hidden="true"><i /> <i /></div>
        <div className="ribbon-images">
          {images.map((item, i) => (
            <Link className="ribbon-card" key={item.name} href={`/work/${item.project}`} data-hover-label={projects.find((project) => project.slug === item.project)?.title ?? item.title}
              onFocus={(event) => { if (event.currentTarget.matches(":focus-visible")) jump.current(i); }} draggable={false} aria-label={`查看${item.title}`}>
              <span className="motion-image">{ /\.(mp4|webm|mov|m4v|ogv)(?:[?#]|$)/i.test(item.src)
                ? <video src={item.src} poster={projectCover(item.project)} muted loop playsInline preload="metadata" aria-label={item.title} />
                : <Image src={item.src} alt={item.title} width={item.width} height={item.height} sizes="(max-width: 809px) 65vw, 440px" draggable={false} />
              }</span>
            </Link>
          ))}
        </div>
        <div className="ribbon-footer">
          <span className="ribbon-count"><ScrambleText>{String(active + 1).padStart(2, "0")}</ScrambleText> <small><ScrambleText>/ </ScrambleText><ScrambleText>{String(images.length)}</ScrambleText></small></span>
          <div className="ribbon-title" aria-live="polite"><span><ScrambleText>▸ </ScrambleText><ScrambleText>{project.title}</ScrambleText></span><small><ScrambleText>{images[active].title}</ScrambleText></small></div>
          <div className="ribbon-actions"><button onClick={() => jump.current(active - 1)} disabled={active === 0} aria-label="上一张"><ArrowLeft size={18} /></button><button onClick={() => jump.current(active + 1)} disabled={active === images.length - 1} aria-label="下一张"><ArrowRight size={18} /></button><Link href={`/work/${project.slug}`}><ScrambleText>查看项目 </ScrambleText><ArrowUpRight size={16} /></Link></div>
        </div>
      </div>
    </section>
  );
}
