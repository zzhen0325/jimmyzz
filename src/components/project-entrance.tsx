"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { projectRevealArrival, projectRevealTiming } from "@/lib/project-reveal";

const revealSelector = [
  ".case-logo",
  ".case-navigation > *",
  ".case-intro",
  ".case-margin-label",
  ".case-facts > div",
  ".case-section-body > p",
  ".case-chapter",
  ".case-project-list .timeline-list > li",
  ".case-project-more",
].join(", ");

export function ProjectEntrance({ children, style }: { children: ReactNode; style: CSSProperties }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(() => {
    const page = root.current;
    if (!page) return;
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", (context) => {
      const seen = new WeakSet<HTMLElement>();
      const revealed = new WeakSet<HTMLElement>();
      const pending = new Set<HTMLElement>();
      let waiting = document.querySelector('.route-curtain[data-active="true"]') !== null;

      // Animate section wrappers, leaving image curvature and text hover transforms alone.
      context.add("reveal", (elements: HTMLElement[], timeline?: gsap.core.Timeline) => {
        if (!elements.length) return;
        elements.forEach(element => revealed.add(element));
        // Follow the actual gradient geometry, using the visible part of long images.
        const arrivals = timeline ? elements.map(element => {
          const bounds = element.getBoundingClientRect();
          const x = (Math.max(0, bounds.left) + Math.min(window.innerWidth, bounds.right)) / 2;
          const y = (Math.max(0, bounds.top) + Math.min(window.innerHeight, bounds.bottom)) / 2;
          return { element, progress: projectRevealArrival(x, y, window.innerWidth, window.innerHeight) };
        }).sort((a, b) => a.progress - b.progress) : [];
        const first = arrivals[0]?.progress ?? 0;
        const spread = (arrivals.at(-1)?.progress ?? 0) - first;
        const tween = gsap.to(timeline ? arrivals.map(item => item.element) : elements, {
          opacity: 1,
          y: 0,
          duration: timeline ? .4 : .6,
          stagger: timeline
            ? (index: number) => {
              const wave = spread > 0 ? (arrivals[index].progress - first) / spread : 0;
              const order = arrivals.length > 1 ? index / (arrivals.length - 1) : 0;
              // Spread neighboring elements apart while retaining the wave's order.
              return .06 + .36 * (wave * .5 + order * .5);
            }
            : { amount: Math.min(.9, (elements.length - 1) * .12) },
          ease: "power2.out",
          clearProps: "opacity,transform",
        });
        // Share the curtain's playhead so both effects finish as one reveal.
        if (timeline) timeline.add(tween, projectRevealTiming.start);
      });
      const flush = () => {
        if (waiting) return;
        // DOM order keeps text in reading order and gives each visible batch a short sequence.
        const elements = Array.from(page.querySelectorAll<HTMLElement>(revealSelector))
          .filter(element => pending.has(element));
        pending.clear();
        context.reveal(elements);
      };
      const observer = new IntersectionObserver(entries => {
        entries.forEach(({ target, isIntersecting }) => {
          if (!isIntersecting || revealed.has(target as HTMLElement)) return;
          pending.add(target as HTMLElement);
          observer.unobserve(target);
        });
        flush();
      }, { threshold: 0, rootMargin: "0px 0px -24px 0px" });

      context.add("register", () => {
        page.querySelectorAll<HTMLElement>(revealSelector).forEach(element => {
          if (seen.has(element)) return;
          seen.add(element);
          // Opacity preserves keyboard access while the route curtain hands focus to the title.
          gsap.set(element, { opacity: 0, y: 32 });
          observer.observe(element);
        });
      });
      context.register();
      const onTransition = (event: Event) => {
        waiting = (event as CustomEvent<boolean>).detail;
        flush();
      };
      const onReveal = (event: Event) => {
        const timeline = (event as CustomEvent<gsap.core.Timeline>).detail;
        // Measure at reveal time, after route scroll restoration. Do not wait for
        // IntersectionObserver delivery or for the curtain to disappear.
        const elements = Array.from(page.querySelectorAll<HTMLElement>(revealSelector))
          .filter(element => {
            if (revealed.has(element)) return false;
            const bounds = element.getBoundingClientRect();
            return bounds.bottom > 0 && bounds.top < window.innerHeight;
          });
        elements.forEach(element => {
          observer.unobserve(element);
          pending.delete(element);
        });
        context.reveal(elements, timeline);
      };
      window.addEventListener("project-transition", onTransition);
      window.addEventListener("project-transition-reveal", onReveal);
      return () => {
        observer.disconnect();
        window.removeEventListener("project-transition", onTransition);
        window.removeEventListener("project-transition-reveal", onReveal);
      };
    }, root);
    return () => media.revert();
  }, { scope: root });

  return <main ref={root} id="top" className="case-page" style={style}>{children}</main>;
}
