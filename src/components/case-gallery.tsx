"use client";
/* Export dimensions reserve space; CSS keeps the original aspect ratio. */
/* eslint-disable @next/next/no-img-element */
import { ScrollBend } from "./scroll-bend";
import Image from "next/image";
import { isVideoAsset } from "@/lib/media";
import type { Asset } from "@/lib/site-data";

export function CaseGallery({
  assets,
  projectTitle,
}: {
  assets: Asset[];
  projectTitle: string;
}) {
  return (
    <ScrollBend key={projectTitle} className="case-gallery">
      {assets.map((asset, index) => (
        <section key={asset.name} id={asset.name} className="case-chapter">
          <div className="chapter-image" data-work-skew>
            {isVideoAsset(asset.src) ? <video
              src={asset.src}
              aria-label={`${projectTitle} · 视频 ${index + 1}`}
              width={asset.width}
              height={asset.height}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              style={asset.width && asset.height ? { aspectRatio: `${asset.width} / ${asset.height}` } : undefined}
            /> : asset.width && asset.height ? <Image
              src={asset.src}
              alt={`${projectTitle} · ${index + 1}`}
              width={asset.width}
              height={asset.height}
              sizes="(max-width: 599px) calc(100vw - 32px), (max-width: 809px) calc(50vw - 26px), 58.333vw"
              quality={90}
              preload={index === 0}
              loading={index === 0 ? undefined : "lazy"}
            /> : <img
              src={asset.src}
              alt={`${projectTitle} · ${index + 1}`}
              width={asset.width}
              height={asset.height}
              loading={index === 0 ? "eager" : "lazy"}
              fetchPriority={index === 0 ? "high" : undefined}
              decoding="async"
            />}
          </div>
        </section>
      ))}
    </ScrollBend>
  );
}
