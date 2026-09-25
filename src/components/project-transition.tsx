"use client";

import { useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
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
    if (root.current) root.current.dataset.active = "false";
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
      curtain.dataset.active = "true";
      window.dispatchEvent(new CustomEvent("project-transition", { detail: true }));
      const href = url.pathname + url.search + url.hash;
      router.prefetch(href);
      const strips = Array.from(curtain.children).filter((node) => (node as HTMLElement).offsetWidth > 0);
      gsap.set(curtain.children, { y: 0, yPercent: 100, willChange: "transform" });
      // Uneven column timing echoes the reference without moving the page itself.
      animation.current?.kill();
      animation.current = gsap.timeline({ defaults: { duration: .58, ease: "power3.inOut" } })
        .to(strips, { yPercent: 0, stagger: (index) => (index % 3) * .065 + Math.floor(index / 3) * .025 })
        .call(() => router.push(href));
      // Failed or interrupted navigation must never leave an opaque, locked page.
      timeout.current = setTimeout(() => {
        animation.current?.kill();
        gsap.killTweensOf(curtain.children);
        gsap.set(curtain.children, { yPercent: 100, clearProps: "willChange" });
        finish();
      }, 10000);
    });
    document.addEventListener("click", click, true);
    return () => { document.removeEventListener("click", click, true); animation.current?.kill(); finish(); };
  }, { scope: root, dependencies: [router, finish] });

  useGSAP(() => {
    if (!pending.current || !root.current) return;
    // A committed route (including browser-history interruption) can be revealed.
    const strips = Array.from(root.current.children).filter((node) => (node as HTMLElement).offsetWidth > 0);
    animation.current?.kill();
    animation.current = gsap.timeline({ onComplete: () => {
      gsap.set(strips, { clearProps: "willChange" });
      finish();
      const heading = document.querySelector<HTMLElement>(".case-intro h1");
      if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
    } })
      .to(strips, { yPercent: -100, duration: .7, ease: "power3.inOut", stagger: (index) => (index % 3) * .05 + Math.floor(index / 3) * .02 }, .08);
  }, { scope: root, dependencies: [pathname, finish], revertOnUpdate: false });

  return <div ref={root} className="route-curtain" data-active="false" aria-hidden="true">
    {Array.from({ length: 12 }, (_, index) => <i key={index} />)}
  </div>;
}
