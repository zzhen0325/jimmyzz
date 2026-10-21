"use client";

import { useEffect } from "react";
import { getImageProps } from "next/image";
import { useRouter } from "next/navigation";
import { PrefetchKind } from "next/dist/client/components/router-reducer/router-reducer-types";
import { caseImageQuality, caseImageSizes, type PreloadRoute, type PreviewImage } from "@/lib/case-media";
import { isUploadedImage } from "@/lib/media-image";
import { preparedCaseImage, caseMediaImageLoader } from "@/lib/prepared-case-media";

type ImageSource = { src: string; srcSet?: string; sizes?: string };
const warmedImages = new Map<string, Promise<void>>();
const warmedRoutes = new Map<string, number>();

function previewSource(image: PreviewImage): ImageSource {
  if (!image.width || !image.height || image.unoptimized) return { src: image.src };
  const { props } = getImageProps({ ...image, alt: "", sizes: caseImageSizes, quality: caseImageQuality,
    ...(preparedCaseImage(image.src) || isUploadedImage(image.src) ? { loader: caseMediaImageLoader } : {}),
  });
  return { src: props.src, srcSet: props.srcSet, sizes: props.sizes };
}

function warmImage(source: ImageSource) {
  // Match the browser's responsive candidate, including after a viewport change.
  const key = `${source.src}|${source.srcSet ?? ""}|${source.sizes ?? ""}|${window.innerWidth}|${window.devicePixelRatio}`;
  const existing = warmedImages.get(key);
  if (existing) return existing;
  const promise = new Promise<void>(resolve => {
    const image = new Image();
    const finish = () => {
      clearTimeout(timer);
      image.onload = image.onerror = null;
      if (!image.naturalWidth) warmedImages.delete(key);
      resolve();
    };
    const timer = setTimeout(finish, 15000);
    image.onload = finish;
    image.onerror = finish;
    image.decoding = "async";
    image.fetchPriority = "low";
    if (source.sizes) image.sizes = source.sizes;
    if (source.srcSet) image.srcset = source.srcSet;
    image.src = source.src;
  });
  warmedImages.set(key, promise);
  if (warmedImages.size > 256) warmedImages.delete(warmedImages.keys().next().value!);
  return promise;
}

/** Detail pages warm navigation on intent; keep their bandwidth for visible media. */
export function PagePreload({ routes, home = false }: { routes: PreloadRoute[]; home?: boolean }) {
  const router = useRouter();
  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    const constrained = connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType ?? "");
    const byPath = new Map(routes.map(route => [route.href, route]));
    let disposed = false;
    let transitioning = false;
    let active = 0;
    let routeIndex = 0;
    let mediaStarted = false;
    let idle: number | undefined;
    let pumpTimer: ReturnType<typeof setTimeout> | undefined;
    let mediaTimer: ReturnType<typeof setTimeout>;
    let routeTimer: ReturnType<typeof setTimeout>;
    const queue: ImageSource[] = [];
    const hrefs = [...new Set([...(home ? [] : ["/"]), ...routes.map(route => route.href)])];
    const prefetch = (href: string) => {
      if (href === window.location.pathname) return;
      const now = Date.now();
      if (now - (warmedRoutes.get(href) ?? 0) < 240000) return;
      warmedRoutes.set(href, now);
      // Next 16.3 defaults imperative prefetch to AUTO; dynamic cases need FULL.
      router.prefetch(href, { kind: PrefetchKind.FULL, onInvalidate: () => { warmedRoutes.delete(href); } });
    };
    const pump = () => {
      if (disposed || document.hidden || transitioning) return;
      while (active < 2 && queue.length) {
        const source = queue.shift()!;
        active++;
        void warmImage(source).finally(() => { active--; schedulePump(); });
      }
    };
    const schedulePump = () => {
      if (disposed || !queue.length || idle !== undefined || pumpTimer !== undefined) return;
      if (typeof window.requestIdleCallback === "function") {
        idle = window.requestIdleCallback(() => { idle = undefined; pump(); }, { timeout: 1500 });
      } else {
        pumpTimer = setTimeout(() => { pumpTimer = undefined; pump(); }, 80);
      }
    };
    const intent = (event: Event) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!target || target.download || (target.target && target.target !== "_self")) return;
      const url = new URL(target.href, location.href);
      if (url.origin !== location.origin) return;
      const route = byPath.get(url.pathname);
      if (!route && url.pathname !== "/") return;
      prefetch(url.pathname);
      if (constrained) return;
      if (url.pathname === "/" && location.pathname !== "/") void import("./chrome-scene");
      if (url.pathname === "/work/portfolio-v1") void import("./v1-experience");
      if (route) queue.unshift(...route.images.map(previewSource));
      pump();
    };
    const nextRoute = () => {
      if (disposed || constrained || routeIndex >= hrefs.length) return;
      if (!document.hidden && !transitioning) prefetch(hrefs[routeIndex++]);
      routeTimer = setTimeout(nextRoute, 250);
    };
    const startedAt = performance.now();
    const startMedia = () => {
      if (disposed || constrained || mediaStarted) return;
      // Give the initial 3D downloads the network first, then prepare covers,
      // the ribbon and project openings while the visitor views the introduction.
      if (document.hidden || transitioning || (home && !document.querySelector("canvas[data-ready='true']") && performance.now() - startedAt < 5000)) {
        mediaTimer = setTimeout(startMedia, 250);
        return;
      }
      mediaStarted = true;
      const selector = home ? ".home-content img" : ".case-gallery img";
      queue.push(...Array.from(document.querySelectorAll<HTMLImageElement>(selector))
        .filter(image => !image.complete || !image.naturalWidth)
        .map(image => ({ src: image.src, srcSet: image.srcset, sizes: image.sizes })));
      queue.push(...routes.flatMap(route => route.images.map(previewSource)));
      schedulePump();
    };
    const visibility = () => { if (!document.hidden) pump(); };
    const transition = (event: Event) => {
      transitioning = !!(event as CustomEvent<boolean>).detail;
      if (!transitioning) pump();
    };
    // Never force a detail gallery's lazy images (or every other project) to load.
    // The home experience retains its existing background warmup.
    if (home) {
      routeTimer = setTimeout(nextRoute, 800);
      mediaTimer = setTimeout(startMedia, 1200);
    }
    document.addEventListener("pointerover", intent, { passive: true });
    document.addEventListener("focusin", intent);
    document.addEventListener("touchstart", intent, { passive: true });
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("project-transition", transition);
    return () => {
      disposed = true;
      queue.length = 0;
      clearTimeout(routeTimer);
      clearTimeout(mediaTimer);
      clearTimeout(pumpTimer);
      if (idle !== undefined) window.cancelIdleCallback(idle);
      document.removeEventListener("pointerover", intent);
      document.removeEventListener("focusin", intent);
      document.removeEventListener("touchstart", intent);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("project-transition", transition);
    };
  }, [routes, home, router]);
  return null;
}
