"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { ScrambleText } from "./scramble-text";
import { markProjectVisited } from "@/lib/home-loading";

export function ProjectHeader() {
  useEffect(markProjectVisited, []);
  return (
    <header className="case-header">
      <Link className="case-logo" href="/#top" aria-label="Jimmy.zz 返回首页"><ScrambleText>Jimmy.zz</ScrambleText></Link>
      <nav className="case-navigation" aria-label="项目页导航">
        <Link href="/#selected-work">WORK</Link>
        <Link href="/#introduction">ABOUT</Link>
        <Link href="/#gallery">MORE</Link>
      </nav>
    </header>
  );
}

export function ProjectCopy({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const resize = () => {
      // Tall copy scrolls naturally until its last line reaches the viewport bottom.
      const headerHeight = element.closest(".case-page")?.querySelector(".case-header")?.getBoundingClientRect().height ?? 64;
      element.style.setProperty("--case-copy-top", `${Math.min(headerHeight, window.innerHeight - element.offsetHeight - 28)}px`);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    window.addEventListener("resize", resize);
    resize();
    return () => { observer.disconnect(); window.removeEventListener("resize", resize); };
  }, []);
  return <div ref={ref} className="case-copy">{children}</div>;
}
