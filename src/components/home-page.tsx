"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useHomeReveals } from "./home-reveals";
import { gsap, ScrollTrigger, useGSAP, motionConditions } from "@/lib/gsap";
import { SelectedWork } from "./selected-work";
import { CurveGallery } from "./curve-gallery";
import { WaveType } from "./wave-type";
import { ArrowUpRight } from "lucide-react";
import { Footer, SectionLabel, Timeline, TopNav } from "./site-chrome";
import { profile, services } from "@/lib/site-data";
import { RisographVideo } from "./risograph-video";
import { ScannerType } from "./scanner-type";
import { HeroStoneReveal } from "./hero-stone-reveal";

const heroVideoSettings: {
  controlMode: "scroll" | "mouse";
  playbackSpeed: number;
} = {
  // scroll：滚动控制；mouse：鼠标左右控制（左侧首帧，右侧末帧）。
  // 触屏设备在 mouse 模式下自动使用滚动控制。
  controlMode: "scroll",
  // 1 = 原速，0.5 = 半速，0.25 = 四分之一速度；必须大于 0。
  // 滚动模式：越小，滚动距离越长。鼠标模式：越小，追随越缓慢。
  playbackSpeed: 0.5,
};

function EditorCard() {
  return (
    <a
      href="#about"
      className="hero-editor-card"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-sm bg-[#f2f2f2] text-lg font-semibold text-[#172010]">

      </span>
      <span className="flex-1">
        <b className="block text-xs">Hey, I&apos;m ZZ</b>
        <small className="text-[10px] text-white/70">
          Creative Engineer
        </small>
      </span>
      <ArrowUpRight size={16} />
    </a>
  );
}

function Hero() {
  const hero = useRef<HTMLElement>(null);
  const backgroundVideo = useRef<HTMLVideoElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);

  useGSAP(
    () => {
      const video = backgroundVideo.current;
      const section = hero.current;
      if (!video || !section || videoFailed) return;
      const mm = gsap.matchMedia();
      mm.add(
        { ...motionConditions, finePointer: "(hover: hover) and (pointer: fine)" },
        ({ conditions }) => {
          // Reduced-motion users see the opening frame and scroll normally.
          if (conditions?.reduced) {
            video.currentTime = 0;
            return;
          }

          const frameRate = 24;
          const holdFrames = 10;
          const playbackScrollDistance = 240 / Math.max(0.01, heroVideoSettings.playbackSpeed);
          const lastFrameIndex = () => Math.max(0, Math.round(video.duration * frameRate) - 1);
          const playhead = { progress: 0 };
          let pendingSeek = 0;
          const seek = () => {
            pendingSeek = 0;
            if (
              video.readyState < 2 ||
              !Number.isFinite(video.duration) ||
              video.seeking
            )
              return;
            // Seek to actual frame timestamps, including the final decoded frame.
            const time = Math.round(playhead.progress * lastFrameIndex()) / frameRate;
            // Finish the current decode before seeking to the latest scroll position.
            if (Math.abs(video.currentTime - time) > 1 / 60)
              video.currentTime = time;
          };
          const scheduleSeek = () => {
            if (!pendingSeek) pendingSeek = requestAnimationFrame(seek);
          };
          video.addEventListener("loadeddata", scheduleSeek);
          video.addEventListener("seeked", scheduleSeek);
          if (heroVideoSettings.controlMode === "mouse" && conditions?.finePointer) {
            const follow = gsap.quickTo(playhead, "progress", {
              duration: 0.18 / Math.max(0.01, heroVideoSettings.playbackSpeed),
              ease: "power2.out",
              onUpdate: scheduleSeek,
            });
            const onPointerMove = (event: PointerEvent) => {
              if (event.pointerType === "touch") return;
              const bounds = section.getBoundingClientRect();
              follow(Math.max(0, Math.min(1, (event.clientX - bounds.left) / Math.max(1, bounds.width))));
            };
            section.addEventListener("pointermove", onPointerMove);
            scheduleSeek();
            return () => {
              follow.tween.kill();
              cancelAnimationFrame(pendingSeek);
              video.pause();
              section.removeEventListener("pointermove", onPointerMove);
              video.removeEventListener("loadeddata", scheduleSeek);
              video.removeEventListener("seeked", scheduleSeek);
            };
          }
          const pin = ScrollTrigger.create({
            id: "hero-video-pin",
            trigger: section,
            start: "top top",
            // Append ten held frames to the scroll timeline before releasing.
            end: () => `+=${playbackScrollDistance * (1 + holdFrames / (Number.isFinite(video.duration) ? Math.max(1, lastFrameIndex()) : 242))}`,
            pin: true,
            anticipatePin: 1,
          });
          gsap.to(playhead, {
            progress: 1,
            ease: "none",
            onUpdate: scheduleSeek,
            scrollTrigger: {
              id: "hero-video",
              trigger: section,
              start: () => pin.start,
              end: () => pin.start + playbackScrollDistance,
              scrub: true,
              invalidateOnRefresh: true,
            },
          });
          const onMetadata = () => {
            ScrollTrigger.refresh();
            scheduleSeek();
          };
          video.addEventListener("loadedmetadata", onMetadata);
          scheduleSeek();
          return () => {
            cancelAnimationFrame(pendingSeek);
            video.pause();
            video.removeEventListener("loadedmetadata", onMetadata);
            video.removeEventListener("loadeddata", scheduleSeek);
            video.removeEventListener("seeked", scheduleSeek);
          };
        },
        hero,
      );
      return () => mm.revert();
    },
    { scope: hero, dependencies: [videoFailed], revertOnUpdate: true },
  );
  return (
    <section
      id="top"
      ref={hero}
      className="home-hero"
    >
      <div className="hero-background">
        {/* <Image
            className="object-cover"
            src="/assets/images/bg53.png"
            fill
            priority
            sizes="100vw"
            alt="长虹玻璃光影"
          /> */}
        <div className="hero-video-frame">
        {videoFailed ? (
          <Image
            className="object-cover"
            src="/assets/images/bg52.png"
            fill
            priority
            sizes="100vw"
            alt="长虹玻璃光影"
          />
        ) : (
          <>
            <video
              ref={backgroundVideo}
              className="size-full object-cover"
              src="/assets/videos/11.mp4"
              poster="/assets/images/bg52.png"
              preload="auto"
              muted
              playsInline
              disablePictureInPicture
              aria-hidden="true"
              onError={() => setVideoFailed(true)}
            />
            <RisographVideo videoRef={backgroundVideo} />
            <HeroStoneReveal videoRef={backgroundVideo} />
          </>
        )}
        </div>
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.28),transparent_45%,rgba(0,0,0,.22))] max-[809px]:bg-[linear-gradient(180deg,rgba(0,0,0,.25),transparent_50%,rgba(0,0,0,.34))]" />
      <div className="hero-grid" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((line) => <span key={line}><i /></span>)}
      </div>
      <TopNav english />
      <div className="hero-services">
        <span className="hero-kicker">(01) — SERVICES</span>
        {["Brand & IP", "Marketing & Experiences", "AI & Creative Tools", "Teams & Design Systems"].map((title) => (
          <a className="my-0.5" key={title} href="#services">
            {title}
          </a>
        ))}
        <span className="hero-service-note">VISUAL DESIGN × CREATIVE TECHNOLOGY</span>
      </div>
      <div className="hero-profile">
        <EditorCard />
        <p className="hero-introduction">
          Building brands through visuals and connecting people through experiences. Exploring illustration, type, 3D and motion — with AI and code.
        </p>
      </div>
      <div className="hero-record">
        <span className="flex items-center gap-[7px]">
          <i className="size-1.5 rounded-full bg-[#f13d19] shadow-[0_0_8px_#f13d19]" />{" "}
          REC&nbsp; 00:14:18:09
        </span>

      </div>
      <Timeline className="hero-timeline" />
      <h1 className="hero-title tracking-tightest">
        <ScannerType enabled={false}>VibeMaking</ScannerType>
      </h1>
    </section>
  );
}

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
    <main ref={scope} className="home-page">
      <Hero />
      <SelectedWork />
      <CurveGallery />
      <WaveType />
      <Capabilities />
      <About />
      <Footer />
    </main>
  );
}
