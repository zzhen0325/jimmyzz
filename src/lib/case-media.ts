import type { Asset, Project } from "./projects-config";
import { isVideoAsset } from "./media";
import { getVideoLayers } from "./video-layers";

export const caseImageSizes = "(max-width: 599px) calc(100vw - 32px), (max-width: 809px) calc(50vw - 26px), 58.333vw";
export const caseImageQuality = 90;
export type PreviewImage = Pick<Asset, "src" | "width" | "height"> & { unoptimized: boolean };
export type PreloadRoute = { href: string; images: PreviewImage[] };

/** Only navigation previews cross this boundary, never full galleries or copy. */
export function projectPreloadRoutes(projects: Pick<Project, "slug" | "assets">[]): PreloadRoute[] {
  return projects.map(project => ({
    href: `/work/${project.slug}`,
    images: project.assets.slice(0, 2).filter(asset => !isVideoAsset(asset.src)).map(asset => ({
      src: asset.src, width: asset.width, height: asset.height,
      unoptimized: asset.src.startsWith("/media/") || getVideoLayers(asset).length > 0,
    })),
  }));
}
