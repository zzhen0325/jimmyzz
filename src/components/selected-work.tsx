"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { gsap, ScrollTrigger, useGSAP, motionConditions } from "@/lib/gsap";
import { projects, projectCover } from "@/lib/site-data";
import styles from "./selected-work.module.css";

const featuredSlugs = ["lemo-ai", "miaoshi-brand", "inner-species", "bandao"];
const selected = [
  ...featuredSlugs.map((slug) => projects.find((project) => project.slug === slug)!),
  ...projects.filter((project) => !featuredSlugs.includes(project.slug)),
];

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
    <section ref={root} tabIndex={-1} id="selected-work" className={styles.section} aria-label="精选作品">
      <div className={styles.grid}>
        {selected.map((project) => (
          <article key={project.slug} className={styles.project}>
            <Link href={`/work/${project.slug}`} className={styles.projectLink} data-hover-label={project.title} aria-label={`查看项目：${project.title}`}>
              <div className={styles.image} data-work-skew>
                <Image src={projectCover(project.slug)} alt={`${project.title}项目视觉`} fill
                  sizes="(max-width: 599px) 44vw, (max-width: 809px) 29vw, 16vw" />
              </div>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
