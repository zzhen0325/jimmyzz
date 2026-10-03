"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState, type CSSProperties } from "react";
import { ArrowUpRight, Shuffle } from "lucide-react";
import { gsap, useGSAP } from "@/lib/gsap";
import { profile, projects, services } from "@/lib/site-data";
import { curveGallery, selectedWork, additionalExperience } from "@/lib/projects-config";
import { DownLink, Orbit, OverloadFooter, OverloadNav, OverloadReveal, Spark, useOverloadMotion } from "./overload-system";
import { OverloadCard } from "./overload-work";

const Sculpture = dynamic(() => import("./overload-sculpture"), {
  ssr: false,
  loading: () => <div className="ol-sculpture" aria-hidden="true"><div className="ol-sculpture-fallback">✳</div></div>,
});
const selected = selectedWork.order.slice(0, 6).flatMap(slug => projects.find(project => project.slug === slug) ?? []);

function Hero() {
  const scope = useRef<HTMLElement>(null);
  const [remix, setRemix] = useState(0);
  const { moving } = useOverloadMotion();
  useGSAP(() => {
    if (!moving) return;
    gsap.from(".ol-hero-line > span", { yPercent: 115, rotate: 5, stagger: .12, duration: 1.15, ease: "power4.out" });
    gsap.from(".ol-hero-art", { scale: .65, rotate: -12, opacity: 0, duration: 1.5, ease: "power3.out", delay: .2 });
    gsap.to(".ol-hero-heading", { y: -75, rotate: -3, scrollTrigger: { trigger: scope.current, start: "top top", end: "bottom top", scrub: 1 } });
    gsap.to(".ol-hero-art", { y: 95, rotate: 12, scrollTrigger: { trigger: scope.current, start: "top top", end: "bottom top", scrub: 1 } });
  }, { scope, dependencies: [moving], revertOnUpdate: true });
  return <section ref={scope} className="ol-hero" aria-label="Jimmy ZZ 创意设计工作室" data-remix={remix % 3}>
    <OverloadNav />
    <div className="ol-hero-meta"><span>VISUAL DESIGN × CREATIVE TECHNOLOGY</span><span>张振 / DESIGNER & MAKER</span><span>PORTFOLIO — 2026</span></div>
    <div className="ol-hero-stage">
      <h1 className="ol-hero-heading" aria-label="Make some noise. Jimmy ZZ — 视觉设计与创意技术"><span className="ol-hero-line"><span>MAKE</span></span><span className="ol-hero-line"><span><i>SOME</i></span></span><span className="ol-hero-line"><span>NOISE<span className="ol-period">.</span></span></span></h1>
      <div className="ol-hero-art"><div className="ol-art-grid" /><Orbit className="ol-orbit ol-orbit-back" /><Sculpture remix={remix} /><span className="ol-art-label">FIG. 01 — A MIND OF ITS OWN</span><span className="ol-art-cross">+</span></div>
      <div className="ol-sticker"><Spark /><span>GOOD IDEAS<br />DON’T SIT STILL.</span></div>
      <span className="ol-side-note">A LITTLE CHAOS. A LOT OF CURIOSITY.</span>
      <button className="ol-remix" type="button" onClick={() => setRemix(value => value + 1)}><Shuffle size={16} /><span>REMIX THE MOOD</span><span aria-live="polite">0{remix % 3 + 1}</span></button>
    </div>
    <div className="ol-hero-bottom"><p>让想法有形，让创意发生。<br /><span>Brand, motion, digital & everything in between.</span></p><DownLink /></div>
    <div className="ol-checker" aria-hidden="true" />
  </section>;
}

