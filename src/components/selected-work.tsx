"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { projects } from "@/lib/site-data";
import { SectionLabel } from "./site-chrome";

const selected = ["lemo-ai", "miaoshi-brand", "inner-species", "bandao"].map(
  (slug) => projects.find((project) => project.slug === slug)!,
);

export function SelectedWork() {
  return (
    <section id="selected-work" className="portfolio-section selected-work-section">
      <SectionLabel
        index="01"
        title="SELECTED WORK / 精选作品"
        time={`0${selected.length} SELECTED / ${projects.length} TOTAL`}
      />
      <div className="section-heading">
        <h2>
          Works
          <br />
          <span className="heading-muted">into experiences.</span>
        </h2>
        <p>
          从品牌到体验，从创意到工具。
          <br />
          选择一个项目，看看它如何发生。
        </p>
      </div>
      <div className="selected-work-list">
        {selected.map((project, index) => (
          <article className="work-row" key={project.slug}>
            <Link href={`/work/${project.slug}`} className="work-row-link" data-hover-label="view">
              <span className="work-row-index">
                <i aria-hidden="true" />
                Nº{String(index + 1).padStart(3, "0")}
              </span>
              <div className="work-row-copy">
                <h3>{project.title}</h3>
                <div className="work-row-description">
                  <p>{project.summary}</p>
                  <span className="work-row-tags">{project.tags.join(" / ")}</span>
                  <span className="work-row-cta">查看项目 <ArrowUpRight size={18} aria-hidden="true" /></span>
                </div>
              </div>
              <div className="work-row-media" style={{ backgroundColor: project.color }}>
                <Image
                  src={`/assets/portfolio/${project.slug}/feature.webp`}
                  alt={`${project.title}项目视觉`}
                  fill
                  sizes="(max-width: 599px) calc(100vw - 32px), (max-width: 809px) 42vw, 24vw"
                  className="work-row-image"
                />
                <span className="work-row-kind">{project.kind}</span>
              </div>
            </Link>
          </article>
        ))}
      </div>
      <Link href="/work" className="all-work-link">
        浏览全部 {projects.length} 个项目
        <ArrowUpRight size={22} />
      </Link>
    </section>
  );
}
