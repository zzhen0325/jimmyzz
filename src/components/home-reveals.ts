"use client";

import type { RefObject } from "react";
import { SplitText } from "gsap/SplitText";
import { gsap, ScrollTrigger, useGSAP, motionConditions } from "@/lib/gsap";

gsap.registerPlugin(SplitText);

/** Scope reveals to editorial content; sticky cards and canvases own their motion. */
export function useHomeReveals(scope: RefObject<HTMLElement | null>) {
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(motionConditions, ({ conditions }) => {
      if (conditions?.reduced || !scope.current) return;

      gsap.fromTo(".hero-title", {
        opacity: 0, "--hero-entry-y": "32px", filter: "blur(12px)",
      }, {
        opacity: 1, "--hero-entry-y": "0px", filter: "blur(0px)", duration: 1.3,
        ease: "power3.out", clearProps: "opacity,--hero-entry-y,filter",
      });
      gsap.from(".hero-services, .hero-profile, .hero-record", {
        opacity: 0, "--hero-entry-y": "12px", duration: 0.9, stagger: 0.12,
        delay: 0.2, ease: "power3.out", clearProps: "opacity,--hero-entry-y",
      });

      const headings = scope.current.querySelectorAll(
        ".section-heading h2, .about-layout h2, #wave-type h2",
      );
      headings.forEach((heading) => {
        SplitText.create(heading, {
          type: "words,chars", tag: "span", aria: "auto",
          charsClass: "reveal-char", autoSplit: true,
          onSplit: (split) => gsap.fromTo(split.chars, {
            opacity: 0.12, filter: "blur(7px)", y: 9,
          }, {
            opacity: 1, filter: "blur(0px)", y: 0,
            stagger: { amount: 0.65 }, duration: 1, ease: "none",
            scrollTrigger: {
              trigger: heading, start: "clamp(top 92%)", end: "clamp(bottom 57%)",
              scrub: 0.45, invalidateOnRefresh: true,
            },
          }),
        });
      });

      scope.current.querySelectorAll<HTMLElement>(
        ".section-heading > p, .capability-list article, .about-intro, .experience-list article, .footer-title, .footer-details",
      ).forEach((element) => {
        gsap.fromTo(element, { opacity: 0, y: 20, filter: "blur(5px)" }, {
          opacity: 1, y: 0, filter: "blur(0px)", duration: 0.85,
          ease: "power2.out", clearProps: "opacity,transform,filter",
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
