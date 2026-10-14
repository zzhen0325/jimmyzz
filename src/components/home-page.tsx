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
        <h3><ScrambleText>CREATIVE DESIGNER</ScrambleText><br /><ScrambleText>ENGINEER</ScrambleText></h3>
      </div>
      <PortraitWarp />
      <div className="profile-statement">
        <p><ScrambleText>I am a designer with 9+ years of experience, working as a 2D and 3D generalist in the advertising space. I help brands bring bold, high-impact visuals to life from concept through final render.</ScrambleText></p>
        <p><ScrambleText>My tool kit mainly consists of Adobe After Effects, Cinema 4D, and Redshift, which I use for everything from motion graphics to photoreal 3D renders.</ScrambleText><br /><ScrambleText>At the core of my work is a drive to bridge the gap between artistic values and practical application — because the best ideas mean nothing without solid execution.</ScrambleText></p>
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
