"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowUpRight } from "lucide-react";
import { categories, projects, type Category, type Project } from "@/lib/site-data";
import { OverloadReveal, Spark, useOverloadMotion } from "./overload-system";

export function OverloadCard({ project, index }: { project: Project; index: number }) {
  const video = useRef<HTMLVideoElement>(null);
  const { moving } = useOverloadMotion();
  const isVideo = /\.(mp4|webm|mov|m4v|ogv)(?:[?#]|$)/i.test(project.selectedWorkCover);
  useEffect(() => {
    const media = video.current;
    if (!media) return;
    let visible = false;
    const sync = () => { if (moving && visible && !document.hidden) void media.play().catch(() => {}); else media.pause(); };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }, { threshold: .15 });
    observer.observe(media); document.addEventListener("visibilitychange", sync);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", sync); media.pause(); };
  }, [moving]);
  return <article className="ol-work-card" data-reveal style={{ "--card-color": project.color } as CSSProperties}>
    <Link href={`/work/${project.slug}`} aria-label={`查看项目：${project.title}`}>
      <div className="ol-card-media">
        {isVideo ? <video ref={video} src={project.selectedWorkCover} poster={project.thumbnail} muted loop playsInline preload="none" aria-label={`${project.title}预览`} /> : <Image src={project.selectedWorkCover} alt={`${project.title}项目视觉`} fill sizes="(max-width: 700px) 92vw, 47vw" />}
        <span className="ol-card-number">[{String(index + 1).padStart(2, "0")}]</span>
        <span className="ol-card-open" aria-hidden="true"><ArrowUpRight /></span>
        <span className="ol-card-hover" aria-hidden="true">LET’S TAKE A LOOK ↗</span>
      </div>
      <div className="ol-card-title"><h3>{project.title}</h3><span>{project.kind}</span></div>
      <p className="ol-card-subtitle">{project.english}<span>{project.client}</span></p>
    </Link>
  </article>;
}

export function OverloadWorkIndex() {
  const [active, setActive] = useState<Category>("全部");
  const filtered = projects.filter(project => active === "全部" || project.kind === active);
  return <>
    <header className="ol-index-heading"><div className="ol-section-kicker"><span>THE THINGS I PUT INTO THE WORLD</span><span>作品档案 / {projects.length}</span></div><h1>ALL THE<br /><em>GOOD STUFF.</em><Spark /></h1><p>从品牌、角色到数字体验。<br />一些认真做的事，一些大胆的尝试。</p></header>
    <section className="ol-index" aria-label="作品列表">
      <div className="ol-filters" role="group" aria-label="按作品类型筛选">{categories.map(category => <button type="button" key={category} aria-pressed={active === category} onClick={() => setActive(category)}>{category}<sup>{category === "全部" ? projects.length : projects.filter(project => project.kind === category).length}</sup></button>)}</div>
      <p className="ol-filter-status" role="status">{active} / {String(filtered.length).padStart(2, "0")} PROJECTS</p>
      <OverloadReveal key={active} className="ol-work-grid">{filtered.map((project, index) => <OverloadCard project={project} index={index} key={project.slug} />)}</OverloadReveal>
    </section>
  </>;
}
