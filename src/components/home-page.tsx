"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { useHomeReveals } from "./home-reveals";
import { SelectedWork } from "./selected-work";
import { CurveGallery } from "./curve-gallery";
import { ArrowUpRight } from "lucide-react";
import { Footer } from "./site-chrome";
import { profile, projects, projectCover } from "@/lib/site-data";
import { HoverLabel } from "./hover-label";
import { Capabilities } from "./capabilities";
import { ChromeHero } from "./chrome-home";
import { HomeSectionHeading } from "./home-section-heading";
import "./home-grid.css";

function Introduction() {
  return (
    <section id="introduction" tabIndex={-1} className="profile-introduction" aria-labelledby="introduction-title">
      <div className="profile-identity">
        <p className="home-chapter">ZZ / 张振</p>
        <h2 id="introduction-title" data-profile-reveal>Hey, I&apos;m ZZ.</h2>
        <p className="profile-role">Creative Designer<br />&amp; Engineer</p>
      </div>
      <div className="profile-statement">
        <p className="profile-lead" data-profile-reveal>Building brands.<br />Connecting people.<br />Exploring what&apos;s next.</p>
        <div className="profile-context">
          <p>用视觉建立品牌，用体验连接用户。<br />从品牌、插画到交互与 AI 工具，<br />让有趣的想法成为真实的体验。</p>
          <a className="home-text-link" href="#selected-work">向下看作品 <span aria-hidden="true">↓</span></a>
        </div>
      </div>
    </section>
  );
}

function FeaturedProjects() {
  return (
    <section id="selected-work" className="home-work-section" aria-labelledby="work-title" tabIndex={-1}>
      <HomeSectionHeading index="01" label="SELECTED WORK / 作品" title="Ideas into experiences." id="work-title">
        <p>从品牌表达，到用户参与，再到创作工具。三个项目，呈现我如何把想法落到不同的场景。</p>
      </HomeSectionHeading>
      <div className="intro-image-strip">
        {["miaoshi-brand", "inner-species", "lemo-ai"].map((slug, index) => {
          const project = projects.find((item) => item.slug === slug)!;
          return <article className="intro-image-slot" key={slug}>
            <Link className="intro-image-card" href={`/work/${slug}`} aria-label={`查看项目：${project.title}`}>
              <Image src={projectCover(slug)} alt={`${project.title}项目视觉`} fill sizes="(max-width: 599px) 92vw, 32vw" />
            </Link>
            <div className="featured-caption">
              <p className="featured-meta"><span>0{index + 1} / {project.kind}</span><span>{project.client}</span></p>
              <h3><Link href={`/work/${slug}`}>{project.title}<ArrowUpRight size={20} aria-hidden="true" /></Link></h3>
              <p className="featured-summary">{project.summary}</p>
            </div>
          </article>;
        })}
      </div>
      <SelectedWork />
    </section>
  );
}

function About() {
  return (
    <section id="about" className="portfolio-section" aria-labelledby="about-title">
      <HomeSectionHeading index="04" label="ABOUT / 关于我" title="Always curious." id="about-title">
        <p>在不同的团队与项目之间，持续拓宽设计的边界，也保持对细节的耐心。</p>
      </HomeSectionHeading>
      <div className="about-layout">
        <div>
          <p className="eyebrow">ZZ / VISUAL DESIGNER</p>
          <h3>
            保持好奇，
            <br />
            让想法发生。
          </h3>
          <p className="about-intro">我是张振，也可以叫我 ZZ。我的实践跨越品牌、营销视觉与数字体验，参与过 Lemon8、网易云音乐、马蜂窝及今日头条相关项目。</p>
          <p className="about-intro">喜欢在插画、字体、三维和代码之间切换。对我来说，设计既是表达，也是不断试验、整理和改进的过程。</p>
          <a className="contact-link" href={`mailto:${profile.email}`}>
            {profile.email}
            <ArrowUpRight size={20} />
          </a>
        </div>
        <div className="about-art">
          <Image
            src="/assets/portfolio/profile/cover.webp"
            alt="张振作品集封面：Think、Plan、Do、Review、Repeat 五个彩色路牌"
            width={1920}
            height={1080}
            sizes="(max-width:809px) 100vw, 55vw"
          />
          <p className="about-art-caption"><span>THINK → PLAN → DO → REVIEW → REPEAT</span><span>我的创作循环</span></p>
        </div>
      </div>
      <div className="experience-list">
        <div className="experience-heading"><h3 className="home-chapter">EXPERIENCE / 项目与经历</h3><p>不同场景，一条持续探索的线索。</p></div>
        {[
          [
            "Lemon8",
            "海外活动视觉 / AIGC 工具与流程",
            "US、JP、SEA 活动视觉，以及 AI Workshop、LoRA 和团队创作平台实践。",
          ],
          [
            "网易云音乐",
            "品牌 / 营销 / 团队建设",
            "社交直播业务线视觉设计，涵盖妙时、伴岛、心遇等产品及团队资源规划。",
          ],
          [
            "马蜂窝",
            "用户增长 / 成长体系",
            "参与旅行地图、成就勋章、足迹与打卡地图等项目。",
          ],
          [
            "字节跳动",
            "今日头条 UED",
            "参与今日头条、西瓜视频日常运营及品牌活动设计。",
          ],
        ].map(([name, role, text]) => (
          <article key={name}>
            <h3>{name}</h3>
            <div>
              <h4>{role}</h4>
              <p>{text}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
export function HomePage() {
  const scope = useRef<HTMLElement>(null);
  useHomeReveals(scope);
  return (
    <main ref={scope} className="home-page" id="top">
      <HoverLabel />
      <ChromeHero />
      <div className="home-content">
        <Introduction />
        <FeaturedProjects />
        <CurveGallery />
        <Capabilities />
        <About />
        <Footer />
      </div>
    </main>
  );
}
