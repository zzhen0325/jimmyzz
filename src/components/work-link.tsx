"use client";

import Link from "next/link";
import { type ReactNode, useRef } from "react";
import { gsap, motionConditions, useGSAP } from "@/lib/gsap";

export function WorkLink({ href, className, children, expand = false }: {
  href: string; className: string; children: ReactNode; expand?: boolean;
}) {
  const scope = useRef<HTMLAnchorElement>(null);
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add({ ...motionConditions, desktop: "(min-width: 810px) and (hover: hover)" }, ({ conditions }) => {
      const link = scope.current!;
      const video = link.querySelector("video")!;
      const preview = link.querySelector<HTMLElement>("[data-work-preview]");
      const shade = link.querySelector("[data-work-shade]");
      const timeline = gsap.timeline({ paused: true, defaults: { duration: conditions?.reduced ? 0 : 0.5, ease: "power2.out" } });
      if (expand && conditions?.desktop && preview) {
        timeline.to(video, {
          width: () => link.clientWidth, height: () => link.clientHeight,
          x: () => -preview.offsetLeft, y: () => -preview.offsetTop,
        }, 0);
        if (shade) timeline.to(shade, { opacity: 1 }, 0);
      } else if (!expand) {
        timeline.to(video, { scale: conditions?.reduced ? 1 : 1.05, opacity: 0.75 }, 0);
      }
      const enter = () => { timeline.play(); };
      const leave = () => { timeline.reverse(); };
      const resize = () => { timeline.pause(0).invalidate(); };
      link.addEventListener("pointerenter", enter); link.addEventListener("pointerleave", leave);
      link.addEventListener("focus", enter); link.addEventListener("blur", leave);
      window.addEventListener("resize", resize);
      return () => {
        link.removeEventListener("pointerenter", enter); link.removeEventListener("pointerleave", leave);
        link.removeEventListener("focus", enter); link.removeEventListener("blur", leave);
        window.removeEventListener("resize", resize);
      };
    }, scope);
    return () => mm.revert();
  }, { scope, dependencies: [expand], revertOnUpdate: true });
  return <Link ref={scope} href={href} className={className}>{children}</Link>;
}
