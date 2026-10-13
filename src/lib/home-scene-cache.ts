import { createChromeWorld, type ChromeWorldOptions } from "./chrome-world";
import { setHomeSceneReady } from "./home-loading";

type CachedScene = {
  host: HTMLDivElement;
  canvas: HTMLCanvasElement;
  target: HTMLButtonElement;
  world: ReturnType<typeof createChromeWorld>;
  options: ChromeWorldOptions;
  failed: boolean;
};

// Retain the live GPU resources, not just downloaded model bytes. The host and
// its children are owned here so React can unmount the surrounding UI safely.
let cached: CachedScene | null = null;

export function attachHomeScene(parent: HTMLElement, options: ChromeWorldOptions) {
  if (cached?.failed) {
    cached.world.dispose();
    cached.host.remove();
    cached = null;
  }
  if (!cached) {
    const host = document.createElement("div");
    host.style.cssText = "position:absolute;inset:0";
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;touch-action:pan-y;cursor:pointer";
    canvas.setAttribute("role", "img");
    const target = document.createElement("button");
    target.type = "button";
    target.setAttribute("aria-label", "点击绿色传送枪，发射漩涡并触发吸入与吐出彩蛋");
    target.dataset.hoverLabel = "Open The Portal";
    target.dataset.hoverLabelOnControl = "";
    target.style.cssText = "display:none;position:absolute;z-index:2;left:0;top:0;width:1px;height:1px;padding:0;border:0;border-radius:50%;background:transparent;cursor:pointer;touch-action:pan-y;transform-origin:0 0";
    host.append(canvas, target);
    parent.append(host);
    const current = { host, canvas, target, options, failed: false } as CachedScene;
    try {
      current.world = createChromeWorld(canvas, {
        ...options,
        vortexTarget: target,
        workProgress: { get current() { return current.options.workProgress?.current ?? 0; } },
        onError: error => {
          current.failed = true;
          setHomeSceneReady(false);
          current.options.onError?.(error);
        },
      });
    } catch (error) {
      host.remove();
      throw error;
    }
    cached = current;
    void current.world.loaded.then(() => {
      if (!current.failed) setHomeSceneReady(true);
    }, error => {
      current.failed = true;
      setHomeSceneReady(false);
      current.options.onError?.(error);
    });
  }
  const scene = cached;
  scene.options = options;
  parent.append(scene.host);
  scene.world.setWeather(options.weather ?? "sunny");
  scene.world.setFloatingMode(options.floatingMode ?? "physics");
  scene.world.setPaused(!!options.paused);
  scene.world.setSuspended(false);
  return {
    world: scene.world,
    canvas: scene.canvas,
    release() {
      // A stale cleanup must not detach a newer owner.
      if (scene.host.parentElement !== parent) return;
      scene.options = { ...scene.options, onError: undefined, workProgress: undefined };
      scene.world.setPaused(true);
      scene.world.setExportLayout(null);
      scene.world.setSuspended(true);
      scene.host.remove();
    },
  };
}
