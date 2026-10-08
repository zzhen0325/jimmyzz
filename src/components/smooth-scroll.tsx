"use client";

import { createInertialScroll } from "@/lib/inertial-scroll";
import { usePathname } from "next/navigation";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";

export function SmoothScroll() {
  const pathname = usePathname();
  useGSAP(() => {
    if (pathname.startsWith("/admin")) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", createInertialScroll);
    return () => mm.revert();
  }, { dependencies: [pathname], revertOnUpdate: true });
  useGSAP(() => {
    const refresh = gsap.delayedCall(0, () => ScrollTrigger.refresh());
    let mounted = true;
    void document.fonts.ready.then(() => { if (mounted) ScrollTrigger.refresh(); });
    return () => { mounted = false; refresh.kill(); };
  }, [pathname]);
  return null;
}
