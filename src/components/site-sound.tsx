"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { initSound, playSound, setSoundEnabled, soundDisabledOnServer, soundEnabled, subscribeSound, suspendSound, unlockSound } from "@/lib/site-sound";
import styles from "./site-sound.module.css";

const selector = 'a[href], button, [role="button"]';
function target(event: Event) {
  const node = event.target instanceof Element ? event.target.closest<HTMLElement>(selector) : null;
  return node && !node.closest('[inert], [data-sound="off"], [data-sound-toggle]') && !node.matches(':disabled, [aria-disabled="true"]') ? node : null;
}

export function SiteSound() {
  const enabled = useSyncExternalStore(subscribeSound, soundEnabled, soundDisabledOnServer);
  useEffect(() => {
    initSound();
    let transitioning = false;
    const hover = (event: PointerEvent) => {
      if (transitioning || event.pointerType !== "mouse" || event.buttons || !matchMedia("(hover: hover)").matches) return;
      const node = target(event);
      if (node && !(event.relatedTarget instanceof Node && node.contains(event.relatedTarget))) playSound("hover");
    };
    const click = (event: MouseEvent) => {
      if (event.button || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      const node = target(event);
      if (!node) return;
      // Expanded state has already been updated by React by the document bubble phase.
      playSound(node.hasAttribute("aria-controls") && node.getAttribute("aria-expanded") === "true" ? "menu-open" : "click");
    };
    const key = (event: KeyboardEvent) => { if (!event.repeat) unlockSound(); };
    const visibility = () => { if (document.hidden) suspendSound(); };
    const transition = (event: Event) => { transitioning = Boolean((event as CustomEvent<boolean>).detail); };
    document.addEventListener("pointerdown", unlockSound, true);
    document.addEventListener("keydown", key, true);
    document.addEventListener("pointerover", hover);
    document.addEventListener("click", click);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("project-transition", transition);
    return () => {
      document.removeEventListener("pointerdown", unlockSound, true);
      document.removeEventListener("keydown", key, true);
      document.removeEventListener("pointerover", hover);
      document.removeEventListener("click", click);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("project-transition", transition);
      suspendSound();
    };
  }, []);
  return <button type="button" className={styles.toggle} data-sound-toggle aria-label={enabled ? "关闭音效" : "开启音效"} aria-pressed={enabled} title={enabled ? "关闭音效" : "开启音效"} onClick={() => {
    unlockSound();
    setSoundEnabled(!enabled);
    if (!enabled) playSound("click");
  }}>
    {enabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
    <span>SOUND {enabled ? "ON" : "OFF"}</span>
  </button>;
}
