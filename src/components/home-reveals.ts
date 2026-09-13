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
    }, scope);
    // Font metrics affect both the text reveals and the sticky project stack.
    let active = true;
    void document.fonts.ready.then(() => { if (active) ScrollTrigger.refresh(); });
    return () => { active = false; mm.revert(); };
  }, { scope });
}
