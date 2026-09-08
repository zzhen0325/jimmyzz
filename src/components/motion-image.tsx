"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useRef } from "react";
import { pointerSmear } from "@/lib/pointer-smear";

export function MotionImage(props: ImageProps) {
  const host = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const media = matchMedia("(prefers-reduced-motion: reduce), (pointer: coarse)");
    let engine: ReturnType<typeof pointerSmear> = null;
    const move = (event: PointerEvent) => {
      if (media.matches || event.pointerType === "touch") return;
      const image = element.querySelector("img");
      if (!image) return;
      engine ??= pointerSmear();
      try { engine?.move(element, image, event); }
      catch { engine?.release(element); }
    };
    const leave = () => engine?.leave(element);
    const reset = () => engine?.release(element);
    element.addEventListener("pointermove", move);
    element.addEventListener("pointerleave", leave);
    media.addEventListener("change", reset);
    return () => {
      reset();
      element.removeEventListener("pointermove", move);
      element.removeEventListener("pointerleave", leave);
      media.removeEventListener("change", reset);
    };
  }, []);
  return <span ref={host} className="motion-image"><Image draggable={false} {...props} alt={props.alt} /></span>;
}
