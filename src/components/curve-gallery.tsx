"use client";

import { playSound } from "@/lib/site-sound";
import { ScrambleText } from "./scramble-text";

import Link from "next/link";
import { useRef, useState, type CSSProperties } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { gsap, ScrollTrigger, useGSAP, motionConditions } from "@/lib/gsap";
import { useContent } from "./content-provider";
import Image from "next/image";
import "./ribbon-gallery.css";

export function CurveGallery() {
  const { projects, gallery: images } = useContent();
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const jump = useRef<(index: number) => void>(() => {});
  const current = useRef(0);
  const [active, setActive] = useState(0);
  const project = projects.find((item) => item.slug === images[active]?.project)!;

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(motionConditions, ({ conditions }) => {
      const root = stage.current;
      if (!root || !images.length) return;
      const cards = Array.from(root.querySelectorAll<HTMLElement>(".ribbon-card"));
      if (conditions?.reduced) {
        jump.current = (index) => {
          const clamped = Math.max(0, Math.min(images.length - 1, index));
          if (current.current !== clamped) playSound("step", { step: clamped % 6 });
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
      // Hide the entire composited cover, including reveal overlays that explicitly
      // set visibility: visible. Keep its layout box for reversible handoff.
      const setTransferred = (source: HTMLElement, transferred: boolean) => {
        source.toggleAttribute("data-work-transferred", transferred);
      };
      const layoutPosition = (element: HTMLElement) => {
        let x = 0;
        let y = 0;
        let node: HTMLElement | null = element;
        while (node) {
          x += node.offsetLeft;
          y += node.offsetTop;
          node = node.offsetParent as HTMLElement | null;
        }
        return { x, y };
      };
      let bounds: { x: number; y: number; width: number; height: number }[] = [];
      const videos = cards.map((card) => card.querySelector("video"));
      let playingVideo: HTMLVideoElement | null = null;
      let stageWidth = 0;
      let stageHeight = 0;
      let size = 0;
      const measure = () => {
        stageWidth = root.clientWidth;
        stageHeight = root.clientHeight;
        size = stageWidth <= 809 ? Math.min(stageWidth * .7, 295) : Math.min(stageWidth * .28, 385);
        // Use the pin spacer's natural position while the stage is fixed.
        // Layout offsets exclude the grid's transient scroll-skew transforms.
        const anchor = root.parentElement?.classList.contains("pin-spacer")
          ? root.parentElement : root;
        const origin = layoutPosition(anchor);
        // Measurements happen on refresh, never in the per-frame write loop.
        bounds = sources.map((source) => {
          if (!source) return { x: 0, y: 0, width: size, height: size };
          const position = layoutPosition(source);
          return { x: position.x - origin.x, y: position.y - origin.y,
            width: source.offsetWidth, height: source.offsetHeight };
        });
      };
      const smooth = (value: number) => {
        const t = gsap.utils.clamp(0, 1, value);
        return t * t * (3 - 2 * t);
      };
      const coverCount = sources.filter(Boolean).length;
      let entranceSoundStep = 0;
      let refreshingEntrance = false;
      const render = () => {
        const progress = entrance.value;
        const landing = progress >= .9999;
        root.classList.toggle("is-transferring", progress > 0 && !landing);
        const baseline = Math.max(size + 64, stageHeight * .64);
        const radiusX = stageWidth * .35;
        const radiusY = Math.min(stageHeight * .12, stageWidth * .12);
        const tilt = -18 * Math.PI / 180;
        // Lift the orbit as the first cover lands, so visible content takes over
        // before the orbit leaves the viewport. Preserve the existing stagger.
        const firstCoverTravel = progress * (1 + (coverCount - 1) * .045);
        const orbitExtentY = Math.hypot(radiusX * Math.sin(tilt), radiusY * Math.cos(tilt)) + size * .38;
        const orbitOffset = Math.max(0, stageHeight * .46 + orbitExtentY - (baseline - size) + 32)
          * smooth((firstCoverTravel - .8) / .2);
        cards.forEach((card, i) => {
          // Let the strip move during the final part of the cover handoff.
          const d = i - playhead.value;
          const focus = Math.exp(-Math.pow(d / 1.6, 2));
          const scale = .13 + .87 * focus;
          const ratio = images[i].width / images[i].height;
          const widthFactor = Math.min(1, ratio);
          const heightFactor = Math.min(1, 1 / ratio);
          const targetWidth = size * scale * (images[i].scale ?? 1) * widthFactor;
          const targetHeight = size * scale * (images[i].scale ?? 1) * heightFactor;
          const targetX = stageWidth * .5 + d * Math.max(24, stageWidth * .029)
            + Math.tanh(d * .48) * size * 1.5 - targetWidth / 2;
          const targetY = baseline - targetHeight;
          const source = sources[i];
          const from = bounds[i];
          let stackOrder = Math.round(focus * 100);
          if (source && from) {
            // A delayed playhead per cover makes a single-file procession.
            // Every cover uses the same entry point and ring, never a separate
            // radial destination. Only the pickup and final ribbon slot differ.
            const delay = .045;
            const travel = gsap.utils.clamp(0, 1, progress * (1 + (coverCount - 1) * delay) - i * delay);
            const gather = smooth(travel / .22);
            const merge = smooth((travel - .8) / .2);
            const revolution = gsap.utils.clamp(0, 1, (travel - .22) / .58);
            const angle = -Math.PI / 2 + revolution * Math.PI * 2;
            const near = (Math.sin(angle) + 1) / 2;
            const orbitX = Math.cos(angle) * radiusX;
            const orbitY = Math.sin(angle) * radiusY;
            const orbitSize = size * (.42 + near * .34);
            const orbitWidth = orbitSize * widthFactor;
            const orbitHeight = orbitSize * heightFactor;
            const ringX = stageWidth * .5 + orbitX * Math.cos(tilt) - orbitY * Math.sin(tilt) - orbitWidth / 2;
            const ringY = stageHeight * .46 - orbitOffset + orbitX * Math.sin(tilt) + orbitY * Math.cos(tilt) - orbitHeight / 2;
            const gatheredX = from.x + (ringX - from.x) * gather;
            const gatheredY = from.y + (ringY - from.y) * gather;
            const gatheredWidth = from.width + (orbitWidth - from.width) * gather;
            const gatheredHeight = from.height + (orbitHeight - from.height) * gather;
            const x = gatheredX + (targetX - gatheredX) * merge;
            const y = gatheredY + (targetY - gatheredY) * merge;
            card.style.width = `${gatheredWidth + (targetWidth - gatheredWidth) * merge}px`;
            card.style.height = `${gatheredHeight + (targetHeight - gatheredHeight) * merge}px`;
            card.style.transform = `translate3d(${x}px, ${y}px, 0)`;
            stackOrder = Math.round((20 + near * 80) * (1 - merge) + focus * 100 * merge);
            setTransferred(source, travel > 0);
            card.style.visibility = travel > 0 && (!landing || (targetX >= -size && targetX <= stageWidth + size)) ? "visible" : "hidden";
            card.style.opacity = "1";
          } else {
            // Use the same box geometry through landing and strip navigation.
            card.style.width = `${targetWidth}px`;
            card.style.height = `${targetHeight}px`;
            card.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
            card.style.visibility = targetX < -size || targetX > stageWidth + size ? "hidden" : "visible";
            card.style.opacity = source ? "1" : String(gsap.utils.clamp(0, 1, (progress - .88) / .12));
          }
          card.style.zIndex = String(stackOrder);
        });
        const index = Math.max(0, Math.min(images.length - 1, Math.round(playhead.value)));
        const nextVideo = landing ? videos[index] : null;
        if (nextVideo !== playingVideo) {
          playingVideo?.pause();
          playingVideo = nextVideo;
          if (playingVideo) void playingVideo.play().catch(() => {});
        }
        if (index !== current.current) {
          if (landing) playSound("step", { step: index % 6 });
          current.current = index; setActive(index);
        }
      };
      measure();
      const transition = gsap.timeline({
        scrollTrigger: {
          // Leave another 35vh to view the final covers before pickup, and move
          // the end by the same distance to preserve the transition's pace.
          id: "grid-to-ribbon", trigger: root, start: "top 65%", end: () => `top top-=${window.innerHeight * 1.95}`, scrub: true,
          invalidateOnRefresh: true,
          onRefreshInit: () => { refreshingEntrance = true; },
          onRefresh: () => {
            measure(); render();
            entranceSoundStep = Math.floor(entrance.value * 12);
            refreshingEntrance = false;
          },
        },
      });
      transition.to(entrance, {
        value: 1, duration: 1, ease: "none",
        onUpdate: () => {
          // Sound each crossed interval in either direction through pickup and orbit.
          const step = Math.floor(entrance.value * 12);
          if (coverCount > 0 && step !== entranceSoundStep && !refreshingEntrance) {
            const crossedStep = Math.max(step, entranceSoundStep) - 1;
            playSound("step", { step: crossedStep % 6 });
          }
          entranceSoundStep = step;
          render();
        },
      }, 0);
      transition.to(work?.querySelectorAll("[data-work-caption]") ?? [], {
        opacity: 0, duration: .18, stagger: { each: .025, from: "end" }, ease: "none",
      }, 0);
      transition.fromTo(root.querySelector(".ribbon-footer"), { opacity: 0, y: 20 }, {
        opacity: 1, y: 0, duration: .2, ease: "power2.out",
      }, .8);
      const animation = gsap.to(playhead, {
        value: images.length - 1, ease: "none", onUpdate: render,
        scrollTrigger: {
          // Overlap the landing, and use the viewport's spring smoothing throughout.
          // A second scrub delay here made the strip appear to stop and restart.
          id: "ribbon-gallery", trigger: root, start: () => transition.scrollTrigger!.end - window.innerHeight * .12,
          end: () => `+=${Math.max(1200, images.length * 90) + window.innerHeight * .12}`, scrub: true,
          invalidateOnRefresh: true, onRefresh: () => { measure(); render(); },
        },
      });
      const trigger = animation.scrollTrigger!;
      ScrollTrigger.create({
        id: "ribbon-pin", trigger: root, start: "top top", pin: root,
        end: () => trigger.end, anticipatePin: 1,
        onRefresh: () => { measure(); render(); },
      });
      jump.current = (index) => {
        const clamped = Math.max(0, Math.min(images.length - 1, index));
        // Native scrolling also keeps the spring controller and pinned timeline in sync.
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
        sources.forEach((source) => { if (source) setTransferred(source, false); });
        root.removeEventListener("pointerdown", down);
        root.removeEventListener("pointermove", move);
        root.removeEventListener("click", click, true);
        cards.forEach((card) => {
          ["width", "height", "transform", "visibility", "opacity", "z-index"].forEach((property) => card.style.removeProperty(property));
        });
        jump.current = () => {};
      };
    });
    return () => mm.revert();
  }, { scope: section });

  if (!images.length) return null;
  return (
    <section id="gallery" ref={section} className="ribbon-section" aria-label="视觉漫游">
      <div ref={stage} className="ribbon-stage" aria-label="滚动画廊">
        <div className="ribbon-guides" aria-hidden="true" />
        <div className="ribbon-playhead" aria-hidden="true"><i /> <i /></div>
        <div className="ribbon-images">
          {images.map((item, i) => (
            <Link className="ribbon-card" style={{ "--cover-ratio": `${item.width} / ${item.height}` } as CSSProperties} key={item.name} href={`/work/${item.project}`} data-hover-label={projects.find((project) => project.slug === item.project)?.title ?? item.title}
              onFocus={(event) => { if (event.currentTarget.matches(":focus-visible")) jump.current(i); }} draggable={false} aria-label={`查看${item.title}`}>
              <span className="motion-image">{ /\.(mp4|webm|mov|m4v|ogv)(?:[?#]|$)/i.test(item.src)
                ? <video src={item.src} poster={projects.find(p => p.slug === item.project)?.thumbnail} muted loop playsInline preload="none" aria-label={item.title} />
                : <Image src={item.src} alt={item.title} width={item.width} height={item.height} sizes="(max-width: 809px) 70vw, 440px" draggable={false} />
              }</span>
            </Link>
          ))}
        </div>
        <div className="ribbon-footer">
          <span className="ribbon-count"><ScrambleText>{String(active + 1).padStart(2, "0")}</ScrambleText> <small><ScrambleText>/ </ScrambleText><ScrambleText>{String(images.length)}</ScrambleText></small></span>
          <div className="ribbon-title" aria-live="polite"><span><ScrambleText>▸ </ScrambleText><ScrambleText>{project?.title}</ScrambleText></span><small><ScrambleText>{images[active].title}</ScrambleText></small></div>
          <div className="ribbon-actions"><button onClick={() => jump.current(active - 1)} disabled={active === 0} aria-label="上一张"><ArrowLeft size={18} /></button><button onClick={() => jump.current(active + 1)} disabled={active === images.length - 1} aria-label="下一张"><ArrowRight size={18} /></button><Link href={`/work/${project.slug}`}><ScrambleText>查看项目 </ScrambleText><ArrowUpRight size={16} /></Link></div>
        </div>
      </div>
    </section>
  );
}
