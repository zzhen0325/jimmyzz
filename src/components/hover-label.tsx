"use client";

import { useEffect, useRef } from "react";

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
    let x = 0, y = 0, targetX = 0, targetY = 0;
    let angle = 0, angularVelocity = 0;

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
      element.dataset.visible = "false";
      cancelAnimationFrame(frame);
      frame = 0;
    };
    const updateTarget = () => {
      const hit = document.elementFromPoint(targetX, targetY);
      const surface = hit?.closest<HTMLElement>("[data-hover-label]") ?? null;
      const control = hit?.closest("a, button, input, textarea, select, [role='button']");
      if (!finePointer.matches || !surface || (control && control !== surface)) {
        hide();
        return;
      }
      if (active !== surface) {
        active?.removeAttribute("data-hover-label-active");
        active = surface;
        surface.setAttribute("data-hover-label-active", "");
        clearCharacters();
        const characters = Array.from(surface.dataset.hoverLabel ?? "");
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
      }
      if (!visible) {
        x = targetX;
        y = targetY;
        angle = -12;
        angularVelocity = 0;
        visible = true;
        element.dataset.visible = "true";
      }
      if (!frame) frame = requestAnimationFrame(animate);
    };
    function animate(time: number) {
      if (!element) return;
      frame = 0;
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
      const left = Math.max(12, Math.min(innerWidth - element.offsetWidth - 12, x + 20));
      const top = Math.max(12, Math.min(innerHeight - element.offsetHeight - 12, y + 16));
      element.style.transform = `translate3d(${left}px, ${top}px, 0) rotate(${angle}deg)`;
      if (visible && (Math.abs(dx) + Math.abs(dy) + Math.abs(angle) + Math.abs(angularVelocity) > 0.05)) {
        frame = requestAnimationFrame(animate);
      }
    }
    const move = (event: PointerEvent) => {
      if (event.pointerType === "touch") return hide();
      pointerKnown = true;
      targetX = event.clientX;
      targetY = event.clientY;
      updateTarget();
    };
    const scroll = () => { if (pointerKnown) updateTarget(); };
    const leave = () => { pointerKnown = false; hide(); };
    const key = (event: KeyboardEvent) => { if (event.key === "Tab") leave(); };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("scroll", scroll, { passive: true, capture: true });
    window.addEventListener("blur", leave);
    window.addEventListener("keydown", key);
    document.documentElement.addEventListener("pointerleave", leave);
    finePointer.addEventListener("change", hide);
    return () => {
      hide();
      window.removeEventListener("pointermove", move);
      window.removeEventListener("scroll", scroll, true);
      window.removeEventListener("blur", leave);
      window.removeEventListener("keydown", key);
      document.documentElement.removeEventListener("pointerleave", leave);
      finePointer.removeEventListener("change", hide);
    };
  }, []);

  return <div ref={label} className="hover-label" data-visible="false" aria-hidden="true" />;
}
