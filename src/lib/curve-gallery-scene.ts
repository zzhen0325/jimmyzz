import { gsap } from "@/lib/gsap";

export type GalleryImage = {
  src: string;
  width: number;
  height: number;
  title: string;
  project: string;
};
export type CurveScene = {
  setProgress: (progress: number) => void;
  setAutomatic: (value: boolean) => void;
  setActive: (value: boolean) => void;
  nudge: (amount: number) => void;
  dispose: () => void;
};

// Independent implementation of the public 3D Tilt Wheel preview:
// orbiting upright tiles, pointer tilt, and scroll-driven radius/perspective.
export async function createCurveScene(
  host: HTMLElement,
  images: GalleryImage[],
  onSelect: (index: number) => void,
): Promise<CurveScene> {
  const ring = document.createElement("div");
  ring.className = "curve-wheel";
  const tiles = images.map((image, index) => {
    const tile = document.createElement("button");
    tile.className = "curve-wheel-tile";
    tile.type = "button";
    tile.setAttribute("aria-label", `查看${image.title}`);
    const img = document.createElement("img");
    img.src = image.src;
    img.alt = image.title;
    img.width = image.width;
    img.height = image.height;
    img.draggable = false;
    img.decoding = "async";
    tile.append(img);
    tile.onclick = () => onSelect(index);
    ring.append(tile);
    return tile;
  });
  host.append(ring);
  const state = { progress: 0, tiltX: -18, tiltY: 0, offset: 0 };
  const progressTo = gsap.quickTo(state, "progress", { duration: 1.1, ease: "power3.out" });
  const tiltXTo = gsap.quickTo(state, "tiltX", { duration: 1.2, ease: "power3.out" });
  const tiltYTo = gsap.quickTo(state, "tiltY", { duration: 1.2, ease: "power3.out" });
  const offsetTo = gsap.quickTo(state, "offset", { duration: 0.8, ease: "power3.out" });
  const setters = tiles.map(tile => ({
    x: gsap.quickSetter(tile, "x", "px"),
    y: gsap.quickSetter(tile, "y", "px"),
    z: gsap.quickSetter(tile, "z", "px"),
  }));
  gsap.set(tiles, { xPercent: -50, yPercent: -50 });
  const rotateX = gsap.quickSetter(ring, "rotationX", "deg");
  const rotateY = gsap.quickSetter(ring, "rotationY", "deg");
  let width = 0;
  let height = 0;
  let active = true;
  let automatic = true;
  let focused = false;
  let disposed = false;
  let angle = 0;
  let offset = 0;
  const resize = () => {
    width = host.clientWidth;
    height = host.clientHeight;
    const tileSize = Math.min(width < 600 ? 76 : 130, width * 0.11);
    tiles.forEach((tile, index) => {
      const aspect = Math.max(0.65, Math.min(1.45, images[index].width / images[index].height));
      tile.style.width = `${tileSize * Math.sqrt(aspect)}px`;
      tile.style.height = `${tileSize / Math.sqrt(aspect)}px`;
    });
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  const render = (_time: number, delta: number) => {
    if (disposed || !active || document.hidden) return;
    if (automatic && !focused) angle += Math.min(delta, 50) * 0.000065;
    const base = Math.min(width * 0.29, height * 0.48);
    const radius = base * (1 + state.progress * 0.55);
    host.style.perspective = `${Math.max(650, width * 0.9) + state.progress * 1100}px`;
    rotateX(state.tiltX);
    rotateY(state.tiltY);
    setters.forEach((set, index) => {
      const a = index / tiles.length * Math.PI * 2 + angle + state.offset;
      set.x(Math.cos(a) * radius);
      set.y(Math.sin(a) * radius * 0.24);
      set.z(Math.sin(a) * radius * 0.65);
    });
  };
  const move = (event: PointerEvent) => {
    if (event.pointerType === "touch") return;
    const bounds = host.getBoundingClientRect();
    tiltXTo(-18 - ((event.clientY - bounds.top) / height - 0.5) * 26);
    tiltYTo(((event.clientX - bounds.left) / width - 0.5) * 34);
  };
  const reset = () => { tiltXTo(-18); tiltYTo(0); };
  const focusIn = () => { focused = true; };
  const focusOut = () => { focused = false; };
  host.addEventListener("pointermove", move);
  host.addEventListener("pointerleave", reset);
  ring.addEventListener("focusin", focusIn);
  ring.addEventListener("focusout", focusOut);
  gsap.ticker.add(render);
  render(0, 0);
  return {
    setProgress(progress) { progressTo(progress); },
    setAutomatic(value) { automatic = value; },
    setActive(value) { active = value; },
    nudge(amount) { offset += amount * Math.PI * 2; offsetTo(offset); },
    dispose() {
      if (disposed) return;
      disposed = true;
      gsap.ticker.remove(render);
      [progressTo, tiltXTo, tiltYTo, offsetTo].forEach(to => to.tween.kill());
      observer.disconnect();
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerleave", reset);
      ring.removeEventListener("focusin", focusIn);
      ring.removeEventListener("focusout", focusOut);
      tiles.forEach(tile => { tile.onclick = null; });
      ring.remove();
      host.style.removeProperty("perspective");
    },
  };
}
