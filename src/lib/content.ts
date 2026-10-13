import { projects, selectedWork, curveGallery, type Project } from './projects-config';
export type GalleryItem = Omit<(typeof curveGallery)[number], 'project'> & { project?: string; scale?: number; sourceProject?: string | null };
export type Content = { projects: Project[]; selectedWork: { order: string[]; compact: string[] }; sizes: Record<string, 'small' | 'large'>; gallery: GalleryItem[] };
export const initialContent: Content = {
  projects, selectedWork, sizes: {},
  gallery: [...selectedWork.order].reverse().flatMap(slug => {
    const p = projects.find(p => p.slug === slug);
    return p ? [{ name: `cover-${slug}`, project: slug, title: p.title, src: p.selectedWorkCover, width: p.coverWidth ?? 960, height: p.coverHeight ?? 540, sourceProject: slug }] : [];
  }).concat(curveGallery.map(item => ({ ...item, sourceProject: '' }))),
};

/** Rebuild automatic covers from the current homepage; uploaded items stay independent. */
export function syncGallery(content: Content): Content {
  const bySlug = new Map(content.projects.map(project => [project.slug, project]));
  const covers: GalleryItem[] = [...content.selectedWork.order].reverse().flatMap(slug => {
    const project = bySlug.get(slug);
    return project?.selectedWorkCover ? [{
      name: `cover-${slug}`, title: project.title, src: project.selectedWorkCover,
      width: project.coverWidth ?? 960, height: project.coverHeight ?? 540,
      sourceProject: slug,
    }] : [];
  });
  const standalone = content.gallery.filter(item => !item.sourceProject).map(item => {
    const independent = { ...item };
    delete independent.project;
    return independent;
  });
  return { ...content, gallery: [...covers, ...standalone] };
}
