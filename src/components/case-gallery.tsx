"use client";
/* Native images use their intrinsic proportions without configured dimensions. */
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
              decoding="async"
            />
          </div>
        </section>
      ))}
    </ScrollBend>
  );
}
