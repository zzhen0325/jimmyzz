"use client";

import { useEffect, useRef } from "react";

const SMILEYS = ["(＾▽＾)", "(◕‿◕)", "(^‿^)", "(≧◡≦)"];

/** One viewport-space owner keeps the sticker independent of scrolling transforms. */
export function HoverLabel() {
  const label = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = label.current;
    if (!element) return;
    const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let previousTime = 0;
    let active: Element | null = null;
    let visible = false;
    let pointerKnown = false;
    let targetDirty = false, needsHitTest = false;
    let pendingHit: Element | null = null;
    let activeText = "";
    let smileyIndex = 0;
    let usesDefaultLabel = false;
    let x = 0, y = 0, targetX = 0, targetY = 0;
    let angle = 0, angularVelocity = 0;
    let labelWidth = 0, labelHeight = 0;

    let characterAnimations: Animation[] = [];
    const clearCharacters = () => {
      characterAnimations.forEach((animation) => animation.cancel());
      characterAnimations = [];
    };

    const hide = () => {
      clearCharacters();
      visible = false;
      active?.removeAttribute("data-hover-label-active");
      active = null;
      activeText = "";
      usesDefaultLabel = false;
      element.dataset.visible = "false";
      cancelAnimationFrame(frame);
      frame = 0;
      targetDirty = needsHitTest = false;
      pendingHit = null;
    };
    const updateTarget = (hit: Element | null) => {
      const labeledSurface = hit?.closest<HTMLElement>("[data-hover-label]") ?? null;
      const control = hit?.closest("a, button, input, textarea, select, [role='button']");
      const hiddenControl = hit?.closest("button, [role='button'], input, textarea, select");
      const allowsLabel = hiddenControl === labeledSurface && labeledSurface?.hasAttribute("data-hover-label-on-control");
      if (!hit || !finePointer.matches || hit.closest("[data-native-cursor], [data-pointer-dragging], canvas:active, [contenteditable]:not([contenteditable='false']), summary, video[controls]") || (hiddenControl && !allowsLabel)) {
        hide();
        return;
      }
      const surface = labeledSurface && (!control || control === labeledSurface)
        ? labeledSurface
        : document.documentElement;
      const customText = surface.dataset.hoverLabel?.trim();
      usesDefaultLabel = !customText;
      element.dataset.projectCover = String(surface.matches('a[href^="/work/"]'));
      element.style.fontFamily = usesDefaultLabel ? "var(--font-mono)" : "";
      const text = customText || SMILEYS[smileyIndex];
      if (active !== surface || activeText !== text) {
        if (active !== surface) {
          active?.removeAttribute("data-hover-label-active");
          active = surface;
          surface.setAttribute("data-hover-label-active", "");
        }
        activeText = text;
        clearCharacters();
        const characters = Array.from(text);
        element.replaceChildren(...characters.map((character, index) => {
          const span = document.createElement("span");
          span.textContent = character === " " ? "\u00a0" : character;
          span.className = "hover-label-character";
          if (!reducedMotion.matches) {
            const direction = index % 2 === 0 ? 1 : -1;
            characterAnimations.push(span.animate([
              { opacity: 0, transform: `translate(${direction * (8 + index % 3 * 4)}px, ${direction * 16}px) rotate(${direction * 24}deg)` },
              { opacity: 1, transform: "translate(0, 0) rotate(0deg)" },
            ], {
              duration: 360,
              delay: (index * 7 % characters.length) * Math.min(22, 120 / Math.max(1, characters.length - 1)),
              easing: "cubic-bezier(0.16, 1, 0.3, 1)",
              fill: "backwards",
            }));
          }
          return span;
        }));
        labelWidth = element.offsetWidth;
        labelHeight = element.offsetHeight;
      }
      if (!visible) {
        x = targetX;
        y = targetY;
        angle = -12;
        angularVelocity = 0;
        visible = true;
        element.dataset.visible = "true";
      }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(animate); };
    function animate(time: number) {
      if (!element) return;
      frame = 0;
      if (targetDirty) {
        targetDirty = false;
        updateTarget(needsHitTest ? document.elementFromPoint(targetX, targetY) : pendingHit);
        needsHitTest = false;
      }
      if (!visible) return;
      const dt = Math.min((time - previousTime) / 16.667 || 1, 2);
      previousTime = time;
      const dx = targetX - x;
      const dy = targetY - y;
      const follow = reducedMotion.matches ? 1 : 1 - Math.pow(0.76, dt);
      x += dx * follow;
      y += dy * follow;
      const targetAngle = Math.max(-24, Math.min(24, dx * 0.3 - dy * 0.08));
      angularVelocity += ((targetAngle - angle) * 0.075 - angularVelocity * 0.23) * dt;
      angle = reducedMotion.matches ? 0 : angle + angularVelocity * dt;
      // Ease the center toward the pointer without adding a permanent offset.
      const radians = angle * Math.PI / 180;
      const halfWidth = (Math.abs(Math.cos(radians)) * labelWidth + Math.abs(Math.sin(radians)) * labelHeight) / 2;
      const halfHeight = (Math.abs(Math.sin(radians)) * labelWidth + Math.abs(Math.cos(radians)) * labelHeight) / 2;
      const renderX = Math.max(halfWidth + 4, Math.min(window.innerWidth - halfWidth - 4, x));
      const renderY = Math.max(halfHeight + 4, Math.min(window.innerHeight - halfHeight - 4, y));
      element.style.transform = `translate3d(${renderX}px, ${renderY}px, 0) translate(-50%, -50%) rotate(${angle}deg)`;
      if (visible && (Math.abs(dx) + Math.abs(dy) + Math.abs(angle) + Math.abs(angularVelocity) > 0.05)) {
        frame = requestAnimationFrame(animate);
      }
    }
    const move = (event: PointerEvent) => {
      if (event.pointerType === "touch") return leave();
      pointerKnown = true;
      targetX = event.clientX;
      targetY = event.clientY;
      pendingHit = event.target instanceof Element ? event.target : null;
      targetDirty = true;
      schedule();
    };
    const scroll = () => {
      if (!pointerKnown) return;
      targetDirty = needsHitTest = true;
      schedule();
    };
    const resize = () => {
      labelWidth = element.offsetWidth;
      labelHeight = element.offsetHeight;
      scroll();
    };
    const leave = () => { pointerKnown = false; hide(); };
    const visibility = () => { if (document.hidden) leave(); };
    const key = (event: KeyboardEvent) => { if (event.key === "Tab") leave(); };
    // Animated targets can move under a stationary pointer, even after the
    // follow animation has settled. Recheck independently of the label text.
    const hitTestTimer = window.setInterval(() => {
      if (!pointerKnown || !finePointer.matches || document.hidden) return;
      scroll();
    }, 100);
    const smileyTimer = window.setInterval(() => {
      if (!visible || !usesDefaultLabel || document.hidden) return;
      smileyIndex = (smileyIndex + 1) % SMILEYS.length;
      scroll();
    }, 1600);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", move, { passive: true });
    window.addEventListener("pointerup", scroll, { passive: true });
    window.addEventListener("pointercancel", leave);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("scroll", scroll, { passive: true, capture: true });
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("blur", leave);
    window.addEventListener("keydown", key);
    document.documentElement.addEventListener("pointerleave", leave);
    finePointer.addEventListener("change", hide);
    return () => {
      window.clearInterval(hitTestTimer);
      window.clearInterval(smileyTimer);
      hide();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", move);
      window.removeEventListener("pointerup", scroll);
      window.removeEventListener("pointercancel", leave);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("scroll", scroll, true);
      window.removeEventListener("blur", leave);
      window.removeEventListener("keydown", key);
      document.documentElement.removeEventListener("pointerleave", leave);
      finePointer.removeEventListener("change", hide);
    };
  }, []);

  return <div ref={label} className="hover-label" data-visible="false" aria-hidden="true" />;
}
