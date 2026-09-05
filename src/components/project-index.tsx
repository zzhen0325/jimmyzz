"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import {
  categories,
  projects,
  projectCover,
  type Category,
} from "@/lib/site-data";
export function ProjectIndex() {
  const [active, setActive] = useState<Category>("全部");
  const filtered = projects.filter(
    (p) => active === "全部" || p.kind === active,
  );
  return (
    <section className="work-index">
      <div className="filter-bar" aria-label="按作品类型筛选">
        {categories.map((category) => (
          <button
            type="button"
            key={category}
            aria-pressed={category === active}
            onClick={() => setActive(category)}
          >
            {category}
            <sup>
              {category === "全部"
                ? projects.length
                : projects.filter((p) => p.kind === category).length}
            </sup>
          </button>
        ))}
      </div>
      <p className="filter-status" role="status">
        {active} / {String(filtered.length).padStart(2, "0")} 个项目
      </p>
      <div className="work-grid">
        {filtered.map((project, index) => (
          <Link
            key={project.slug}
            href={`/work/${project.slug}`}
            className="work-tile group"
          >
            <div
              className="project-art"
              style={{ backgroundColor: project.color }}
            >
              <Image
                src={projectCover(project.slug)}
                alt={`${project.title}项目封面`}
                loading={index < 2 ? "eager" : "lazy"}
                fill
                sizes="(max-width:809px) 100vw, 50vw"
                className="object-contain transition-transform duration-500 group-hover:scale-[1.03]"
              />
            </div>
            <div className="work-tile-heading">
              <h2>{project.title}</h2>
              <ArrowUpRight size={22} />
            </div>
            <p>{project.summary}</p>
            <div className="work-tile-meta">
              <span>{project.kind}</span>
              <span>{project.client}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
