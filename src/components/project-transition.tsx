"use client";

import { useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { projectRevealFrame } from "@/lib/project-reveal";
import { playSound } from "@/lib/site-sound";
import { gsap, useGSAP } from "@/lib/gsap";

export function ProjectTransition() {
  const root = useRef<HTMLDivElement>(null);
  const pending = useRef<string | null>(null);
  const animation = useRef<gsap.core.Timeline | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const finish = useCallback(() => {
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = null;
    pending.current = null;
    if (root.current) {
      root.current.dataset.active = "false";
      root.current.style.removeProperty("background-size");
      root.current.style.removeProperty("background-position");
    }
    window.dispatchEvent(new CustomEvent("project-transition", { detail: false }));
  }, []);

  useGSAP((_context, contextSafe) => {
    const curtain = root.current!;
    const click = contextSafe!((event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || link.download || (link.target && link.target !== "_self")) return;
      const url = new URL(link.href, window.location.href);
      const fromProject = window.location.pathname.startsWith("/work/");
      const toProject = url.pathname.startsWith("/work/");
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      if (!(toProject && (window.location.pathname === "/" || fromProject)) && !(fromProject && url.pathname === "/")) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      event.preventDefault();
      if (pending.current) return;
      pending.current = url.pathname;
      playSound("transition", { delay: .12 });
      curtain.dataset.active = "true";
      window.dispatchEvent(new CustomEvent("project-transition", { detail: true }));
      const href = url.pathname + url.search + url.hash;
      router.prefetch(href);
      animation.current?.kill();
      // Reverse the cover reveal until every pixel is white before navigating.
      gsap.set(curtain, projectRevealFrame(window.innerWidth, window.innerHeight, true));
      animation.current = gsap.timeline()
        .to(curtain, {
          ...projectRevealFrame(window.innerWidth, window.innerHeight, false),
          duration: .8,
          ease: "power2.in",
        })
        .call(() => router.push(href));
      // Failed or interrupted navigation must never leave an opaque, locked page.
      timeout.current = setTimeout(() => {
        animation.current?.kill();
        gsap.killTweensOf(curtain);
        finish();
      }, 10000);
    });
    document.addEventListener("click", click, true);
    return () => { document.removeEventListener("click", click, true); animation.current?.kill(); finish(); };
  }, { scope: root, dependencies: [router, finish] });

  useGSAP(() => {
    if (!pending.current || !root.current) return;
    // A committed route (including browser-history interruption) can be revealed.
    const curtain = root.current;
    animation.current?.kill();
    animation.current = gsap.timeline({ onComplete: () => {
      finish();
      const heading = document.querySelector<HTMLElement>(".case-intro h1");
      if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
    } })
      .fromTo(curtain,
        projectRevealFrame(window.innerWidth, window.innerHeight, false),
        { ...projectRevealFrame(window.innerWidth, window.innerHeight, true), duration: 1.25, ease: "none" },
        .08,
      );
  }, { scope: root, dependencies: [pathname, finish], revertOnUpdate: false });

  return <div ref={root} className="route-curtain" data-active="false" aria-hidden="true" />;
}
