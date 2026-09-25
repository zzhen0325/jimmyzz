"use client";

import { ScrambleText } from "./scramble-text";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { gsap, ScrollTrigger, useGSAP, motionConditions } from "@/lib/gsap";
import { projects, projectCover } from "@/lib/site-data";
import { selectedWork } from "@/lib/projects-config";
import styles from "./selected-work.module.css";

const compactSlugs = new Set(selectedWork.compact);
const selected = selectedWork.order.flatMap((slug) => {
  const project = projects.find((item) => item.slug === slug);
  return project ? [project] : [];
});

export function SelectedWork() {
  const root = useRef<HTMLElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add({ ...motionConditions, mobile: "(max-width: 809px)" }, ({ conditions }) => {
      if (conditions?.reduced || !root.current) return;
      const images = root.current.querySelectorAll<HTMLElement>("[data-work-skew]");
      const proxy = { skew: 0 };
      const limit = conditions?.mobile ? 6 : 12;
      const clamp = gsap.utils.clamp(-limit, limit);
      gsap.set(images, { skewY: 0, transformOrigin: "right center", force3D: true });
      const setSkew = gsap.quickSetter(images, "skewY", "deg");
      // Reuse a single recovery tween, even during long, fast scroll gestures.
      const settle = gsap.to(proxy, {
        skew: 0, duration: 0.8, ease: "power3.out", paused: true,
        onUpdate: () => setSkew(proxy.skew),
      });
      ScrollTrigger.create({
        trigger: root.current,
        start: "top bottom", end: "bottom top",
        onUpdate: (self) => {
          if (!self.isActive) return;
          const skew = clamp(self.getVelocity() / -300);
          if (Math.abs(skew) > Math.abs(proxy.skew) || skew * proxy.skew < 0) {
            proxy.skew = skew;
            setSkew(skew);
            settle.invalidate().restart();
          }
        },
      });
    }, root);
    return () => mm.revert();
  }, { scope: root });

  return (
    <section ref={root} tabIndex={-1} id="work-index" className={`${styles.section} relative px-[var(--page-pad)] pt-6 pb-[clamp(64px,8vw,128px)] text-[#0b0b0b] scroll-mt-[100px] outline-none max-[809px]:pb-16 max-[599px]:pt-4`} aria-label="精选作品">
      <div className="grid grid-cols-[var(--portfolio-grid)] items-start gap-x-[var(--grid-gap)] gap-y-[clamp(72px,8vw,144px)] max-[809px]:gap-y-16 max-[599px]:gap-y-9">
        {selected.map((project, index) => {
          const cover = project.selectedWorkCover;
          const isCompact = compactSlugs.has(project.slug);
          const isVideo = /\.(mp4|webm|mov|m4v|ogv)(?:[?#]|$)/i.test(cover);
          return (
            <article key={project.slug} className={styles.project} data-project={project.slug} data-size={isCompact ? "compact" : "large"}>
              <Link href={`/work/${project.slug}`} className={`${styles.projectLink} block`} data-hover-label={project.title} aria-label={`查看项目：${project.title}`}>
                <div className={styles.caption}><h3 className="text-[clamp(10px,1.15vw,20px)] font-medium tracking-[-.04em] wrap-anywhere max-[809px]:text-[14px]"><ScrambleText>{project.title}</ScrambleText></h3><span className="shrink-0 text-[clamp(10px,1.15vw,20px)] tracking-[-.05em] max-[809px]:text-[14px]"><ScrambleText>{String(index + 1).padStart(2, "0")}</ScrambleText><ScrambleText>.</ScrambleText></span></div>
                <div className={styles.image} data-work-skew>
                  {isVideo ? (
                    <video src={cover} poster={projectCover(project.slug)}
                      autoPlay muted loop playsInline preload="metadata"
                      aria-label={`${project.title}项目视频`} />
                  ) : (
                    <Image src={cover} alt={`${project.title}项目视觉`} fill
                      sizes={isCompact ? "(max-width: 599px) 44vw, (max-width: 809px) 24vw, 16vw" : "(max-width: 599px) 94vw, 50vw"} />
                  )}
                </div>
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}
