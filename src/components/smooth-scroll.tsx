"use client";

import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";

export function SmoothScroll() {
  const pathname = usePathname();
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const lenis = new Lenis({ lerp: 0.085, smoothWheel: true, syncTouch: false });
      const onGameChange = (event: Event) => {
        if ((event as CustomEvent<boolean>).detail) lenis.stop();
        else lenis.start();
      };
      window.addEventListener("hero-game-change", onGameChange);
      window.addEventListener("project-transition", onGameChange);
      const tick = (time: number) => lenis.raf(time * 1000);
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(tick);
      return () => {
        window.removeEventListener("hero-game-change", onGameChange);
        window.removeEventListener("project-transition", onGameChange);
        gsap.ticker.remove(tick);
        lenis.off("scroll", ScrollTrigger.update);
        lenis.destroy();
      };
    });
    return () => mm.revert();
  }, []);
  useGSAP(() => {
    const refresh = gsap.delayedCall(0, () => ScrollTrigger.refresh());
    let mounted = true;
    void document.fonts.ready.then(() => { if (mounted) ScrollTrigger.refresh(); });
    return () => { mounted = false; refresh.kill(); };
  }, [pathname]);
  return null;
}
