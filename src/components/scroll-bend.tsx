"use client";

import { useRef, type ReactNode } from "react";
import { gsap, ScrollTrigger, useGSAP, motionConditions } from "@/lib/gsap";
import type { createScrollBendRenderer } from "@/lib/scroll-bend-renderer";
import styles from "./scroll-bend.module.css";

/** Native media at rest; one shared GPU mesh surface while scrolling. */
export function ScrollBend({ children, className }: { children: ReactNode; className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add({ ...motionConditions, mobile: "(max-width: 809px)" }, ({ conditions }) => {
      const element = root.current;
      if (conditions?.reduced || !element) return;
      const hosts = Array.from(element.querySelectorAll<HTMLElement>("[data-work-skew]"));
      const visible = new Set<HTMLElement>();
      const near = new Set<HTMLElement>();
      const queue = new Set<HTMLImageElement | HTMLVideoElement>();
      const decoded = new WeakMap<HTMLImageElement, string>();
      const decoding = new WeakMap<HTMLImageElement, string>();
      const originals = new Map(hosts.map(host => [host, { transform: host.style.transform, translate: host.style.translate }]));
      const limit = conditions?.mobile ? 90 : 210;
      const threshold = .5 / (.62 * Math.max(1, devicePixelRatio));
      let renderer: ReturnType<typeof createScrollBendRenderer> = null;
      let disposed = false, unavailable = false, transitioning = false, ticking = false;
      let target = 0, bend = 0, idle = 0, idleIsTimeout = false, refresh = 0, lastWarm = 0;
      const restore = (host: HTMLElement) => {
        delete host.dataset.bendGpu;
        if (host.hasAttribute('data-bend-fallback')) {
          delete host.dataset.bendFallback;
          host.style.transform = originals.get(host)!.transform;
          host.style.translate = originals.get(host)!.translate;
        }
      };
      const stop = () => {
        gsap.ticker.remove(tick); ticking = false; target = bend = 0;
        hosts.forEach(restore); renderer?.hide();
        schedule();
      };
      const schedule = (expires = performance.now() + 250) => {
        if (idle || disposed || !renderer || unavailable || !queue.size || document.hidden) return;
        const work = (deadline?: IdleDeadline) => {
          idle = 0;
          if (disposed || !renderer || unavailable || document.hidden) return;
          // Prefer idle time, but do not starve newly visible covers during a
          // continuous scroll. Each callback uploads at most one decoded texture.
          if (transitioning) return;
          if (deadline && !deadline.didTimeout && deadline.timeRemaining() < 8 && performance.now() < expires) { schedule(expires); return; }
          const media = queue.values().next().value;
          if (media) {
            queue.delete(media);
            const host = media.closest<HTMLElement>('[data-work-skew]');
            if (host && near.has(host) && (!(media instanceof HTMLImageElement) || decoded.get(media) === (media.currentSrc || media.src))) renderer.prepare(media);
          }
          schedule();
        };
        idleIsTimeout = !window.requestIdleCallback;
        idle = idleIsTimeout ? window.setTimeout(work, 32) : window.requestIdleCallback(work, { timeout: Math.max(1, expires - performance.now()) });
      };
      const warm = (host: HTMLElement) => {
        if (!renderer || unavailable || disposed) return;
        host.querySelectorAll<HTMLImageElement | HTMLVideoElement>('img,video').forEach(media => {
          // Start nearby lazy images before they enter the viewport; decode off
          // the rendering path, then upload a single texture in each idle slot.
          if (media instanceof HTMLImageElement) media.loading = 'eager';
          if (!renderer!.needsPreparation(media)) return;
          if (media instanceof HTMLImageElement) {
            const src = media.currentSrc || media.src;
            if (decoded.get(media) !== src) {
              if (decoding.get(media) === src) return;
              decoding.set(media, src);
              void media.decode().then(() => {
                if (disposed || !near.has(host) || src !== (media.currentSrc || media.src)) return;
                decoded.set(media, src); queue.add(media); schedule();
              }).catch(() => {}).finally(() => { if (decoding.get(media) === src) decoding.delete(media); });
              return;
            }
          }
          queue.add(media);
        });
        schedule();
      };
      const loaded = (event: Event) => {
        const host = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-work-skew]') : null;
        if (host && near.has(host)) warm(host);
      };
      const paint = () => {
        if (Math.abs(bend) <= threshold) { hosts.forEach(restore); renderer?.hide(); return; }
        const drawn = renderer && !unavailable ? renderer.draw([...visible], bend) : new Set<HTMLElement>();
        const retry = performance.now() - lastWarm > 300;
        if (retry) lastWarm = performance.now();
        visible.forEach(host => {
          if (drawn.has(host)) host.dataset.bendGpu = '';
          else {
            restore(host);
            if (retry && !unavailable) warm(host);
            // If WebGL is unavailable, preserve responsive motion with compositor transforms.
            if (unavailable) {
              host.dataset.bendFallback = '';
              const skew = Math.atan(bend * .45 / Math.max(1, host.clientWidth));
              host.style.transform = `${originals.get(host)!.transform} skewY(${skew}rad)`;
              host.style.translate = `0 ${-Math.abs(bend) * .32}px`;
            }
          }
        });
      };
      const tick = (_time: number, deltaMs: number) => {
        if (document.hidden || transitioning) { stop(); return; }
        const dt = Math.min(deltaMs / 1000, .064);
        bend += (target - bend) * (1 - Math.exp(-dt / .055));
        target *= Math.exp(-dt / .16);
        if (Math.abs(target) <= threshold && Math.abs(bend) <= threshold) { stop(); return; }
        paint();
      };
      const observer = new IntersectionObserver(entries => {
        entries.forEach(({ target, isIntersecting }) => {
          const host = target as HTMLElement;
          if (isIntersecting) visible.add(host);
          else { visible.delete(host); restore(host); }
        });
      }, { rootMargin: '144px' });
      const preload = new IntersectionObserver(entries => {
        entries.forEach(({ target, isIntersecting }) => {
          const host = target as HTMLElement;
          if (isIntersecting) { near.add(host); warm(host); }
          else near.delete(host);
        });
      }, { rootMargin: '1600px' });
      hosts.forEach(host => { observer.observe(host); preload.observe(host); });
      element.addEventListener('load', loaded, true);
      element.addEventListener('loadeddata', loaded, true);
      const visibility = () => { if (document.hidden) stop(); else schedule(); };
      const transition = (event: Event) => { transitioning = (event as CustomEvent<boolean>).detail; if (transitioning) stop(); else schedule(); };
      const resized = () => { stop(); renderer?.resize(); near.forEach(warm); };
      document.addEventListener('visibilitychange', visibility);
      window.addEventListener('project-transition', transition);
      window.addEventListener('resize', resized);
      void import('@/lib/scroll-bend-renderer').then(({ createScrollBendRenderer }) => {
        if (disposed) return;
        try { renderer = createScrollBendRenderer(() => { unavailable = true; hosts.forEach(restore); }); }
        catch { renderer = null; }
        unavailable = !renderer;
        near.forEach(warm);
      }).catch(() => { if (!disposed) unavailable = true; });
      ScrollTrigger.create({
        trigger: element, start: 'top bottom', end: 'bottom top',
        onUpdate(self) {
          if (!self.isActive || transitioning || document.hidden) return;
          const impulse = -limit * Math.tanh(self.getVelocity() / 2400);
          if (Math.abs(impulse) > Math.abs(target) || impulse * target < 0) {
            target = impulse;
            if (!ticking) { ticking = true; gsap.ticker.add(tick); }
          }
        },
      });
      const resize = new ResizeObserver(() => {
        cancelAnimationFrame(refresh);
        refresh = requestAnimationFrame(() => { ScrollTrigger.refresh(true); near.forEach(warm); });
      });
      resize.observe(element);
      return () => {
        disposed = true; stop();
        if (idleIsTimeout) clearTimeout(idle); else window.cancelIdleCallback?.(idle);
        cancelAnimationFrame(refresh); resize.disconnect(); observer.disconnect(); preload.disconnect();
        element.removeEventListener('load', loaded, true);
        element.removeEventListener('loadeddata', loaded, true);
        document.removeEventListener('visibilitychange', visibility);
        window.removeEventListener('project-transition', transition);
        window.removeEventListener('resize', resized);
        renderer?.dispose(); queue.clear();
      };
    }, root);
    return () => mm.revert();
  }, { scope: root });
  return <div ref={root} className={`${styles.root}${className ? ` ${className}` : ''}`}>{children}</div>;
}
