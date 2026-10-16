/** DOM measurements/events supplied by the main thread to the offscreen scene. */
export type SceneViewport = { width: number; height: number; left: number; top: number; dpr: number; viewportHeight: number; hidden: boolean; reduced: boolean; coarse: boolean; progress: number };
export type ScenePlatform = {
  window: Window;
  document: Document;
  matchMedia: typeof matchMedia;
  ResizeObserver: typeof ResizeObserver;
  IntersectionObserver: typeof IntersectionObserver;
};
