"use client";

import Image from "next/image";
import "./capabilities.css";
import { HomeSectionHeading } from "./home-section-heading";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { projectAssets, projectCover, services } from "@/lib/site-data";

const previews = [
  ["miaoshi-brand", "bandao", "meetup-plan"].map(projectCover),
  ["inner-species", "lemon8-campaigns", "winter-gathering"].map(projectCover),
  projectAssets("lemo-ai").filter((asset) => /workshop|lora|playground-v1/.test(asset.name)).map((asset) => asset.src),
  [projectCover("design-operations"), "/assets/portfolio/social-live/guidelines.webp", "/assets/portfolio/social-live/business.webp"],
];

function CapabilityRow({ index }: { index: number }) {
  const service = services[index];
  const [active, setActive] = useState(false);
  const [frame, setFrame] = useState(0);
  const row = useRef<HTMLElement>(null);
  const preview = useRef<HTMLDivElement>(null);
  const images = previews[index];

  useEffect(() => {
    if (!active) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: ReturnType<typeof setInterval> | undefined;
    const stop = () => clearInterval(timer);
    const resume = () => {
      stop();
      if (!reduced.matches && !document.hidden) {
        timer = setInterval(() => setFrame((current) => (current + 1) % images.length), 700);
      }
    };
    resume();
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) setActive(false);
    });
    if (row.current) observer.observe(row.current);
    document.addEventListener("visibilitychange", resume);
    reduced.addEventListener("change", resume);
    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener("visibilitychange", resume);
      reduced.removeEventListener("change", resume);
    };
  }, [active, images.length]);

  const activate = () => { setFrame(0); setActive(true); };
  const followPointer = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== "mouse" || !row.current || !preview.current) return;
    const bounds = row.current.getBoundingClientRect();
    const size = preview.current.offsetWidth;
    const gap = 20;
    // Flip beside the cursor near the viewport edge, keeping the image visible.
    const x = event.clientX + size + gap > window.innerWidth - 12
      ? event.clientX - size - gap : event.clientX + gap;
    const y = Math.max(12, Math.min(event.clientY - size / 2, window.innerHeight - size - 12));
    preview.current.style.setProperty("--cursor-x", `${Math.max(12, x) - bounds.left}px`);
    preview.current.style.setProperty("--cursor-y", `${y - bounds.top}px`);
    row.current.dataset.following = "true";
  };
  const stopFollowing = () => {
    if (row.current) delete row.current.dataset.following;
  };
  return (
    <article ref={row} className="capability-row" data-active={active}
      onPointerEnter={(event) => { if (event.pointerType === "mouse") { followPointer(event); activate(); } }}
      onPointerMove={followPointer}
      onPointerDown={(event) => { if (event.pointerType !== "mouse") stopFollowing(); }}
      onPointerLeave={() => setActive(false)}
      onFocus={(event) => { if (event.target.matches(":focus-visible")) stopFollowing(); activate(); }} onBlur={() => setActive(false)}>
      <span className="capability-number">0{index + 1}</span>
      <h3>
        <button type="button" className="capability-trigger" aria-label={`${service.title}：预览相关项目`}
          aria-expanded={active} aria-controls={`capability-preview-${index}`}
          onClick={() => { setFrame(0); setActive(true); }}
          onKeyDown={(event) => { if (event.key === "Escape") setActive(false); }}>
          <span className="capability-text" aria-hidden="true">
            <span className="capability-measure">{service.title}</span>
            <span className="capability-animation" data-capability-reveal>{service.title}</span>
          </span>
        </button>
      </h3>
      <p aria-label={service.text}>
        <span className="capability-text" aria-hidden="true">
          <span className="capability-measure">{service.text}</span>
          <span className="capability-animation" data-capability-reveal>{service.text}</span>
        </span>
      </p>
      <div ref={preview} className="capability-preview" id={`capability-preview-${index}`} aria-hidden="true">
        {images.map((src, imageIndex) => (
          <Image key={src} src={src} alt="" fill loading="eager" sizes="(max-width: 809px) 88px, 180px"
            className={imageIndex === frame ? "is-current" : ""} />
        ))}
      </div>
    </article>
  );
}

export function Capabilities() {
  return (
    <section id="services" className="portfolio-section capabilities-section" aria-label="设计实践">
      <HomeSectionHeading index="03" label="PRACTICE / 设计实践" title="From vision to making." id="practice-title">
        <p>根据问题选择表达方式，把视觉、体验与技术连接起来。以下是我持续投入的四个方向。</p>
      </HomeSectionHeading>
      <div className="capability-list">
        {services.map((service, index) => <CapabilityRow key={service.title} index={index} />)}
      </div>
    </section>
  );
}
