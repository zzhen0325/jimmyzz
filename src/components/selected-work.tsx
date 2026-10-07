"use client";

import { ScrambleText } from "./scramble-text";

import Image from "next/image";
import Link from "next/link";
import { type CSSProperties } from "react";
import { ScrollBend } from "./scroll-bend";
import { projects, projectCover } from "@/lib/site-data";
import { selectedWork } from "@/lib/projects-config";
import styles from "./selected-work.module.css";
import { ProjectCoverReveal } from "./project-cover-reveal";
import { HoverCoverVideo } from "./hover-cover-video";

const compactSlugs = new Set(selectedWork.compact);
const selected = selectedWork.order.flatMap((slug) => {
  const project = projects.find((item) => item.slug === slug);
  return project ? [project] : [];
});

export function SelectedWork() {
  return (
    <section tabIndex={-1} id="work-index" className={styles.section} aria-label="精选作品">
      <ScrollBend className={styles.grid}>
        {selected.map((project, index) => {
          const cover = project.selectedWorkCover;
          const isPortrait = (project.coverHeight ?? 9) > (project.coverWidth ?? 16);
          const isCompact = isPortrait || compactSlugs.has(project.slug);
          const isVideo = /\.(mp4|webm|mov|m4v|ogv)(?:[?#]|$)/i.test(cover);
          return (
            <article key={project.slug} className={styles.project} data-project={project.slug} data-size={isCompact ? "compact" : "large"} data-portrait={isPortrait || undefined}
              style={{ "--work-row": Math.floor(index / 2) + 1 } as CSSProperties}>
              <Link href={`/work/${project.slug}`} className={styles.projectLink} data-hover-label={project.title} aria-label={`查看项目：${project.title}`}>
                <div className={styles.caption} data-work-caption><h3><ScrambleText>{project.title}</ScrambleText></h3><span><ScrambleText>{String(index + 1).padStart(2, "0")}</ScrambleText><ScrambleText>.</ScrambleText></span></div>
                <ProjectCoverReveal className={styles.image} style={{ aspectRatio: `${project.coverWidth ?? 16} / ${project.coverHeight ?? 9}` }}>
                  {isVideo ? (
                    <video src={cover} poster={projectCover(project.slug)}
                      muted loop playsInline preload="none"
                      aria-label={`${project.title}项目视频`} />
                  ) : (
                    <Image src={cover} alt={`${project.title}项目视觉`} fill
                      sizes={`(max-width: 599px) ${[0, 7, 9].includes(index) ? "94vw" : "46vw"}, ${[0, 3, 7, 9].includes(index) ? "50vw" : "34vw"}`} />
                  )}
                  {project.hoverVideo && <HoverCoverVideo src={project.hoverVideo} />}
                </ProjectCoverReveal>
              </Link>
            </article>
          );
        })}
      </ScrollBend>
    </section>
  );
}
