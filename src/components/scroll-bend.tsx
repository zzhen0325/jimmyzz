"use client";

import { useId, useRef, type ReactNode } from "react";
import { gsap, ScrollTrigger, useGSAP, motionConditions } from "@/lib/gsap";

/** Shared velocity-driven curvature for home covers and project images. */
export function ScrollBend({ children, className }: { children: ReactNode; className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const definitions = useRef<SVGDefsElement>(null);
  const template = useRef<SVGFilterElement>(null);
  const filterId = `work-curve-${useId().replace(/:/g, "")}`;

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add({ ...motionConditions, mobile: "(max-width: 809px)" }, ({ conditions }) => {
      if (conditions?.reduced || !root.current || !definitions.current || !template.current) return;
      const images = root.current.querySelectorAll<HTMLElement>("[data-work-skew]");
      const proxy = { bend: 0 };
      const rendered = { bend: 0 };
      const limit = conditions?.mobile ? 60 : 140;
      const visible = new Set<HTMLElement>();
      const originalFilters = new Map(Array.from(images, (image) => [image, image.style.filter]));
      const originalTranslations = new Map(Array.from(images, (image) => [image, image.style.translate]));
      // Each cover owns its filter so only its visible consumer is invalidated.
      const filters = new Map(Array.from(images, (image, index) => {
        const filter = template.current!.cloneNode(true) as SVGFilterElement;
        filter.id = `${filterId}-${index}`;
        filter.setAttribute("filterUnits", "userSpaceOnUse");
        definitions.current!.appendChild(filter);
        return [image, {
          filter,
          map: filter.querySelector("feImage")!,
          displacement: filter.querySelector("feDisplacementMap")!,
          active: false,
        }];
      }));
      // The map ranges from .35 to .8, so max displacement is .3 * scale.
      // Use pixel padding instead of rasterizing an extra full image height.
      const padding = Math.ceil(limit * .3) + 2;
      const measure = (image: HTMLElement, width: number, height: number) => {
        const entry = filters.get(image)!;
        for (const element of [entry.filter, entry.map]) {
          element.setAttribute("x", "0");
          element.setAttribute("y", String(-padding));
          element.setAttribute("width", String(width));
          element.setAttribute("height", String(height + 2 * padding));
        }
      };
      images.forEach(image => measure(image, image.clientWidth, image.clientHeight));
      const restore = (image: HTMLElement) => {
        const entry = filters.get(image)!;
        if (!entry.active) return;
        image.style.filter = originalFilters.get(image) ?? "";
        image.style.translate = originalTranslations.get(image) ?? "";
        entry.displacement.setAttribute("scale", "0");
        entry.active = false;
      };
      let disposed = false;
      const paint = () => {
        if (disposed) return;
        const moving = Math.abs(rendered.bend) > 0.05;
        visible.forEach((image) => {
          if (!moving) { restore(image); return; }
          const entry = filters.get(image)!;
          if (!entry.active) {
            image.style.filter = `url("#${entry.filter.id}")`;
            entry.active = true;
          }
          entry.displacement.setAttribute("scale", rendered.bend.toFixed(3));
          // Lift by the maximum downward bend so the bottom edge clears captions.
          image.style.translate = `0 ${-Math.abs(rendered.bend) * 0.32}px`;
        });
      };
      // Only rasterize covers near the viewport; remove the filter at rest so
      // images and playing videos regain their normal compositing path.
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(({ target, isIntersecting }) => {
          const image = target as HTMLElement;
          if (isIntersecting) visible.add(image);
          else {
            visible.delete(image);
            restore(image);
          }
        });
        paint();
      }, { rootMargin: `${padding}px` });
      images.forEach((image) => observer.observe(image));
      // A single frame loop follows and decays the impulse. Avoid restarting a
      // second tween from the first tween's onUpdate on every scroll frame.
      let ticking = false;
      const tick = (_time: number, deltaMs: number) => {
        const dt = Math.min(deltaMs / 1000, .064);
        rendered.bend += (proxy.bend - rendered.bend) * (1 - Math.exp(-dt / .055));
        proxy.bend *= Math.exp(-dt / .16);
        if (Math.abs(proxy.bend) < .05 && Math.abs(rendered.bend) < .05) {
          proxy.bend = rendered.bend = 0;
          gsap.ticker.remove(tick);
          ticking = false;
        }
        paint();
      };
      ScrollTrigger.create({
        trigger: root.current,
        start: "top bottom", end: "bottom top",
        onUpdate: (self) => {
          if (!self.isActive) return;
          const bend = -limit * Math.tanh(self.getVelocity() / 2400);
          if (Math.abs(bend) > Math.abs(proxy.bend) || bend * proxy.bend < 0) {
            proxy.bend = bend;
            if (!ticking) { ticking = true; gsap.ticker.add(tick); }
          }
        },
      });
      // Intrinsic image sizes can change the gallery height after hydration.
      let refreshFrame = 0;
      const resize = new ResizeObserver(entries => {
        entries.forEach(({ target }) => {
          if (filters.has(target as HTMLElement)) {
            const image = target as HTMLElement;
            measure(image, image.clientWidth, image.clientHeight);
          }
        });
        cancelAnimationFrame(refreshFrame);
        refreshFrame = requestAnimationFrame(() => ScrollTrigger.refresh());
      });
      resize.observe(root.current);
      images.forEach(image => resize.observe(image));
      return () => {
        disposed = true;
        gsap.ticker.remove(tick);
        cancelAnimationFrame(refreshFrame);
        resize.disconnect();
        observer.disconnect();
        originalFilters.forEach((value, image) => { image.style.filter = value; });
        originalTranslations.forEach((value, image) => { image.style.translate = value; });
        filters.forEach(({ filter }) => filter.remove());
      };
    }, root);
    return () => mm.revert();
  }, { scope: root });

  return (
    <div ref={root} className={className}>
      <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute" }}>
        <defs ref={definitions}>
          <filter ref={template} id={filterId} x="0%" y="-50%" width="100%" height="200%" colorInterpolationFilters="sRGB">
            <feImage href="/assets/work-curve-map.svg" x="0%" y="-50%" width="100%" height="200%" preserveAspectRatio="none" result="curve" />
            {/* Exact neutral red prevents horizontal drift from 8-bit rounding. */}
            <feColorMatrix in="curve" type="matrix" values="0 0 0 0 0.5  0 1 0 0 0  0 0 0 0 0  0 0 0 0 1" result="verticalCurve" />
            <feDisplacementMap in="SourceGraphic" in2="verticalCurve" scale="0" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>
      {children}
    </div>
  );
}
