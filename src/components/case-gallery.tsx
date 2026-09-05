"use client";
import Image from "next/image";
import { useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Maximize2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { Asset } from "@/lib/site-data";
export function CaseGallery({
  assets,
  projectTitle,
}: {
  assets: Asset[];
  projectTitle: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  const item = assets[active];
  const show = (index: number) => {
    setActive(index);
    setZoom(false);
    dialog.current?.showModal();
  };
  const step = (delta: number) => {
    setActive((i) => (i + delta + assets.length) % assets.length);
    setZoom(false);
    dialog.current?.querySelector(".lightbox-body")?.scrollTo(0, 0);
  };
  return (
    <>
      <div className="case-gallery">
        {assets.map((asset, index) => (
          <section key={asset.name} id={asset.name} className="case-chapter">
            <div className="chapter-heading">
              <h2>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {asset.title}
              </h2>
              <button
                onClick={() => show(index)}
                aria-label={`放大查看${asset.title}`}
              >
                <Maximize2 size={16} />
                <span>查看大图</span>
              </button>
            </div>
            <button
              className="chapter-image"
              onClick={() => show(index)}
              aria-label={`查看${asset.title}大图`}
            >
              <Image
                src={asset.src}
                width={asset.width}
                height={asset.height}
                alt={`${projectTitle}：${asset.title}`}
                sizes="(max-width: 1000px) 100vw, 36vw"
              />
            </button>
          </section>
        ))}
      </div>
      <dialog
        ref={dialog}
        className="asset-lightbox"
        aria-labelledby="asset-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current?.close();
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") step(1);
          if (e.key === "ArrowLeft") step(-1);
        }}
      >
        <div className="lightbox-toolbar">
          <p id="asset-title">
            {item?.title}{" "}
            <span>
              {active + 1} / {assets.length}
            </span>
          </p>
          <div>
            <button onClick={() => step(-1)} aria-label="上一张">
              <ArrowLeft size={19} />
            </button>
            <button onClick={() => step(1)} aria-label="下一张">
              <ArrowRight size={19} />
            </button>
            <button
              onClick={() => setZoom(!zoom)}
              aria-label={zoom ? "适应屏幕" : "原尺寸查看"}
            >
              {zoom ? <ZoomOut size={19} /> : <ZoomIn size={19} />}
            </button>
            <button
              onClick={() => dialog.current?.close()}
              aria-label="关闭大图"
              autoFocus
            >
              <X size={22} />
            </button>
          </div>
        </div>
        <div className="lightbox-body" data-lenis-prevent>
          {item && (
            <Image
              src={item.src}
              width={item.width}
              height={item.height}
              unoptimized
              alt={`${projectTitle}：${item.title}`}
              className={zoom ? "is-zoomed" : ""}
            />
          )}
        </div>
      </dialog>
    </>
  );
}
