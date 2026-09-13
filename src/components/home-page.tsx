"use client";

import Image from "next/image";
import { useRef } from "react";
import { useHomeReveals } from "./home-reveals";
import { SelectedWork } from "./selected-work";
import { CurveGallery } from "./curve-gallery";
import { ArrowUpRight } from "lucide-react";
import { Footer, SectionLabel } from "./site-chrome";
import { profile, services } from "@/lib/site-data";
import { HoverLabel } from "./hover-label";
import { ChromeHero } from "./chrome-home";

function Capabilities() {
  return (
    <section id="services" className="portfolio-section">
      <SectionLabel
        index="03"
        title="PRACTICE / 设计实践"
        time="THINK → MAKE"
      />
      <div className="section-heading">
        <h2 aria-label="Think. Plan. Do. Repeat.">
          Think. Plan.
          <br />
          <span className="heading-muted">Do. Repeat.</span>
        </h2>
        <p>
          让设计既有表达，也有方法。
          <br />
          在不同业务与媒介之间，持续探索。
        </p>
      </div>
      <div className="capability-list">
        {services.map((s, index) => (
          <article key={s.title}>
            <span>0{index + 1}</span>
            <h3>{s.title}</h3>
            <p>{s.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
function About() {
  return (
    <section id="about" className="portfolio-section">
      <SectionLabel index="04" title="ABOUT / 关于我" time="HELLO, I'M ZZ" />
      <div className="about-layout">
        <div>
          <p className="eyebrow">ZZ / VISUAL DESIGNER</p>
          <h2>
            保持好奇，
            <br />
            让想法发生。
          </h2>
          <p className="about-intro">{profile.introduction}</p>
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
        </div>
      </div>
      <div className="experience-list">
        <p className="eyebrow">EXPERIENCE / 项目与经历</p>
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
        <SelectedWork />
        <CurveGallery />
        <Capabilities />
        <About />
        <Footer />
      </div>
    </main>
  );
}
