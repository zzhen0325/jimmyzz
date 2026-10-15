"use client";
/* Export dimensions reserve space; CSS keeps the original aspect ratio. */
/* eslint-disable @next/next/no-img-element */
import { getVideoLayers } from '@/lib/video-layers';
import { LayeredMedia } from "./layered-media";
import { ScrollBend } from "./scroll-bend";
import Image from "./content-image";
import { isVideoAsset } from "@/lib/media";
import type { Asset } from "@/lib/site-data";
import { caseImageQuality, caseImageSizes } from "@/lib/case-media";
import { ViewportVideo } from "./viewport-video";

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
            {getVideoLayers(asset).length > 0 ? <LayeredMedia asset={asset} priority={index === 0} alt={`${projectTitle} · ${index + 1}`} /> : isVideoAsset(asset.src) ? <ViewportVideo
              src={asset.src}
              aria-label={`${projectTitle} · 视频 ${index + 1}`}
              width={asset.width}
              height={asset.height}
              muted
              loop
              playsInline
              style={asset.width && asset.height ? { aspectRatio: `${asset.width} / ${asset.height}` } : undefined}
            /> : asset.width && asset.height ? <Image
              src={asset.src}
              alt={`${projectTitle} · ${index + 1}`}
              width={asset.width}
              height={asset.height}
              sizes={caseImageSizes}
              quality={caseImageQuality}
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