function Playground() {
  const [offset, setOffset] = useState(0);
  const picks = curveGallery.slice(11);
  return <section id="gallery" className="ol-playground">
    <div className="ol-section-kicker"><span>02 / THE PLAYGROUND</span><span>NO BRIEF. JUST CURIOSITY.</span></div>
    <div className="ol-play-title" data-reveal><h2>SERIOUS<br /><em>ABOUT PLAY.</em></h2><p>让灵感跑一会儿。<br />插画、角色、三维，还有计划之外的惊喜。</p><Orbit /></div>
    <div className="ol-play-cards">{Array.from({ length: 5 }, (_, i) => { const item = picks[(offset + i * 3) % picks.length]; return <Link className="ol-play-card" style={{ "--tilt": `${[-12, 8, -4, 11, -8][i]}deg`, "--order": i } as CSSProperties} href={`/work/${item.project}`} key={`${i}-${item.name}`} aria-label={`查看${item.title}`}><div><Image src={item.src} alt={item.title} fill sizes="(max-width:700px) 45vw, 22vw" /></div><span>{item.title}<ArrowUpRight size={16} /></span></Link>; })}</div>
    <div className="ol-play-bottom"><Link href="/activity-sphere">进入 3D 视觉漫游 <ArrowUpRight size={18} /></Link><button type="button" onClick={() => setOffset(value => (value + 1) % picks.length)}><Shuffle size={16} /> 换一组灵感</button><span aria-live="polite">EXPERIMENT SET / {String(offset + 1).padStart(2, "0")}</span></div>
  </section>;
}

export function HomePage() {
  return <main className="ol-home" id="top">
    <Hero />
    <OverloadReveal>
      <section id="selected-work" className="ol-selected">
        <div className="ol-section-kicker"><span>01 / SELECTED WORK</span><span>IDEAS OUT IN THE WILD.</span></div>
        <div className="ol-work-heading" data-reveal><h2>GOOD WORK.<br /><span>LOUD IDEAS.</span></h2><div><Spark /><p>不设限的表达。<br />有目的的设计。</p></div></div>
        <div className="ol-work-grid">{selected.map((project, index) => <OverloadCard project={project} index={index} key={project.slug} />)}</div>
        <Link className="ol-all-work" href="/work"><span>还有更多好东西。<small>VIEW ALL {projects.length} PROJECTS</small></span><ArrowUpRight /></Link>
      </section>
      <Playground />
      <section id="introduction" className="ol-about">
        <div className="ol-section-kicker"><span>03 / THE PERSON BEHIND THE PIXELS</span><span>ALWAYS IN THE MAKING.</span></div>
        <div className="ol-about-grid"><div className="ol-about-portrait" data-reveal><Image src="/assets/images/fluted-portrait-smile.jpg" width={600} height={600} alt="张振的创意肖像" /><span>HELLO, HUMAN! ↗</span><Orbit /></div><div className="ol-about-copy" data-reveal><h2>HEY,<br />I’M <em>ZZ.</em><Spark /></h2><h3>Creative Designer & Engineer</h3><p>{profile.introduction}</p><p className="ol-about-english">9+ years of turning ideas into images, experiences and useful things. From the first sketch to the final frame — curious about the whole process.</p><a href={`mailto:${profile.email}`}>一起聊聊新的可能 <ArrowUpRight size={19} /></a></div></div>
        <div className="ol-clients"><span>GOOD COMPANY</span><span>字节跳动</span><span>网易云音乐</span><span>Lemon8</span><span>马蜂窝</span></div>
      </section>
      <section id="services" className="ol-services"><div className="ol-section-kicker"><span>04 / WHAT I BRING TO THE TABLE</span><span>想法，和实现它的方法。</span></div>{services.map((service, index) => <article key={service.title} data-reveal><span>0{index + 1}</span><h3>{service.title}</h3><p>{service.text}</p><Spark /></article>)}<div className="ol-experience-note">{additionalExperience.map(entry => <p key={entry.title}>{entry.company} / {entry.title}<span>{entry.category}</span></p>)}</div></section>
    </OverloadReveal>
    <OverloadFooter />
  </main>;
}
