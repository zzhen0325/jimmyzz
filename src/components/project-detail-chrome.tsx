"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { FloatingNav } from "./floating-nav";

export function ProjectHeader() {
  return <FloatingNav ready variant="project" />;
}

export function ProjectCopy({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const resize = () => {
      // Tall copy scrolls naturally until its last line reaches the viewport bottom.
      element.style.setProperty("--case-copy-top", `${Math.min(112, window.innerHeight - element.offsetHeight - 28)}px`);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    window.addEventListener("resize", resize);
    resize();
    return () => { observer.disconnect(); window.removeEventListener("resize", resize); };
  }, []);
  return <div ref={ref} className="case-copy">{children}</div>;
}
