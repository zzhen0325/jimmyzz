"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import homeStyles from "./chrome-home.module.css";

const ChromeScene = dynamic(() => import("./chrome-scene"), { ssr: false });

export function ProjectHeader() {
  const workProgress = useRef(1);
  return <header className="case-home-header">
    <Link href="/" className={`${homeStyles.wordmark} case-home-wordmark`} aria-label="Jimmy ZZ 首页">Jimmy ZZ<span>®</span></Link>
    <div className="case-home-scene" aria-hidden="true"><ChromeScene workProgress={workProgress} interactive={false} /></div>
    <Link href="/" className="case-home-logo" aria-label="返回首页">
      <span className="case-logo-fallback">ZZ</span>
    </Link>
  </header>;
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
