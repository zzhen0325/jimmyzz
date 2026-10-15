import "./project.css";
import { V1ExperienceLazy } from "@/components/v1-experience-lazy";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectHeader, ProjectCopy } from "@/components/project-detail-chrome";
import { RelatedProjectList } from "@/components/experience-timeline";
import { CaseGallery } from "@/components/case-gallery";
import { readContent } from "@/lib/content-store";
import { resolveCaseImageMetadata } from "@/lib/case-image-metadata";
import { projectThemeStyle } from "@/lib/project-theme";
import { ProjectEntrance } from "@/components/project-entrance";
import { PagePreload } from "@/components/page-preload";
import { projectPreloadRoutes } from "@/lib/case-media";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { projects } = await readContent();
  const project = projects.find((p) => p.slug === slug);
  return project
    ? { title: project.title, description: project.summary }
    : { title: "未找到项目" };
}
export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { projects } = await readContent();
  const project = projects.find((p) => p.slug === slug);
  if (!project) notFound();
  if (slug === "portfolio-v1") return <V1ExperienceLazy />;
  const assets = await resolveCaseImageMetadata(project.assets);
  const index = projects.indexOf(project);
  const relatedProjects = [...projects.slice(index + 1), ...projects.slice(0, index)].map((item) => ({
    company: item.client,
    title: item.title,
    category: item.kind,
    slug: item.slug,
    date: null,
    cover: item.thumbnail,
  }));
  return (
    <ProjectEntrance key={slug} style={projectThemeStyle(project.detailTheme)}>
      <PagePreload routes={projectPreloadRoutes([...projects.slice(index + 1), ...projects.slice(0, index)])} />
      <ProjectHeader homeHref="/" />
      <article className="case-editorial mx-[var(--page-pad)] grid grid-cols-[var(--portfolio-grid)] items-start gap-x-[var(--grid-gap)] pb-[clamp(64px,8vw,128px)] max-[599px]:gap-y-10">
        <ProjectCopy>
        <header className="case-intro">
          <h1>{project.title}</h1>
        </header>
        <section className="case-overview case-editorial-section case-info" aria-labelledby="case-info-title">
          <h2 id="case-info-title" className="case-margin-label">Info</h2>
            <dl className="case-facts">
              {project.infoProjectName ? <>
                <div><dt>Project</dt><dd>{project.infoProjectName}</dd></div>
                <div><dt>Date</dt><dd>{project.date || '—'}</dd></div>
                <div><dt>Company</dt><dd>{project.client}</dd></div>
                <div><dt>Tags</dt><dd>{project.tags.join(' / ')}</dd></div>
              </> : <>
                <div><dt>项目 / CLIENT</dt><dd>{project.client}</dd></div>
                <div><dt>方向 / CATEGORY</dt><dd>{project.kind}</dd></div>
                <div><dt>标签 / TAGS</dt><dd>{project.tags.map((tag) => <span key={tag}>{tag}</span>)}</dd></div>
              </>}
            </dl>
        </section>
        <div className="min-w-0">
          <section className="case-overview case-editorial-section" aria-labelledby="case-about-title">
            <h2 id="case-about-title" className="case-margin-label">About</h2>
            <div className="case-section-body">
            <p className="case-summary">{project.summary}</p>
            </div>

          </section>
          {project.challenge && <section className="case-overview case-editorial-section" aria-labelledby="case-challenge-title">
            <h2 id="case-challenge-title" className="case-margin-label">Challenge</h2>
            <div className="case-section-body"><p>{project.challenge}</p></div>
          </section>}
          {project.approach && <section className="case-overview case-editorial-section" aria-labelledby="case-solution-title">
            <h2 id="case-solution-title" className="case-margin-label">Solution</h2>
            <div className="case-section-body">
            <p>{project.approach}</p>
            {project.results && <dl className="case-facts case-impact">
              {project.results.map((result) => <div key={result.label}><dt>{result.label}</dt><dd>{result.value}</dd></div>)}
            </dl>}
            </div>
          </section>}

        </div>
        </ProjectCopy>
        <div className="case-visuals col-[5/-1] min-w-0 max-[599px]:col-[1/-1]" aria-label={`${project.title}作品素材`}>
          <CaseGallery assets={assets} projectTitle={project.title} />
        </div>
      </article>
      <RelatedProjectList key={slug} entries={relatedProjects} />
    </ProjectEntrance>
  );
}
