"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { TextRoll, textRollDuration, useTextRollInteraction } from "./text-roll";
import { ContactPanel, useContactDrawer } from "./contact-panel";

function ProjectNavLink({ href, children, className, label }: { href: string; children: string; className?: string; label?: string }) {
  const interaction = useTextRollInteraction(textRollDuration(children));
  return <Link href={href} className={className} aria-label={label ?? children} {...interaction}>
    <TextRoll>{children}</TextRoll>
  </Link>;
}

export function ProjectHeader() {
  const { open, setOpen, header, toggle, contact } = useContactDrawer();
  const interaction = useTextRollInteraction(textRollDuration("CONTACT"));
  return (
    <>
    <ContactPanel open={open} panelRef={contact} id="project-contact" />
    <header ref={header} className="case-header">
      <ProjectNavLink className="case-logo" href="/#top" label="Jimmy.zz 返回首页">Jimmy.zz</ProjectNavLink>
      <nav className="case-navigation" aria-label="项目页导航">
        <ProjectNavLink href="/#selected-work">WORK</ProjectNavLink>
        <ProjectNavLink href="/#introduction">ABOUT</ProjectNavLink>
        <button ref={toggle} type="button" className="case-contact" aria-label="Contact" aria-expanded={open} aria-controls="project-contact" {...interaction} onClick={() => setOpen(value => !value)}>
          <TextRoll>CONTACT</TextRoll>
        </button>
      </nav>
    </header>
    </>
  );
}

export function ProjectCopy({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const page = element.closest<HTMLElement>(".case-page");
    const logo = page?.querySelector<HTMLElement>(".case-logo");
    const resize = () => {
      if (logo && page) {
        const labelWidth = logo.getBoundingClientRect().right - element.getBoundingClientRect().left;
        page.style.setProperty("--case-label-width", `${Math.max(0, labelWidth)}px`);
      }
      // Tall copy scrolls naturally until its last line reaches the viewport bottom.
      const headerHeight = element.closest(".case-page")?.querySelector(".case-header")?.getBoundingClientRect().height ?? 64;
      element.style.setProperty("--case-copy-top", `${Math.min(headerHeight, window.innerHeight - element.offsetHeight - 28)}px`);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    if (logo) observer.observe(logo);
    window.addEventListener("resize", resize);
    resize();
    return () => { observer.disconnect(); window.removeEventListener("resize", resize); page?.style.removeProperty("--case-label-width"); };
  }, []);
  return <div ref={ref} className="case-copy">{children}</div>;
}
