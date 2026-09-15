"use client";

import type { RefObject } from "react";
import { SplitText } from "gsap/SplitText";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { gsap, ScrollTrigger, useGSAP, motionConditions } from "@/lib/gsap";

gsap.registerPlugin(SplitText, ScrambleTextPlugin);

/** Animate content inside stable layout anchors; canvases own their motion. */
export function useHomeReveals(scope: RefObject<HTMLElement | null>) {
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add({ ...motionConditions, mobile: "(max-width: 809px)" }, ({ conditions }) => {
      if (conditions?.reduced || !scope.current) return;

      const mobile = conditions?.mobile;
      const imageStrip = scope.current.querySelector(".intro-image-strip");
      const imageCards = scope.current.querySelectorAll(".intro-image-card");
      if (imageStrip && imageCards.length) {
        const proxy = { skew: 0 };
        const clamp = gsap.utils.clamp(mobile ? -6 : -12, mobile ? 6 : 12);
        gsap.set(imageCards, { skewY: 0, transformOrigin: "right center", force3D: true });
        const setSkew = gsap.quickSetter(imageCards, "skewY", "deg");
        const settle = gsap.to(proxy, {
          skew: 0, duration: 0.8, ease: "power3.out", paused: true,
          onUpdate: () => setSkew(proxy.skew),
        });
        ScrollTrigger.create({
          trigger: imageStrip, start: "top bottom", end: "bottom top",
          onUpdate: (self) => {
            if (!self.isActive) return;
            const skew = clamp(self.getVelocity() / -300);
            if (Math.abs(skew) > Math.abs(proxy.skew) || skew * proxy.skew < 0) {
              proxy.skew = skew;
              setSkew(skew);
              settle.invalidate().restart();
            }
          },
        });
      }
      scope.current.querySelectorAll<HTMLElement>(".intro-image-slot").forEach((slot) => {
        gsap.fromTo(slot.querySelector(".intro-image-card"), {
          x: () => window.innerWidth,
        }, {
          x: 0, ease: "none",
          scrollTrigger: {
            trigger: slot, start: "clamp(top 95%)", end: "clamp(top 45%)",
            scrub: 0.45, invalidateOnRefresh: true,
          },
        });
      });
      scope.current.querySelectorAll<HTMLElement>("[data-profile-reveal]").forEach((text) => {
        SplitText.create(text, {
          type: "words", tag: "span", aria: "auto", autoSplit: true,
          wordsClass: "profile-word",
          onSplit: (split) => {
            const timeline = gsap.timeline({
              scrollTrigger: {
                trigger: text,
                start: "clamp(top bottom)",
                end: "clamp(bottom top)",
                toggleActions: "restart reset restart reset",
              },
            });
            split.words.forEach((word, index) => {
              const original = word.textContent ?? "";
              // Keep natural font-responsive spacing across refreshes and replays.
              // Scrambled glyphs stay inside their word instead of overlapping neighbors.
              const measure = document.createElement("span");
              measure.className = "profile-word-measure";
              measure.textContent = original;
              const animated = document.createElement("span");
              animated.className = "profile-word-animation";
              animated.textContent = original;
              word.replaceChildren(measure, animated);
              timeline.fromTo(animated, { opacity: 0 }, {
                opacity: 1, duration: 0.16,
              }, index * 0.028);
              timeline.to(animated, {
                duration: 0.75,
                scrambleText: { text: original, chars: original, revealDelay: 0.12, speed: 0.35 },
              }, index * 0.028);
            });
            return timeline;
          },
        });
      });
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
        ".section-heading h2, .about-layout h2",
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
      scope.current.querySelectorAll<HTMLElement>("[data-capability-reveal]").forEach((text) => {
        const original = text.textContent ?? "";
        gsap.fromTo(text, { opacity: 0 }, {
          opacity: 1, duration: 0.9,
          scrambleText: { text: original, chars: "品牌创意设计体验工具系统01/+#", revealDelay: 0.1, speed: 0.4 },
          scrollTrigger: { trigger: text.closest("article"), start: "clamp(top 90%)", once: true },
        });
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
    }, scope);
    // Font metrics affect both the text reveals and the sticky project stack.
    let active = true;
    void document.fonts.ready.then(() => { if (active) ScrollTrigger.refresh(); });
    return () => { active = false; mm.revert(); };
  }, { scope });
}
