import { createChromeWorld, type ChromeWorldOptions } from "./chrome-world";
import type { ScenePlatform, SceneViewport } from "./home-scene-platform";

const send = (message: unknown) => postMessage(message);
let world: ReturnType<typeof createChromeWorld> | undefined;
let viewport: SceneViewport;
const windowEvents = new EventTarget();
const documentEvents = new EventTarget();
const viewportEvents = new EventTarget();
const target = new EventTarget();
const resizeObservers = new Set<() => void>();
const intersectionObservers = new Set<() => void>();
const mediaQueries = new Map<string, EventTarget & { matches: boolean }>();
let canvas: OffscreenCanvas;
let stats: Record<string, string> = {};
let targetStyle: Record<string, string> = {};
let dirty = false;

// Batch small UI updates, rather than sending an IPC message per mesh/per frame.
setInterval(() => {
  if (!dirty) return;
  dirty = false;
  send({ type: "state", stats: { ...stats }, targetStyle: { ...targetStyle } });
}, 50);

const rect = () => ({ x: viewport.left, y: viewport.top, left: viewport.left, top: viewport.top,
  width: viewport.width, height: viewport.height, right: viewport.left + viewport.width, bottom: viewport.top + viewport.height });
const dispatch = (receiver: EventTarget, type: string, values: Record<string, unknown> = {}) => {
  const event = new Event(type, { cancelable: true });
  for (const [key, value] of Object.entries(values)) Object.defineProperty(event, key, { value });
  receiver.dispatchEvent(event);
};
const snapshotCanvas = (width = 1, height = 1) => {
  const surface = new OffscreenCanvas(width, height);
  Object.assign(surface, { toBlob: (callback: (blob: Blob | null) => void, type: string) => {
    void surface.convertToBlob({ type }).then(callback, () => callback(null));
  } });
  return surface;
};

function initialize(surface: OffscreenCanvas, state: SceneViewport, options: ChromeWorldOptions) {
  canvas = surface;
  viewport = state;
  stats = new Proxy<Record<string, string>>({}, {
    set(object, key: string, value: string) { if (object[key] !== value) { object[key] = value; dirty = true; } return true; },
    deleteProperty(object, key: string) { delete object[key]; dirty = true; return true; },
  });
  targetStyle = new Proxy<Record<string, string>>({}, {
    set(object, key: string, value: string) { if (object[key] !== value) { object[key] = value; dirty = true; } return true; },
  });
  const host = { get clientWidth() { return viewport.width; }, get clientHeight() { return viewport.height; },
    // The scene host contains only the canvas and its hit target, no DOM props.
    isConnected: true, getBoundingClientRect: rect, querySelectorAll: () => [] };
  const captures = new Set<number>();
  Object.assign(canvas, {
    parentElement: host, style: {}, dataset: stats,
    getBoundingClientRect: rect,
    setAttribute: () => {},
    focus: () => send({ type: "focus" }),
    setPointerCapture: (id: number) => { captures.add(id); send({ type: "capture", id }); },
    hasPointerCapture: (id: number) => captures.has(id),
    releasePointerCapture: (id: number) => { captures.delete(id); send({ type: "release", id }); },
    toBlob: (callback: (blob: Blob | null) => void, type: string) => {
      void canvas.convertToBlob({ type }).then(callback, () => callback(null));
    },
  });
  Object.assign(target, { style: targetStyle });
  const platform = {
    window: Object.assign(windowEvents, {
      get devicePixelRatio() { return viewport.dpr; },
      get innerHeight() { return viewport.viewportHeight; },
      visualViewport: Object.assign(viewportEvents, { height: viewport.viewportHeight }),
    }),
    document: Object.assign(documentEvents, { hidden: viewport.hidden, createElement: (tag: string) => {
      if (tag !== "canvas") throw new Error(`Unsupported scene element: ${tag}`);
      return snapshotCanvas();
    } }),
    matchMedia: (query: string) => {
      let media = mediaQueries.get(query);
      if (!media) { media = Object.assign(new EventTarget(), { matches: query.includes("reduced-motion") ? viewport.reduced : viewport.coarse }); mediaQueries.set(query, media); }
      return media;
    },
    ResizeObserver: class {
      constructor(private callback: () => void) {}
      observe() { resizeObservers.add(this.callback); }
      disconnect() { resizeObservers.delete(this.callback); }
    },
    IntersectionObserver: class {
      private notify: () => void;
      constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
        this.notify = () => callback([{ isIntersecting: viewport.progress < 1 && !viewport.hidden }]);
      }
      observe() { intersectionObservers.add(this.notify); this.notify(); }
      disconnect() { intersectionObservers.delete(this.notify); }
    },
  } as unknown as ScenePlatform;
  // Object.assign evaluates getters; define these live readings explicitly.
  Object.defineProperties(platform.window, {
    devicePixelRatio: { get: () => viewport.dpr }, innerHeight: { get: () => viewport.viewportHeight },
  });
  Object.defineProperty(platform.document, "hidden", { get: () => viewport.hidden });
  Object.defineProperty(platform.window.visualViewport, "height", { get: () => viewport.viewportHeight });
  world = createChromeWorld(canvas as unknown as HTMLCanvasElement, {
    ...options, platform, debug: false, vortexTarget: target as unknown as HTMLButtonElement,
    workProgress: { get current() { return viewport.progress; } },
    onError: error => send({ type: "error", error: String(error) }),
  });
  void world.loaded.then(() => send({ type: "loaded" }), error => send({ type: "error", error: String(error) }));
}

self.addEventListener("message", async (event: MessageEvent) => {
  const message = event.data;
  try {
    if (message.type === "init") { initialize(message.canvas, message.viewport, message.options); return; }
    if (message.type === "viewport") {
      const old = viewport;
      viewport = message.viewport;
      for (const [query, media] of mediaQueries) {
        const next = query.includes("reduced-motion") ? viewport.reduced : viewport.coarse;
        if (next !== media.matches) { media.matches = next; dispatch(media, "change"); }
      }
      if (old.width !== viewport.width || old.height !== viewport.height || old.dpr !== viewport.dpr) resizeObservers.forEach(notify => notify());
      if (old.progress !== viewport.progress || old.hidden !== viewport.hidden) intersectionObservers.forEach(notify => notify());
      if (old.left !== viewport.left || old.top !== viewport.top) dispatch(windowEvents, "scroll");
      if (old.viewportHeight !== viewport.viewportHeight) dispatch(viewportEvents, "resize");
      // document.hidden is supplied without coupling rendering to page initialization.
      if (old.hidden !== viewport.hidden) dispatch(documentEvents, "visibilitychange");
    } else if (message.type === "event") {
      const receiver = message.target === "window" ? windowEvents : message.target === "vortex" ? target : canvas;
      dispatch(receiver, message.name, message.values);
    } else if (message.type === "call" && world) {
      const method = message.method as keyof typeof world;
      if (method === "loaded") return;
      const result = await (world[method] as (...args: unknown[]) => unknown)(...message.args);
      if (message.id) send({ type: "result", id: message.id, result });
    }
  } catch (error) {
    send(message.id ? { type: "result", id: message.id, error: String(error) } : { type: "error", error: String(error) });
  }
});
