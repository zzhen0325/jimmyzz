"use client";

import { ScrambleText } from "./scramble-text";

import { useRef } from "react";
import { useHomeReveals } from "./home-reveals";
import { SelectedWork } from "./selected-work";
import { CurveGallery } from "./curve-gallery";
import { HoverLabel } from "./hover-label";
import { ExperienceTimeline } from "./experience-timeline";
import { ChromeHero } from "./chrome-home";
import { PortraitWarp } from "./portrait-warp";
import "./home-grid.css";

function Introduction() {
  return (
    <section id="introduction" tabIndex={-1} className="profile-introduction" aria-labelledby="introduction-title">
      <div className="profile-identity">
        <h2 id="introduction-title"><ScrambleText>Hey, I’m ZZ.</ScrambleText></h2>
      </div>
      <div className="profile-statement">
        <h3><ScrambleText>Creative Designer &amp; Engineer</ScrambleText></h3>
        <p><ScrambleText>I am a designer with 9+ years of experience, working as a 2D and 3D generalist in the advertising space. I help brands bring bold, high-impact visuals to life from concept through final render.</ScrambleText></p>
        <p><ScrambleText>My tool kit mainly consists of Adobe After Effects, Cinema 4D, and Redshift, which I use for everything from motion graphics to photoreal 3D renders.</ScrambleText><br /><ScrambleText>At the core of my work is a drive to bridge the gap between artistic values and practical application — because the best ideas mean nothing without solid execution.</ScrambleText></p>
        <p className="profile-year"><ScrambleText>©2026</ScrambleText></p>
        <div className="profile-clients" aria-label="合作品牌"><span><ScrambleText>字节跳动</ScrambleText></span><span><ScrambleText>网易云音乐</ScrambleText></span><span><ScrambleText>Lemon8</ScrambleText></span><span><ScrambleText>马蜂窝</ScrambleText></span></div>
      </div>
      <PortraitWarp />
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
          <ExperienceTimeline />
          <CurveGallery />
        </div>
        <footer className="home-credits">
          <span><ScrambleText>©2026 ZZ · 张振</ScrambleText></span>
          <span><ScrambleText>Black Hole by </ScrambleText><a href="https://sketchfab.com/3d-models/black-hole-e410da98b1e5445eae2acafaaa53587d"><ScrambleText>NestaEric</ScrambleText></a> <ScrambleText>· </ScrambleText><a href="https://creativecommons.org/licenses/by/4.0/"><ScrambleText>CC BY 4.0</ScrambleText></a> <ScrambleText>· Adapted for web</ScrambleText></span>
        </footer>
      </div>
    </main>
  );
}
