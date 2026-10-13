"use client";
/* Export dimensions reserve space; CSS keeps the original aspect ratio. */
/* eslint-disable @next/next/no-img-element */
import { ScrollBend } from "./scroll-bend";
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
            <img
              src={asset.src}
              alt={`${projectTitle} · ${index + 1}`}
              width={asset.width}
              height={asset.height}
              loading={index === 0 ? "eager" : "lazy"}
              decoding="async"
            />
          </div>
        </section>
      ))}
    </ScrollBend>
  );
}
