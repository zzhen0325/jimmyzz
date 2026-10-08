import { gsap, ScrollTrigger } from "@/lib/gsap";

// AUGE XP's vertical gallery uses a critically damped spring with this frequency.
// Drive the real viewport here so existing pinned sections and browser navigation
// continue to share one scroll position.
const FREQUENCY = 1 / .115;
const POSITION_EPSILON = .5;
const VELOCITY_EPSILON = 3;

export function createInertialScroll() {
  let position = window.scrollY;
  let target = position;
  let written = position;
  let velocity = 0;
  let running = false;
  let maximum = 0;
  const locks = new Set<string>();
  if (document.querySelector('.route-curtain[data-active="true"]')) locks.add("project-transition");

  const clamp = (value: number) => Math.max(0, Math.min(maximum, value));
  const halt = () => {
    gsap.ticker.remove(tick);
    running = false;
    velocity = 0;
    position = target = written = window.scrollY;
  };
  const measure = () => {
    maximum = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    target = clamp(target);
  };
  const write = (value: number) => {
    window.scrollTo({ top: clamp(value), behavior: "instant" });
    written = window.scrollY;
    ScrollTrigger.update();
  };
  function tick(_time: number, deltaMs: number) {
    // Scrollbar dragging, focus, anchors, history and gallery code take priority.
    if (Math.abs(window.scrollY - written) > 1) { halt(); return; }
    const dt = Math.min(deltaMs / 1000, .064);
    const displacement = position - target;
    const impulse = (velocity + FREQUENCY * displacement) * dt;
    const decay = Math.exp(-FREQUENCY * dt);
    velocity = (velocity - FREQUENCY * impulse) * decay;
    position = target + (displacement + impulse) * decay;
    write(position);
    if (Math.abs(position - target) < POSITION_EPSILON && Math.abs(velocity) < VELOCITY_EPSILON) {
      write(target);
      halt();
    }
  }
  function nestedScroll(event: WheelEvent, delta: number) {
    for (const entry of event.composedPath()) {
      if (!(entry instanceof HTMLElement) || entry === document.body || entry === document.documentElement) continue;
      if (entry.matches('input, textarea, select, [contenteditable="true"], [data-native-scroll]')) return true;
      if (entry.scrollHeight <= entry.clientHeight + 1) continue;
      const style = getComputedStyle(entry);
      if (!/(auto|scroll|overlay)/.test(style.overflowY)) continue;
      if (style.overscrollBehaviorY === "contain" || style.overscrollBehaviorY === "none") return true;
      if (delta < 0 ? entry.scrollTop > 0 : entry.scrollTop + entry.clientHeight < entry.scrollHeight - 1) return true;
    }
    return false;
  }
  const wheel = (event: WheelEvent) => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || !event.cancelable) return;
    if (locks.size) { event.preventDefault(); return; }
    if (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY) || !event.deltaY) return;
    const delta = event.deltaY * (event.deltaMode === 1 ? 22 : event.deltaMode === 2 ? window.innerHeight : 1);
    if (nestedScroll(event, delta)) { halt(); return; }
    event.preventDefault();
    if (Math.abs(window.scrollY - written) > 1) halt();
    // Keep fractional trackpad input between idle events instead of resetting
    // the pending target before it can accumulate into a visible movement.
    if (!running) position = written = window.scrollY;
    // Cancel forward momentum immediately when the visitor reverses direction.
    if (velocity * delta < 0) { target = position; velocity = 0; }
    target = clamp(target + delta);
    if (!running && Math.abs(target - position) > POSITION_EPSILON) {
      running = true;
      gsap.ticker.add(tick);
    }
  };
  const nativeScroll = () => {
    if (Math.abs(window.scrollY - written) > 1) halt();
  };
  const key = (event: KeyboardEvent) => {
    const element = event.target instanceof HTMLElement ? event.target : null;
    if (element?.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (!["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(event.key)) return;
    halt();
    if (locks.size) event.preventDefault();
  };
  const touch = (event: TouchEvent) => {
    if (locks.size && event.cancelable) event.preventDefault();
  };
  const lock = (event: Event) => {
    if ((event as CustomEvent<boolean>).detail) locks.add(event.type);
    else locks.delete(event.type);
    halt();
  };
  const visibility = () => { if (document.hidden) halt(); };
  const resize = new ResizeObserver(measure);
  resize.observe(document.body);
  measure();
  window.addEventListener("wheel", wheel, { passive: false });
  window.addEventListener("scroll", nativeScroll, { passive: true });
  window.addEventListener("pointerdown", halt, { passive: true });
  window.addEventListener("touchstart", halt, { passive: true });
  window.addEventListener("touchmove", touch, { passive: false });
  window.addEventListener("keydown", key);
  window.addEventListener("resize", measure);
  window.addEventListener("hero-game-change", lock);
  window.addEventListener("project-transition", lock);
  document.addEventListener("visibilitychange", visibility);
  ScrollTrigger.addEventListener("refreshInit", halt);
  ScrollTrigger.addEventListener("refresh", measure);

  return () => {
    halt();
    resize.disconnect();
    window.removeEventListener("wheel", wheel);
    window.removeEventListener("scroll", nativeScroll);
    window.removeEventListener("pointerdown", halt);
    window.removeEventListener("touchstart", halt);
    window.removeEventListener("touchmove", touch);
    window.removeEventListener("keydown", key);
    window.removeEventListener("resize", measure);
    window.removeEventListener("hero-game-change", lock);
    window.removeEventListener("project-transition", lock);
    document.removeEventListener("visibilitychange", visibility);
    ScrollTrigger.removeEventListener("refreshInit", halt);
    ScrollTrigger.removeEventListener("refresh", measure);
  };
}
