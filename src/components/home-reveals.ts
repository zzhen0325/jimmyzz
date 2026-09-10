"use client";

import type { RefObject } from "react";
import { SplitText } from "gsap/SplitText";
import { gsap, ScrollTrigger, useGSAP, motionConditions } from "@/lib/gsap";

gsap.registerPlugin(SplitText);

/** Animate content inside stable layout anchors; canvases own their motion. */
export function useHomeReveals(scope: RefObject<HTMLElement | null>) {
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add({ ...motionConditions, mobile: "(max-width: 809px)" }, ({ conditions }) => {
      if (conditions?.reduced || !scope.current) return;

      const mobile = conditions?.mobile;
      const hero = scope.current.querySelector<HTMLElement>(".home-hero");
      const textTargets = Array.from(scope.current.querySelectorAll<HTMLElement>(
        ".home-hero .desktop-nav a, .hero-services > *, .hero-editor-card b, .hero-editor-card small, .hero-introduction, .hero-title",
      ));
      const chrome = scope.current.querySelectorAll(".home-hero .site-wordmark, .home-hero .mobile-menu-toggle, .hero-grid, .hero-editor-card > span:first-child, .hero-editor-card > svg");
      gsap.set([...textTargets, ...chrome], { autoAlpha: 0 });
      const entrance = gsap.timeline({ paused: true });
      const splits: SplitText[] = [];
      let started = false;
      let cancelled = false;
      const startText = () => {
        if (started || cancelled) return;
        started = true;
        // Sort rendered positions, so mobile reflow also reads from top to bottom.
        textTargets.sort((a, b) => {
          const first = a.getBoundingClientRect();
          const second = b.getBoundingClientRect();
          return Math.abs(first.top - second.top) < 12 ? first.left - second.left : first.top - second.top;
        });
        entrance.to(chrome, { autoAlpha: 1, duration: 0.5, stagger: 0.04 }, 0);
        textTargets.forEach((target, index) => {
          const split = SplitText.create(target, { type: "words,chars", tag: "span", aria: "auto", wordsClass: "hero-roll-word", charsClass: "hero-roll-char" });
          splits.push(split);
          const outgoing: HTMLElement[] = [];
          const incoming: HTMLElement[] = [];
          for (const char of split.chars) {
            const first = document.createElement("span");
            first.className = "hero-roll-outgoing";
            first.textContent = char.textContent;
            const second = first.cloneNode(true) as HTMLElement;
            second.className = "hero-roll-incoming";
            char.replaceChildren(first, second);
            outgoing.push(first);
            incoming.push(second);
          }
          const at = 0.12 + index * (mobile ? 0.09 : 0.11);
          const stagger = { each: Math.min(0.035, 0.42 / Math.max(1, split.chars.length - 1)) };
          // Cucumber2 TextRoll: paired glyphs travel up, with power3.inOut and 35ms stagger.
          entrance.set(target, { autoAlpha: 1 }, at);
          entrance.fromTo(split.chars, { opacity: 0 }, { opacity: 1, duration: 0.14, stagger }, at);
          entrance.fromTo(outgoing, { yPercent: 0 }, { yPercent: -100, duration: 0.42, ease: "power3.inOut", stagger }, at);
          entrance.fromTo(incoming, { yPercent: 100 }, { yPercent: 0, duration: 0.42, ease: "power3.inOut", stagger }, at);
          entrance.call(() => {
            split.revert();
            gsap.set(target, { clearProps: "opacity,visibility" });
          }, [], at + 0.42 + stagger.each * Math.max(0, split.chars.length - 1));
        });
        if (hero) hero.dataset.textReady = "true";
        entrance.play(0);
      };
      // Typography starts as soon as its font metrics are ready, independently of the film and panels.
      void document.fonts.ready.then(startText);
      const fallback = gsap.delayedCall(1.5, startText);

      // A shared trigger establishes reading order without moving sticky anchors.
      const reveal = (trigger: Element, entries: [string, number, number][], start = "top 88%") => {
        const timeline = gsap.timeline({
          defaults: { duration: mobile ? 0.56 : 0.72, ease: "power1.inOut" },
          scrollTrigger: { trigger, start: `clamp(${start})`, once: true },
        });
        for (const [selector, at, distance] of entries) {
          const targets = trigger.querySelectorAll(selector);
          if (!targets.length) continue;
          timeline.fromTo(targets, { opacity: 0, y: distance * (mobile ? 0.65 : 1) }, {
            opacity: 1, y: 0, stagger: 0.08, clearProps: "opacity,transform",
          }, at * (mobile ? 0.7 : 1));
        }
      };

      const headings = scope.current.querySelectorAll(
        ".section-heading h2, .about-layout h2, #wave-type h2",
      );
      headings.forEach((heading) => {
        SplitText.create(heading, {
          type: "words,chars", tag: "span", aria: "auto",
          charsClass: "reveal-char", autoSplit: true,
          onSplit: (split) => gsap.fromTo(split.chars, {
            opacity: 0.12, y: 14,
          }, {
            opacity: 1, y: 0,
            stagger: { amount: 0.42 }, duration: 1, ease: "power1.in",
            scrollTrigger: {
              trigger: heading, start: "clamp(top 92%)", end: "clamp(bottom 65%)",
              scrub: 0.18, invalidateOnRefresh: true,
            },
          }),
        });
      });

      scope.current.querySelectorAll(".section-heading").forEach((heading) => {
        reveal(heading, [[":scope > p", 0.2, 28]], "top 74%");
      });
      scope.current.querySelectorAll(".work-row").forEach((row, index) => {
        reveal(row, [
          [".work-row-index", 0, 12],
          [".work-row-copy h3", 0.09, 26],
          [".work-row-media", index % 2 ? 0.3 : 0.18, index % 2 ? 48 : 34],
          [".work-row-description", index % 2 ? 0.18 : 0.34, 22],
        ]);
      });
      scope.current.querySelectorAll(".capability-list article").forEach((row) => {
        reveal(row, [["span", 0, 10], ["h3", 0.1, 22], ["p", 0.25, 30]]);
      });
      scope.current.querySelectorAll(".about-layout").forEach((about) => {
        reveal(about, [[".eyebrow", 0, 12], [".about-art", 0.16, 44],
          [".about-intro", 0.32, 24], [".contact-link", 0.44, 16]], "top 78%");
      });
      scope.current.querySelectorAll(".experience-list article").forEach((row) => {
        reveal(row, [["h3", 0, 18], ["h4", 0.14, 24], ["div > p", 0.27, 30]]);
      });
      scope.current.querySelectorAll<HTMLElement>(
        ".footer-title, .footer-details, .all-work-link",
      ).forEach((element) => {
        gsap.fromTo(element, { opacity: 0, y: 24 }, {
          opacity: 1, y: 0, duration: 0.7,
          ease: "power1.inOut", clearProps: "opacity,transform",
          scrollTrigger: { trigger: element, start: "clamp(top 90%)", once: true },
        });
      });
      return () => {
        cancelled = true;
        fallback.kill();
        splits.forEach((split) => split.revert());
        if (hero) delete hero.dataset.textReady;
      };
    }, scope);
    // Font metrics affect both the text reveals and the sticky project stack.
    let active = true;
    void document.fonts.ready.then(() => { if (active) ScrollTrigger.refresh(); });
    return () => { active = false; mm.revert(); };
  }, { scope });
}
