"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { gsap, ScrollTrigger, useGSAP, motionConditions } from "@/lib/gsap";
import { SelectedWork } from "./selected-work";
import { CurveGallery } from "./curve-gallery";
import { WaveType } from "./wave-type";
import { ArrowUpRight } from "lucide-react";
import { Footer, SectionLabel, Timeline, TopNav } from "./site-chrome";
import { profile, services } from "@/lib/site-data";

function EditorCard() {
  return (
    <a
      href="#about"
      className="flex w-[230px] items-center gap-3 rounded-md border border-white/25 bg-black/45 p-3 text-left backdrop-blur-md"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#d8fa7c] text-lg font-semibold text-[#172010]">
        ZZ
      </span>
      <span className="flex-1">
        <b className="block text-xs">Hey, I&apos;m ZZ / 张振</b>
        <small className="text-[10px] text-white/70">
          Creative Designer & Engineer
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
      if (!video || videoFailed) return;
      const mm = gsap.matchMedia();
      mm.add(
        motionConditions,
        ({ conditions }) => {
          // Reduced-motion users see the opening frame and scroll normally.
          if (conditions?.reduced) {
            video.currentTime = 0;
            return;
          }
          gsap.from("h1", {
            autoAlpha: 0,
            y: 48,
            duration: 0.85,
            ease: "power3.out",
          });

          const playhead = { progress: 0 };
          const seek = () => {
            if (
              video.readyState < 2 ||
              !Number.isFinite(video.duration) ||
              video.seeking
            )
              return;
            const lastFrame = Math.max(0, video.duration - 1 / 30);
            const time = playhead.progress * lastFrame;
            // Finish the current decode before seeking to the latest scroll position.
            if (Math.abs(video.currentTime - time) > 1 / 60)
              video.currentTime = time;
          };
          video.addEventListener("loadeddata", seek);
          video.addEventListener("seeked", seek);
          const playbackScrollDistance = 240;
          const pin = ScrollTrigger.create({
            id: "hero-video-pin",
            trigger: hero.current,
            start: "top top",
            // Release at 95%; the remaining frames play as the hero scrolls away.
            end: `+=${playbackScrollDistance * 0.95}`,
            pin: true,
            anticipatePin: 1,
          });
          gsap.to(playhead, {
            progress: 1,
            ease: "none",
            onUpdate: seek,
            scrollTrigger: {
              id: "hero-video",
              trigger: hero.current,
              start: () => pin.start,
              // About two ordinary 120px wheel steps; independent of video length.
              end: () => pin.start + playbackScrollDistance,
              scrub: true,
              invalidateOnRefresh: true,
            },
          });
          seek();
          return () => {
            video.pause();
            video.removeEventListener("loadeddata", seek);
            video.removeEventListener("seeked", seek);
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
      className="relative h-svh min-h-[480px] overflow-hidden bg-[#06141b] min-[810px]:after:pointer-events-none min-[810px]:after:absolute min-[810px]:after:z-1 min-[810px]:after:content-[''] min-[810px]:after:inset-[45px_var(--page-pad)_98px] min-[810px]:after:bg-[repeating-linear-gradient(90deg,rgba(255,255,255,.085)_0_1px,transparent_1px_calc(25%_-_1px))]"
    >
      <div className="absolute inset-0">
        {videoFailed ? (
          <Image
            className="object-cover"
            src="/assets/images/hero-studio-poster.jpg"
            fill
            priority
            sizes="100vw"
            alt="Cinematic editing studio"
          />
        ) : (
          <video
            ref={backgroundVideo}
            className="size-full object-cover"
            src="/assets/videos/hero-studio-scroll.mp4"
            poster="/assets/images/hero-studio-poster.jpg"
            preload="auto"
            muted
            playsInline
            disablePictureInPicture
            aria-hidden="true"
            onError={() => setVideoFailed(true)}
          />
        )}
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.28),transparent_45%,rgba(0,0,0,.22))] max-[809px]:bg-[linear-gradient(180deg,rgba(0,0,0,.25),transparent_50%,rgba(0,0,0,.34))]" />
      <TopNav />
      <div className="absolute top-[35%] left-[var(--page-pad)] z-3 flex flex-col text-[11px] max-[809px]:hidden">
        <span className="mb-[18px] text-white/60">(01) — SERVICES</span>
        {services.map((s) => (
          <a className="my-0.5" key={s.title} href="#services">
            {s.title}
          </a>
        ))}
      </div>
      <div className="absolute top-[24%] right-[var(--page-pad)] z-3 flex w-[285px] flex-col items-end gap-[18px] max-[809px]:top-auto max-[809px]:right-4 max-[809px]:bottom-[215px] max-[809px]:left-4 max-[809px]:grid max-[809px]:w-auto max-[809px]:grid-cols-2 max-[809px]:items-end">
        <EditorCard />
        <p className="w-[235px] text-right text-xs text-white/82 max-[809px]:col-span-full max-[809px]:col-start-1 max-[809px]:row-start-2 max-[809px]:w-auto max-[809px]:max-w-[340px] max-[809px]:justify-self-center max-[809px]:text-center max-[809px]:text-[13px]">
          {profile.introduction}
        </p>
      </div>
      <div className="absolute top-[92px] left-[var(--page-pad)] z-4 flex gap-7 text-[10px] text-white/70 max-[809px]:top-[116px] max-[809px]:left-4 max-[809px]:w-[calc(100%-32px)] max-[809px]:justify-between">
        <span className="flex items-center gap-[7px]">
          <i className="size-1.5 rounded-full bg-[#f13d19] shadow-[0_0_8px_#f13d19]" />{" "}
          REC&nbsp; 00:14:18:09
        </span>
        <em className="absolute top-[330px] left-0 w-[180px] not-italic max-[809px]:hidden">
          (VISUAL DESIGN × CREATIVE TECHNOLOGY)
        </em>
      </div>
      <Timeline className="top-[52px] bottom-auto max-[809px]:top-[68px]" />
      <h1 className="absolute right-[2.5vw] bottom-9 left-[2.5vw] z-3 m-0 w-auto origin-bottom-left whitespace-nowrap text-[16.8vw] leading-[.78] font-[480] tracking-normal max-[809px]:bottom-6 max-[809px]:text-[16.4vw]">
        VibeMaking
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
        <h2>
          Think. Plan.
          <br />
          <span>Do. Repeat.</span>
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
          <p className="eyebrow">张振 / VISUAL DESIGNER</p>
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
  return (
    <main>
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
