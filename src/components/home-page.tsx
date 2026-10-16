"use client";

import { ScrambleText } from "./scramble-text";

import { useRef } from "react";
import { useHomeReveals } from "./home-reveals";
import { SelectedWork } from "./selected-work";
import { CurveGallery } from "./curve-gallery";
import { HoverLabel } from "./hover-label";
import { ChromeHero } from "./chrome-home";
import { DissolveFooter } from "./dissolve-footer";
import { PortraitWarp } from "./portrait-warp";
import "./home-grid.css";

function Introduction() {
  return (
    <section id="introduction" tabIndex={-1} className="profile-introduction" aria-labelledby="introduction-title">
      <div className="profile-identity">
        <h2 id="introduction-title"><ScrambleText>HEY, I’M ZZ</ScrambleText></h2>
        <h3><ScrambleText>CREATIVE DESIGNER</ScrambleText><br /><ScrambleText>& ENGINEER</ScrambleText></h3>
        <span className="profile-year">@2026</span>
      </div>
      <PortraitWarp />
      <div className="profile-statement">
        <div className="profile-language">
          <p lang="en"><ScrambleText>I’m a visual designer with 9+ years of experience in branding and visual marketing, having worked at Mafengwo, NetEase Cloud Music, and ByteDance.</ScrambleText></p>
          <p lang="en"><ScrambleText>I explore playful visuals and interactions, using AI to bring ideas to life and create design that connects with people.</ScrambleText></p>
        </div>
        {/* <div className="profile-language">
          <p lang="zh-CN"><ScrambleText>我是一名拥有 9 年以上经验的视觉设计师，专注于互联网领域的品牌与视觉营销，先后就职于马蜂窝、网易云音乐和字节跳动。</ScrambleText></p>
          <p lang="zh-CN"><ScrambleText>我始终热衷于创造有趣的设计，尤其着迷于视觉与交互碰撞出的可能。AI 帮助我突破了编程能力的限制，让我能更自由地探索创意，将想象中的视觉效果变为现实，也让创作过程更加高效。</ScrambleText></p>
          <p lang="zh-CN"><ScrambleText>我相信，设计的感染力不止于视觉。当它能回应人的参与，与人产生互动，便拥有了更深地打动人心的力量。</ScrambleText></p>
        </div> */}
      </div>
    </section>
  );
}

function FeaturedProjects() {
  return (
    <section id="selected-work" className="home-work-section" aria-labelledby="work-title" tabIndex={-1}>
      <h2 id="work-title" className="home-work-title"><ScrambleText>Work</ScrambleText></h2>
      <SelectedWork />
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
        <div className="home-work-ending">
          <CurveGallery />
          {/* 项目与经历目录暂时隐藏，保留组件以便后续恢复。 */}
        </div>
        <DissolveFooter />
      </div>
    </main>
  );
}
