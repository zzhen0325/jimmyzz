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
      // At rest, the combined displacement + lift is below half a device pixel.
      const restThreshold = 0.5 / (0.62 * Math.max(1, window.devicePixelRatio));
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
          height: 0,
          regionY: 0,
          regionHeight: 0,
        }];
      }));
      // The map ranges from .35 to .8, so max displacement is .3 * scale.
      // Use pixel padding instead of rasterizing an extra full image height.
      const padding = Math.ceil(limit * .3) + 2;
      // Keep bilinear sampling away from the hard filter/map boundary. Even a
      // neutral displacement channel can round by half a byte in the renderer.
      const edgePadding = 2;
      const setRegion = (image: HTMLElement, y: number, height: number) => {
        const entry = filters.get(image)!;
        if (entry.regionY === y && entry.regionHeight === height) return;
        entry.regionY = y;
        entry.regionHeight = height;
        // The displacement map varies only horizontally, so cropping its vertical
        // extent preserves the curve while bounding intermediate filter surfaces.
        for (const element of [entry.filter, entry.map]) {
          element.setAttribute("y", String(y));
          element.setAttribute("height", String(height));
        }
      };
      const measure = (image: HTMLElement, width: number, height: number) => {
        const entry = filters.get(image)!;
        entry.height = height;
        for (const element of [entry.filter, entry.map]) {
          element.setAttribute("x", String(-edgePadding));
          element.setAttribute("width", String(width + 2 * edgePadding));
        }
        setRegion(image, -padding, height + 2 * padding);
      };
      // clientWidth/clientHeight round fractional CSS pixels, which can put the
      // image edge outside the filter region by a fraction of a pixel.
      images.forEach(image => {
        const style = getComputedStyle(image);
        measure(image, parseFloat(style.width), parseFloat(style.height));
      });
      const restore = (image: HTMLElement) => {
        const entry = filters.get(image)!;
        if (!entry.active) return;
        image.style.filter = originalFilters.get(image) ?? "";
        image.style.translate = originalTranslations.get(image) ?? "";
        entry.displacement.setAttribute("scale", "0");
        entry.active = false;
      };
      let disposed = false;
      const paint = (updateBend = true) => {
        if (disposed) return;
        if (Math.abs(rendered.bend) <= restThreshold) {
          visible.forEach(restore);
          return;
        }
        const viewportHeight = window.innerHeight;
        const overscan = 256;
        // Batch layout reads before filter/style writes. Small covers keep their
        // full region; long images retain an overscanned viewport-sized window.
        const regions = Array.from(visible, image => {
          const entry = filters.get(image)!;
          if (entry.height <= viewportHeight + 2 * overscan) {
            return { image, y: -padding, height: entry.height + 2 * padding };
          }
          const rect = image.getBoundingClientRect();
          const scaleY = rect.height / entry.height || 1;
          const top = -rect.top / scaleY;
          const bottom = (viewportHeight - rect.top) / scaleY;
          // Include both the displacement's sampling radius and a changed lift.
          const guard = padding + limit * .32;
          if (entry.active && entry.regionHeight <= Math.ceil(bottom - top + 2 * (guard + overscan)) + 1 &&
              entry.regionY <= top - guard &&
              entry.regionY + entry.regionHeight >= bottom + guard) {
            return { image, y: entry.regionY, height: entry.regionHeight };
          }
          const y = Math.max(-padding, Math.floor(top - guard - overscan));
          const end = Math.min(entry.height + padding, Math.ceil(bottom + guard + overscan));
          return { image, y, height: Math.max(1, end - y) };
        });
        const bend = rendered.bend.toFixed(3);
        const lift = -Math.abs(rendered.bend) * .32;
        regions.forEach(({ image, y, height }) => {
          const entry = filters.get(image)!;
          setRegion(image, y, height);
          // Region tracking remains live on skipped bend frames, avoiding gaps
          // during fast scrolling without increasing curvature updates.
          if (!updateBend && entry.active) return;
          if (!entry.active) {
            image.style.filter = `url("#${entry.filter.id}")`;
            entry.active = true;
          }
          entry.displacement.setAttribute("scale", bend);
          image.style.translate = `0 ${lift}px`;
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
        paint(false);
      }, { rootMargin: `${padding}px` });
      images.forEach((image) => observer.observe(image));
      // A single frame loop follows and decays the impulse. Avoid restarting a
      // second tween from the first tween's onUpdate on every scroll frame.
      let ticking = false;
      let paintBudget = 0;
      const tick = (_time: number, deltaMs: number) => {
        const dt = Math.min(deltaMs / 1000, .064);
        rendered.bend += (proxy.bend - rendered.bend) * (1 - Math.exp(-dt / .055));
        proxy.bend *= Math.exp(-dt / .16);
        if (Math.abs(proxy.bend) <= restThreshold && Math.abs(rendered.bend) <= restThreshold) {
          proxy.bend = rendered.bend = 0;
          gsap.ticker.remove(tick);
          ticking = false;
        }
        // Seven curvature writes per ten ticker frames, at any refresh rate.
        // Integrate motion every frame so throttling does not slow the decay.
        paintBudget += .7;
        const updateBend = paintBudget >= 1 - 1e-9;
        if (updateBend) paintBudget -= 1;
        paint(updateBend);
      };
      ScrollTrigger.create({
        trigger: root.current,
        start: "top bottom", end: "bottom top",
        onUpdate: (self) => {
          if (!self.isActive) return;
          const bend = -limit * Math.tanh(self.getVelocity() / 2400);
          if (Math.abs(bend) > Math.abs(proxy.bend) || bend * proxy.bend < 0) {
            proxy.bend = bend;
            if (!ticking) { ticking = true; paintBudget = .3; gsap.ticker.add(tick); }
          }
        },
      });
      // Intrinsic image sizes can change the gallery height after hydration.
      let refreshFrame = 0;
      const resize = new ResizeObserver(entries => {
        entries.forEach(({ target, borderBoxSize, contentRect }) => {
          if (filters.has(target as HTMLElement)) {
            const image = target as HTMLElement;
            const box = borderBoxSize[0];
            measure(image, box?.inlineSize ?? contentRect.width, box?.blockSize ?? contentRect.height);
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
