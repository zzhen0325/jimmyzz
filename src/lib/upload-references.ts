import type { Content } from './content';

export function uploadedFileName(src: unknown): string | null {
  if (typeof src !== 'string') return null;
  return /^\/media\/([a-f0-9-]+\.(?:jpg|png|webp|gif|avif|mp4|webm|mov))$/.exec(src)?.[1] ?? null;
}

export function uploadedReferences(content: Content): Set<string> {
  const sources = content.projects.flatMap(project => [
    project.thumbnail, project.selectedWorkCover, project.hoverVideo,
    ...project.assets.map(asset => asset.src),
  ]);
  sources.push(...content.gallery.map(item => item.src));
  return new Set(sources.filter((src): src is string => uploadedFileName(src) !== null));
}

export function removedUploads(previous: Content, next: Content, candidates: string[] = []): string[] {
  const retained = uploadedReferences(next);
  return [...new Set([...uploadedReferences(previous), ...candidates])]
    .filter(src => uploadedFileName(src) !== null && !retained.has(src));
}
