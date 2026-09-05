"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export { gsap, ScrollTrigger, useGSAP };
export const motionConditions = {
  always: "(min-width: 0px)",
  reduced: "(prefers-reduced-motion: reduce)",
};
export const motionTiming = { fast: 0.2, normal: 0.35, slow: 0.5, ease: "power2.out" };
