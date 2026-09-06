"use client";
import Image from "next/image";
import Link from "next/link";
import { useRef, type CSSProperties } from "react";
import { ArrowUpRight } from "lucide-react";
import { gsap, useGSAP, motionConditions } from "@/lib/gsap";
import { projects } from "@/lib/site-data";
import { SectionLabel } from "./site-chrome";
const selected = ["lemo-ai", "miaoshi-brand", "inner-species", "bandao"].map(
  (slug) => projects.find((p) => p.slug === slug)!,
);
export function SelectedWork() {
  const scope = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(
        motionConditions,
        ({ conditions }) => {
          const panels = Array.from(
            scope.current!.querySelectorAll<HTMLElement>("[data-work-panel]"),
          );
          if (conditions?.reduced) return;
          const stack = scope.current!.querySelector<HTMLElement>(".selected-stack")!;
          // Shared progress keeps earlier cards receding until the stack is complete.
          panels.forEach((panel, index) => {
            const card = panel.querySelector("a")!;
            const image = panel.querySelector("[data-work-image]")!;
            if (index < panels.length - 1) {
              gsap.to(card, {
                scale: 1 - (panels.length - index - 1) * 0.1,
                ease: "none",
                scrollTrigger: {
                  id: `selected-work-${index}`,
                  trigger: stack,
                  start: () => `top+=${index * panel.offsetHeight} top`,
                  end: () => `top+=${parseFloat(getComputedStyle(stack).paddingTop) + (panels.length - 1) * panel.offsetHeight} top+=${parseFloat(getComputedStyle(panel).top)}`,
                  scrub: true,
                  invalidateOnRefresh: true,
                },
              });
            }
            gsap.fromTo(image, { scale: 1.18 }, {
              scale: 1,
              ease: "none",
              scrollTrigger: {
                trigger: stack,
                start: () => `top+=${parseFloat(getComputedStyle(stack).paddingTop) + index * panel.offsetHeight} bottom`,
                end: () => `top+=${parseFloat(getComputedStyle(stack).paddingTop) + index * panel.offsetHeight} top+=${parseFloat(getComputedStyle(panel).top)}`,
                scrub: true,
                invalidateOnRefresh: true,
              },
            });
          });
        },
        scope,
      );
      return () => mm.revert();
    },
    { scope },
  );
  return (
    <section
      id="selected-work"
      ref={scope}
      className="portfolio-section selected-stack-section"
    >
      <SectionLabel
        index="01"
        title="SELECTED WORK / 精选作品"
        time="04 SELECTED / 12 TOTAL"
      />
      <div className="section-heading">
        <h2 aria-label="Ideas made into experiences.">
          Ideas made
          <br />
          <span className="heading-muted">into experiences.</span>
        </h2>
        <p>
          从品牌到体验，从创意到工具。
          <br />
          选择一个项目，看看它如何发生。
        </p>
      </div>
      <div className="selected-stack">
        {selected.map((project, index) => (
          <div
            className="work-stack-panel"
            data-work-panel
            key={project.slug}
            style={{ zIndex: index + 1, "--stack-index": index } as CSSProperties}
          >
            <Link
              href={`/work/${project.slug}`}
              className="work-stack-card"
              style={{ backgroundColor: project.color }}
            >
              <Image
                data-work-image
                src={`/assets/portfolio/${project.slug}/feature.webp`}
                alt={`${project.title}项目视觉`}
                fill
                sizes="(max-width: 809px) calc(100vw - 32px), 780px"
                className="stack-image"
              />
              <div className="stack-shade" />
              <div className="stack-top">
                <span>0{index + 1} / SELECTED WORK</span>
                <span>{project.kind}</span>
              </div>
              <div className="stack-title-window">
                <h3 className="stack-title">{project.title}</h3>
              </div>
              <div className="stack-bottom">
                <div>
                  <p>{project.summary}</p>
                  <span>{project.tags.join(" / ")}</span>
                </div>
                <ArrowUpRight size={30} />
              </div>
            </Link>
          </div>
        ))}
      </div>
      <Link href="/work" className="all-work-link">
        浏览全部 {projects.length} 个项目
        <ArrowUpRight size={22} />
      </Link>
    </section>
  );
}
