"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Grid2X2,
  Pause,
  Play,
  X,
} from "lucide-react";
import { gsap, ScrollTrigger, useGSAP, motionConditions } from "@/lib/gsap";
import type { CurveScene } from "@/lib/curve-gallery-scene";
import images from "@/lib/curve-gallery-assets.json";
import { SectionLabel } from "./site-chrome";

export function CurveGallery() {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<CurveScene | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "static">(
    "loading",
  );
  const [automatic, setAutomatic] = useState(true);
  const [flat, setFlat] = useState(false);
  const [selected, setSelected] = useState(0);
  const flatRef = useRef(false);
  const visible = useRef(false);
  const activeImage = images[selected];
  const openImage = (index: number) => {
    setSelected(index);
    scene.current?.setActive(false);
    dialog.current?.showModal();
  };
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(
        motionConditions,
        ({ conditions }) => {
          if (conditions?.reduced) {
            setStatus("static");
            return;
          }
          let disposed = false;
          let started = false;
          let engine: CurveScene | null = null;
          let trigger: ScrollTrigger | null = null;
          setStatus("loading");
          const observer = new IntersectionObserver(
            (entries) => {
              const entry = entries[0];
              visible.current = entry.isIntersecting;
              engine?.setActive(
                entry.isIntersecting &&
                  !flatRef.current &&
                  !dialog.current?.open,
              );
              if (!entry.isIntersecting || started) return;
              started = true;
              void import("@/lib/curve-gallery-scene")
                .then(async ({ createCurveScene }) => {
                  if (disposed || !host.current) return;
                  engine = await createCurveScene(
                    host.current,
                    images,
                    openImage,
                  );
                  if (disposed) {
                    engine.dispose();
                    return;
                  }
                  scene.current = engine;
                  engine.setActive(visible.current && !flatRef.current);
                  setStatus("ready");
                  setAutomatic(true);
                  trigger = ScrollTrigger.create({
                    id: "curve-gallery",
                    trigger: stage.current,
                    start: "top top",
                    end: () => `+=${window.innerHeight * 1.8}`,
                    pin: true,
                    anticipatePin: 1,
                    invalidateOnRefresh: true,
                    onUpdate: (self) => engine?.setProgress(self.progress),
                  });
                  ScrollTrigger.sort();
                  ScrollTrigger.refresh();
                })
                .catch(() => {
                  if (!disposed) setStatus("static");
                });
            },
            { rootMargin: "300px 0px" },
          );
          observer.observe(section.current!);
          return () => {
            disposed = true;
            observer.disconnect();
            trigger?.kill();
            engine?.dispose();
            scene.current = null;
          };
        },
        section,
      );
      return () => mm.revert();
    },
    { scope: section },
  );
  const toggleFlat = () => {
    const value = !flat;
    flatRef.current = value;
    setFlat(value);
    scene.current?.setActive(!value && visible.current);
  };
  const toggleAutomatic = () => {
    setAutomatic(!automatic);
    scene.current?.setAutomatic(!automatic);
  };
  const close = () => {
    dialog.current?.close();
  };
  return (
    <section id="gallery" ref={section} className="curve-section">
      <SectionLabel
        index="02"
        title="VISUAL PLAYGROUND / 视觉漫游"
        time="24 IMAGES / IN MOTION"
      />
      <div
        ref={stage}
        className={`curve-stage ${status === "ready" && !flat ? "is-live" : "is-flat"}`}
      >
        <div className="curve-heading">
          <div>
            <p className="eyebrow">A COLLECTION OF LITTLE THINGS</p>
            <h2>
              Follow
              <br />
              <span>the curiosity.</span>
            </h2>
          </div>
          <p>
            插画、角色、海报与视觉实验。
            <br />
            移动鼠标倾斜圆环，滚动展开，点击放大。
          </p>
        </div>
        <div
          ref={host}
          className="curve-canvas"
          aria-hidden={flat || status !== "ready"}
        />
        {(flat || status !== "ready") && (
          <div
            className="curve-flat-grid"
            data-lenis-prevent
            aria-label="全部画廊图片"
          >
            {images.map((image, index) => (
              <button
                key={image.name}
                onClick={() => openImage(index)}
                aria-label={`查看${image.title}`}
              >
                <Image
                  src={image.src}
                  width={image.width}
                  height={image.height}
                  alt={image.title}
                  sizes="(max-width:809px) 35vw, 15vw"
                />
              </button>
            ))}
          </div>
        )}
        <div className="curve-controls">
          <p className="curve-wheel-caption">3D TILT WHEEL <span>移动倾斜 · 滚动展开</span></p>
          <div className="curve-playback">
            {status === "ready" && (
              <>
                <button
                  aria-label="向后漫游"
                  onClick={() => scene.current?.nudge(-0.025)}
                  disabled={flat}
                >
                  <ArrowLeft size={16} />
                </button>
                <button
                  onClick={toggleAutomatic}
                  aria-pressed={automatic}
                  disabled={flat}
                >
                  {automatic ? <Pause size={14} /> : <Play size={14} />}
                  <span>{automatic ? "暂停漫游" : "自动漫游"}</span>
                </button>
                <button
                  aria-label="向前漫游"
                  onClick={() => scene.current?.nudge(0.025)}
                  disabled={flat}
                >
                  <ArrowRight size={16} />
                </button>
                <button onClick={toggleFlat} aria-pressed={flat}>
                  <Grid2X2 size={14} />
                  <span>{flat ? "圆环浏览" : "平铺浏览"}</span>
                </button>
              </>
            )}
          </div>
        </div>
        <a className="curve-skip" href="#services">
          继续看设计实践 <ArrowUpRight size={13} />
        </a>
      </div>
      <dialog
        className="gallery-lightbox"
        ref={dialog}
        aria-labelledby="gallery-image-title"
        onClose={() =>
          scene.current?.setActive(visible.current && !flatRef.current)
        }
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") {
            event.preventDefault();
            setSelected((i) => (i + 1) % images.length);
          }
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            setSelected((i) => (i - 1 + images.length) % images.length);
          }
        }}
      >
        <div className="gallery-lightbox-inner" data-lenis-prevent>
          <div className="lightbox-toolbar">
            <p id="gallery-image-title">
              {activeImage.title}
              <span>
                {selected + 1} / {images.length}
              </span>
            </p>
            <div>
              <button
                onClick={() =>
                  setSelected((i) => (i - 1 + images.length) % images.length)
                }
                aria-label="上一张"
              >
                <ArrowLeft size={18} />
              </button>
              <button
                onClick={() => setSelected((i) => (i + 1) % images.length)}
                aria-label="下一张"
              >
                <ArrowRight size={18} />
              </button>
              <button onClick={close} aria-label="关闭图片" autoFocus>
                <X size={20} />
              </button>
            </div>
          </div>
          <Image
            src={activeImage.src}
            width={activeImage.width}
            height={activeImage.height}
            alt={activeImage.title}
            unoptimized
          />
          <Link onClick={close} href={`/work/${activeImage.project}`}>
            查看完整项目 <ArrowUpRight size={15} />
          </Link>
        </div>
      </dialog>
    </section>
  );
}
