"use client";

import { playSound } from "@/lib/site-sound";
import { useRef, useState, type CSSProperties } from "react";
import { gsap, ScrollTrigger, useGSAP, motionConditions } from "@/lib/gsap";
import { useContent } from "./content-provider";
import { homeCoverSource } from "@/lib/home-cover";
import Image from "./content-image";
import "./ribbon-gallery.css";

export function CurveGallery() {
  const { gallery: images, projects } = useContent();
  const projectsBySlug = new Map(projects.map(project => [project.slug, project]));
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const progressInput = useRef<HTMLInputElement>(null);
  const jump = useRef<(index: number, focusCard?: boolean) => void>(() => {});
  const current = useRef(0);
  const [active, setActive] = useState(0);
  const activeIndex = Math.min(active, Math.max(0, images.length - 1));

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(motionConditions, ({ conditions }) => {
      const root = stage.current;
      if (!root || !images.length) return;
      const cards = Array.from(root.querySelectorAll<HTMLElement>(".ribbon-card"));
      const ticks = Array.from(root.querySelectorAll<HTMLElement>(".ribbon-progress > span"));
      let seeking = false;
      const updateProgress = (value: number) => {
        if (!seeking && progressInput.current) progressInput.current.value = String(value);
        const position = value / Math.max(1, images.length - 1) * (ticks.length - 1);
        ticks.forEach((tick, index) => {
          tick.style.opacity = String(.18 + .5 * Math.max(0, 1 - Math.abs(index - position) / 1.5));
        });
      };
      if (conditions?.reduced) {
        const videos = Array.from(root.querySelectorAll('video'));
        videos.forEach(video => { void video.play().catch(() => {}); });
        jump.current = (index, focusCard = true) => {
          const clamped = Math.round(Math.max(0, Math.min(images.length - 1, index)));
          updateProgress(clamped);
          if (current.current !== clamped) playSound("step", { step: clamped % 6 });
          current.current = clamped; setActive(clamped);
          if (focusCard) cards[clamped]?.focus();
        };
        return () => { videos.forEach(video => video.pause()); jump.current = () => {}; };
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
      const playingVideos = new Set<HTMLVideoElement>();
      let stageVisible = false;
      let stageWidth = 0;
      let stageHeight = 0;
      let size = 0;
      let focusHeight = 0;
      let focusWidth = 0;
      const measure = () => {
        stageWidth = root.clientWidth;
        stageHeight = root.clientHeight;
        // Shrink the landed images without changing the stage or scroll distance.
        const imageScale = .85;
        focusHeight = stageHeight * .7 * imageScale;
        focusWidth = stageWidth * (stageWidth <= 809 ? .84 : .56) * imageScale;
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
      let coverOrdinal = 0;
      const coverOrdinals = sources.map(source => source ? coverOrdinal++ : -1);
      // The first independent artwork takes the center when the covers land.
      const firstIndependent = images.findIndex(image => !image.sourceProject);
      const landingIndex = firstIndependent < 0 ? Math.max(0, images.length - 1) : firstIndependent;
      const mergeScrollStart = .6;
      const galleryPosition = () => landingIndex * smooth((entrance.value - mergeScrollStart) / (1 - mergeScrollStart)) + playhead.value;
      let entranceSoundStep = 0;
      let refreshingEntrance = false;
      const render = () => {
        const position = galleryPosition();
        updateProgress(position);
        const progress = entrance.value;
        const landing = progress >= .9999;
        root.classList.toggle("is-transferring", progress > 0 && !landing);
        const baseline = stageHeight * .82;
        const radiusX = stageWidth * .35;
        const radiusY = Math.min(stageHeight * .12, stageWidth * .12);
        const tilt = -18 * Math.PI / 180;
        // Lift the orbit as the first cover lands, so visible content takes over
        // before the orbit leaves the viewport. Preserve the existing stagger.
        const firstCoverTravel = progress * (1 + (coverCount - 1) * .045);
        const orbitExtentY = Math.hypot(radiusX * Math.sin(tilt), radiusY * Math.cos(tilt)) + size * .38;
        const orbitOffset = Math.max(0, stageHeight * .46 + orbitExtentY - (baseline - size) + 32)
          * smooth((firstCoverTravel - .8) / .2);
        // Keep the handoff compact, then expand with the final scroll segment.
        const expansion = smooth((progress - .86) / .14);
        const gap = stageWidth <= 809 ? 8 : 12;
        let stripWidth = 0;
        const frames = images.map((image, i) => {
          const d = i - position;
          const focus = Math.exp(-Math.pow(d / 1.6, 2));
          const scale = .13 + .87 * focus;
          const ratio = image.width / image.height;
          const compactWidth = size * Math.min(1, ratio);
          const compactHeight = size * Math.min(1, 1 / ratio);
          const width = (compactWidth + (Math.min(focusHeight * ratio, focusWidth) - compactWidth) * expansion) * scale;
          const height = (compactHeight + (focusHeight - compactHeight) * expansion) * scale;
          const center = stripWidth + width / 2;
          stripWidth += width + gap;
          return { width, height, center, focus, ratio };
        });
        // Interpolate the anchor between neighboring centers for continuous scrolling.
        // Accumulated widths preserve the gap even while both cards change size.
        const anchorIndex = Math.max(0, Math.min(frames.length - 1, Math.floor(position)));
        const nextAnchor = Math.min(frames.length - 1, anchorIndex + 1);
        const anchor = frames[anchorIndex].center
          + (frames[nextAnchor].center - frames[anchorIndex].center) * (position - anchorIndex);
        cards.forEach((card, i) => {
          const { width: targetWidth, height: targetHeight, center, focus, ratio } = frames[i];
          const widthFactor = Math.min(1, ratio);
          const heightFactor = Math.min(1, 1 / ratio);
          const targetX = stageWidth * .5 + center - anchor - targetWidth / 2;
          const targetY = baseline - targetHeight;
          const source = sources[i];
          const from = bounds[i];
          let stackOrder = Math.round(focus * 100);
          if (source && from) {
            // A delayed playhead per cover makes a single-file procession.
            // Every cover uses the same entry point and ring, never a separate
            // radial destination. Only the pickup and final ribbon slot differ.
            const delay = .045;
            const travel = gsap.utils.clamp(0, 1, progress * (1 + (coverCount - 1) * delay) - coverOrdinals[i] * delay);
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
            card.style.visibility = travel > 0 && (!landing || (targetX + targetWidth >= 0 && targetX <= stageWidth)) ? "visible" : "hidden";
            card.style.opacity = "1";
          } else {
            // Use the same box geometry through landing and strip navigation.
            card.style.width = `${targetWidth}px`;
            card.style.height = `${targetHeight}px`;
            card.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
            card.style.visibility = targetX + targetWidth < 0 || targetX > stageWidth ? "hidden" : "visible";
            card.style.opacity = source ? "1" : String(gsap.utils.clamp(0, 1, (progress - .88) / .12));
          }
          card.style.zIndex = String(stackOrder);
        });
        const index = Math.max(0, Math.min(images.length - 1, Math.round(position)));
        videos.forEach((video, videoIndex) => {
          if (!video) return;
          const shouldPlay = landing && stageVisible && !document.hidden
            && cards[videoIndex].style.visibility === "visible";
          if (shouldPlay && !playingVideos.has(video)) {
            playingVideos.add(video);
            void video.play().catch(() => { playingVideos.delete(video); });
          } else if (!shouldPlay) {
            playingVideos.delete(video);
            video.pause();
          }
        });
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
        value: images.length - 1 - landingIndex, ease: "none", onUpdate: render,
        scrollTrigger: {
          // Continue from the landing position without replaying the project covers.
          id: "ribbon-gallery", trigger: root, start: () => transition.scrollTrigger!.end,
          end: () => `+=${Math.max(1200, (images.length - landingIndex) * 90)}`, scrub: true,
          invalidateOnRefresh: true, onRefresh: () => { measure(); render(); },
        },
      });
      const trigger = animation.scrollTrigger!;
      ScrollTrigger.create({
        id: "ribbon-pin", trigger: root, start: "top top", pin: root,
        end: () => trigger.end, anticipatePin: 1,
        onRefresh: () => { measure(); render(); },
      });
      const scrollPosition = { value: window.scrollY };
      const seekTo = gsap.quickTo(scrollPosition, "value", {
        duration: .24, ease: "power2.out",
        onUpdate: () => {
          window.scrollTo({ top: scrollPosition.value, behavior: "instant" });
          ScrollTrigger.update();
        },
        onComplete: () => { seeking = false; updateProgress(galleryPosition()); },
      });
      const stopSeeking = () => { seekTo.tween.pause(); seeking = false; };
      window.addEventListener("wheel", stopSeeking, { passive: true });
      window.addEventListener("pointerdown", stopSeeking, { passive: true });
      window.addEventListener("blur", stopSeeking);
      ScrollTrigger.addEventListener("refreshInit", stopSeeking);
      jump.current = (index) => {
        const clamped = Math.max(0, Math.min(images.length - 1, index));
        const entranceTrigger = transition.scrollTrigger!;
        // Invert smoothstep so earlier covers remain reachable on the progress bar.
        const fraction = Math.min(1, clamped / Math.max(1, landingIndex));
        const mergeProgress = .5 - Math.sin(Math.asin(1 - 2 * fraction) / 3);
        const destination = clamped < landingIndex
          ? entranceTrigger.start + (mergeScrollStart + (1 - mergeScrollStart) * mergeProgress) * (entranceTrigger.end - entranceTrigger.start)
          : trigger.start + ((clamped - landingIndex) / Math.max(1, images.length - 1 - landingIndex)) * (trigger.end - trigger.start);
        // Reuse one tween for rapid input; preserve native scroll / pin synchronization.
        seeking = true;
        seekTo(destination, window.scrollY);
      };
      let startX = 0;
      let startY = 0;
      let startScroll = 0;
      let dragged = false;
      let pointerId: number | null = null;
      const finish = () => {
        const captured = pointerId;
        pointerId = null;
        delete root.dataset.pointerDragging;
        if (captured !== null && root.hasPointerCapture(captured)) root.releasePointerCapture(captured);
      };
      const cancel = () => { finish(); dragged = false; };
      const down = (event: PointerEvent) => {
        if (event.button !== 0 || pointerId !== null) return;
        dragged = false;
        if ((event.target as HTMLElement).closest(".ribbon-footer")) return;
        pointerId = event.pointerId;
        startX = event.clientX; startY = event.clientY; startScroll = window.scrollY; dragged = false;
      };
      const move = (event: PointerEvent) => {
        if (event.pointerId !== pointerId) return;
        if (!event.buttons && event.pointerType !== "touch") return cancel();
        const delta = startX - event.clientX;
        if (Math.abs(delta) < 10 || Math.abs(delta) < Math.abs(startY - event.clientY)) return;
        dragged = true;
        root.dataset.pointerDragging = "";
        if (!root.hasPointerCapture(event.pointerId)) root.setPointerCapture(event.pointerId);
        window.scrollTo({ top: Math.max(transition.scrollTrigger!.start + mergeScrollStart * (transition.scrollTrigger!.end - transition.scrollTrigger!.start), Math.min(trigger.end, startScroll + delta * 3)), behavior: "instant" });
      };
      const up = (event: PointerEvent) => { if (event.pointerId === pointerId) finish(); };
      const cancelPointer = (event: PointerEvent) => { if (event.pointerId === pointerId) cancel(); };
      const visibility = () => { if (document.hidden) cancel(); render(); };
      const videoObserver = new IntersectionObserver(([entry]) => {
        stageVisible = entry.isIntersecting;
        render();
      });
      videoObserver.observe(root);
      const retryPlayback = () => render();
      root.addEventListener("pointerup", retryPlayback);
      videos.forEach(video => video?.addEventListener("loadeddata", retryPlayback));
      const preventNativeDrag = (event: DragEvent) => event.preventDefault();
      const click = (event: MouseEvent) => {
        if (dragged) { event.preventDefault(); event.stopPropagation(); dragged = false; }
      };
      root.addEventListener("pointerdown", down);
      root.addEventListener("pointermove", move);
      root.addEventListener("dragstart", preventNativeDrag);
      root.addEventListener("lostpointercapture", cancelPointer);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", cancelPointer);
      window.addEventListener("blur", cancel);
      document.addEventListener("visibilitychange", visibility);
      root.addEventListener("click", click, true);
      render();
      return () => {
        seekTo.tween.kill();
        window.removeEventListener("wheel", stopSeeking);
        window.removeEventListener("pointerdown", stopSeeking);
        window.removeEventListener("blur", stopSeeking);
        ScrollTrigger.removeEventListener("refreshInit", stopSeeking);
        cancel();
        root.classList.remove("is-animated", "is-transferring");
        videoObserver.disconnect();
        root.removeEventListener("pointerup", retryPlayback);
        videos.forEach(video => {
          video?.removeEventListener("loadeddata", retryPlayback);
          video?.pause();
        });
        playingVideos.clear();
        sources.forEach((source) => { if (source) setTransferred(source, false); });
        root.removeEventListener("pointerdown", down);
        root.removeEventListener("pointermove", move);
        root.removeEventListener("dragstart", preventNativeDrag);
        root.removeEventListener("lostpointercapture", cancelPointer);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", cancelPointer);
        window.removeEventListener("blur", cancel);
        document.removeEventListener("visibilitychange", visibility);
        root.removeEventListener("click", click, true);
        cards.forEach((card) => {
          ["width", "height", "transform", "visibility", "opacity", "z-index"].forEach((property) => card.style.removeProperty(property));
        });
        jump.current = () => {};
      };
    });
    return () => mm.revert();
  }, { scope: section, dependencies: [images, projects], revertOnUpdate: true });

  if (!images.length) return null;
  return (
    <section id="gallery" ref={section} className="ribbon-section" aria-label="视觉漫游">
      <div ref={stage} className="ribbon-stage" aria-label="滚动画廊">
        <div className="ribbon-guides" aria-hidden="true" />
        <div className="ribbon-playhead" aria-hidden="true"><i /> <i /></div>
        <div className="ribbon-images">
          {images.map((item, i) => {
            const project = projectsBySlug.get(item.sourceProject || "");
            const cover = homeCoverSource(item.src, project);
            const isVideo = /\.(mp4|webm|mov|m4v|ogv)(?:[?#]|$)/i.test(item.src);
            const videoSrc = isVideo ? item.src : project?.hoverVideo;
            return (
            <div tabIndex={0} className="ribbon-card" style={{ "--cover-ratio": `${item.width} / ${item.height}` } as CSSProperties} key={item.name} data-hover-label={item.title}
              onFocus={(event) => { if (event.currentTarget.matches(":focus-visible")) jump.current(i); }} draggable={false} aria-label={item.title}>
              <span className="motion-image">{ videoSrc
                ? <video src={videoSrc} poster={isVideo ? undefined : cover} preload="metadata" muted loop playsInline aria-label={item.title} />
                : <Image unoptimized={cover !== item.src} src={cover} alt={item.title} width={item.width} height={item.height} sizes="(max-width: 809px) 72vw, 48vw" draggable={false} />
              }</span>
            </div>
          ); })}
        </div>
        <div className="ribbon-footer">
          <div className="ribbon-progress">
            {Array.from({ length: 24 }, (_, index) => (
              <span key={index} aria-hidden="true" />
            ))}
            <input ref={progressInput} className="ribbon-progress-input" type="range" min={0} max={Math.max(0, images.length - 1)}
              step="any" defaultValue={0} disabled={images.length < 2} aria-label="拖动画廊进度"
              aria-valuetext={`第 ${activeIndex + 1} 张，共 ${images.length} 张`}
              onKeyDown={(event) => {
                const direction = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 }[event.key];
                if (direction !== undefined) {
                  event.preventDefault();
                  jump.current(Math.round(Number(event.currentTarget.value)) + direction, false);
                }
              }}
              onChange={(event) => {
                const index = Number(event.currentTarget.value);
                jump.current(index, false);
              }} />
          </div>
        </div>
      </div>
    </section>
  );
}
