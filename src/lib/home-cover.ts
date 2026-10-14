import manifest from './home-cover-manifest.json';
import type { Project } from './projects-config';

/** A derivative is valid only for the exact source it was generated from. */
export function homeCoverSource(source: string, project?: Project): string {
  if (project?.homeCover?.source === source) return project.homeCover.src;
  return (manifest as Record<string, string>)[source] || source;
}
