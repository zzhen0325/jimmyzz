import type { ChromeWorldOptions, createChromeWorld } from "./chrome-world";
import type { SceneViewport } from "./home-scene-platform";

type World = ReturnType<typeof createChromeWorld>;

export function createWorkerChromeWorld(canvas: HTMLCanvasElement, options: ChromeWorldOptions): World {
  if (!canvas.transferControlToOffscreen || typeof Worker === "undefined") {
    throw new Error("此浏览器不支持后台 3D 渲染，请使用支持 OffscreenCanvas 的浏览器。");
  }
  const worker = new Worker(new URL("./home-scene.worker.ts", import.meta.url), { type: "module" });
  canvas.dataset.renderer = "worker";
  const host = canvas.parentElement!;
  let disposed = false;
  let suspended = false;
  let frame = 0;
  let rect = host.getBoundingClientRect();
  let rectDirty = true;
  let lastState = "";
  let id = 0;
  const pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
  let resolveLoaded!: () => void;
  let rejectLoaded!: (error: Error) => void;
  const loaded = new Promise<void>((resolve, reject) => { resolveLoaded = resolve; rejectLoaded = reject; });
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const coarse = matchMedia("(pointer: coarse)");
  const viewport = (): SceneViewport => {
    if (rectDirty) { rect = host.getBoundingClientRect(); rectDirty = false; }
    return { width: Math.max(1, rect.width), height: Math.max(1, rect.height), left: rect.left, top: rect.top,
      dpr: window.devicePixelRatio, viewportHeight: window.visualViewport?.height ?? innerHeight,
      hidden: document.hidden, reduced: reduced.matches, coarse: coarse.matches, progress: options.workProgress?.current ?? 0 };
  };
  const fail = (error: Error) => {
    canvas.dataset.assetError = "true";
    canvas.dataset.sceneError = error.message;
    console.error("[Home scene]", error);
    rejectLoaded(error);
    pending.forEach(request => request.reject(error)); pending.clear();
    options.onError?.(error);
  };
  worker.onerror = event => fail(new Error(event.message || "后台 3D 渲染失败"));
  worker.onmessage = event => {
    const message = event.data;
    if (message.type === "loaded") resolveLoaded();
    else if (message.type === "error") fail(new Error(message.error));
    else if (message.type === "state") {
      for (const [key, value] of Object.entries(message.stats)) {
        if (canvas.dataset[key] !== value) canvas.dataset[key] = String(value);
      }
      if (options.vortexTarget) Object.assign(options.vortexTarget.style, message.targetStyle);
    } else if (message.type === "focus") canvas.focus({ preventScroll: true });
    else if (message.type === "capture") { try { canvas.setPointerCapture(message.id); } catch { /* Pointer already ended. */ } }
    else if (message.type === "release") { if (canvas.hasPointerCapture(message.id)) canvas.releasePointerCapture(message.id); }
    else if (message.type === "result") {
      const request = pending.get(message.id); pending.delete(message.id);
      if (message.error) request?.reject(new Error(message.error)); else request?.resolve(message.result);
    }
  };
  const sendViewport = () => {
    if (disposed || suspended) return;
    const state = viewport();
    const key = JSON.stringify(state);
    if (key !== lastState) { lastState = key; worker.postMessage({ type: "viewport", viewport: state }); }
    frame = requestAnimationFrame(sendViewport);
  };
  const invalidate = () => { rectDirty = true; };
  const observer = new ResizeObserver(invalidate); observer.observe(host);
  window.addEventListener("scroll", invalidate, { passive: true });
  window.addEventListener("resize", invalidate, { passive: true });
  window.visualViewport?.addEventListener("resize", invalidate);
  const events: [EventTarget, string, EventListener][] = [];
  const forward = (source: EventTarget, target: string, name: string) => {
    const listener: EventListener = event => {
      if (disposed || suspended) return;
      const e = event as PointerEvent & KeyboardEvent;
      if (target === "canvas" && name === "keydown" && ["Space", "Enter", "ArrowUp", "ArrowDown", "KeyV", "Escape"].includes(e.code) && (options.workProgress?.current ?? 0) === 0) e.preventDefault();
      if (target === "canvas" && name === "pointerdown") canvas.focus({ preventScroll: true });
      worker.postMessage({ type: "event", target, name, values: {
        clientX: e.clientX, clientY: e.clientY, pointerId: e.pointerId, pointerType: e.pointerType,
        button: e.button, buttons: e.buttons, code: e.code, key: e.key,
      } });
    };
    source.addEventListener(name, listener); events.push([source, name, listener]);
  };
  ["pointerdown", "pointermove", "pointerup", "pointercancel", "pointerleave", "lostpointercapture", "click", "keydown"].forEach(name => forward(canvas, "canvas", name));
  ["keyup", "blur"].forEach(name => forward(window, "window", name));
  if (options.vortexTarget) ["pointerdown", "click"].forEach(name => forward(options.vortexTarget!, "vortex", name));
  const surface = canvas.transferControlToOffscreen();
  worker.postMessage({ type: "init", canvas: surface, viewport: viewport(), options: {
    weather: options.weather, floatingMode: options.floatingMode, paused: options.paused,
  } }, [surface]);
  frame = requestAnimationFrame(sendViewport);
  const call = (method: string, ...args: unknown[]) => { if (!disposed) worker.postMessage({ type: "call", method, args }); };
  return {
    loaded: loaded.then(() => []) as World["loaded"],
    setWeather: value => call("setWeather", value),
    setFloatingMode: value => call("setFloatingMode", value),
    setPaused: value => call("setPaused", value),
    setExportLayout: value => call("setExportLayout", value),
    setSuspended: value => {
      suspended = value; call("setSuspended", value); cancelAnimationFrame(frame);
      if (!value) { rectDirty = true; lastState = ""; frame = requestAnimationFrame(sendViewport); }
    },
    exportFrame: () => new Promise<Blob>((resolve, reject) => {
      const requestId = ++id;
      pending.set(requestId, { resolve: value => resolve(value as Blob), reject });
      worker.postMessage({ type: "call", method: "exportFrame", args: [], id: requestId });
    }),
    replay: () => call("replay"),
    dispose: () => {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect();
      window.removeEventListener("scroll", invalidate); window.removeEventListener("resize", invalidate);
      window.visualViewport?.removeEventListener("resize", invalidate);
      events.forEach(([target, name, listener]) => target.removeEventListener(name, listener));
      pending.forEach(request => request.reject(new Error("Scene disposed"))); pending.clear();
      worker.terminate();
    },
  };
}
