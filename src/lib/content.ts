import { projects, selectedWork, curveGallery, type Project } from './projects-config';
export type GalleryItem = (typeof curveGallery)[number] & { scale?: number; sourceProject?: string | null };
export type Content = { projects: Project[]; selectedWork: { order: string[]; compact: string[] }; sizes: Record<string, 'small' | 'large'>; gallery: GalleryItem[] };
export const initialContent: Content = {
  projects, selectedWork, sizes: {},
  gallery: [...selectedWork.order].reverse().flatMap(slug => {
    const p = projects.find(p => p.slug === slug);
    return p ? [{ name: `cover-${slug}`, project: slug, title: p.title, src: p.selectedWorkCover, width: p.coverWidth ?? 960, height: p.coverHeight ?? 540, sourceProject: slug }] : [];
  }).concat(curveGallery.map(item => ({ ...item, sourceProject: '' }))),
};
