import "./project.css";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { Footer } from "@/components/site-chrome";
import { ProjectHeader, ProjectCopy } from "@/components/project-detail-chrome";
import { CaseGallery } from "@/components/case-gallery";
import { projects, projectAssets, projectCover } from "@/lib/site-data";
export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
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
  const project = projects.find((p) => p.slug === slug);
  if (!project) notFound();
  const assets = projectAssets(slug);
  const index = projects.indexOf(project);
  const next = projects[(index + 1) % projects.length];
  return (
    <main id="top" className="case-page">
      <ProjectHeader />
      <article className="case-editorial mx-[var(--page-pad)] grid grid-cols-[var(--portfolio-grid)] items-start gap-x-[var(--grid-gap)] pb-[clamp(64px,8vw,128px)] max-[599px]:gap-y-10">
        <ProjectCopy>
        <header className="case-intro">
          <h1>{project.title}</h1>
        </header>
        <section className="case-overview case-editorial-section case-info" aria-labelledby="case-info-title">
          <h2 id="case-info-title" className="case-margin-label">Info</h2>
            <dl className="case-facts">
              <div><dt>项目 / CLIENT</dt><dd>{project.client}</dd></div>
              <div><dt>方向 / CATEGORY</dt><dd>{project.kind}</dd></div>
              <div><dt>标签 / TAGS</dt><dd>{project.tags.map((tag) => <span key={tag}>{tag}</span>)}</dd></div>
            </dl>
        </section>
        <div className="min-w-0">
          <section className="case-overview case-editorial-section" aria-labelledby="case-about-title">
            <h2 id="case-about-title" className="case-margin-label">About</h2>
            <div className="case-section-body">
            <p className="case-summary">{project.summary}</p>
            <p>{project.description}</p>
            </div>

          </section>
          <section className="case-overview case-editorial-section" aria-labelledby="case-challenge-title">
            <h2 id="case-challenge-title" className="case-margin-label">Challenge</h2>
            <div className="case-section-body"><p>{project.challenge}</p></div>
          </section>
          <section className="case-overview case-editorial-section" aria-labelledby="case-solution-title">
            <h2 id="case-solution-title" className="case-margin-label">Solution</h2>
            <div className="case-section-body">
            <p>{project.approach}</p>
            {project.results && <dl className="case-facts case-impact">
              {project.results.map((result) => <div key={result.label}><dt>{result.label}</dt><dd>{result.value}</dd></div>)}
            </dl>}
            </div>
          </section>

        </div>
        </ProjectCopy>
        <div className="case-visuals col-[5/-1] min-w-0 max-[599px]:col-[1/-1]" aria-label={`${project.title}作品长图`}>
          <CaseGallery assets={assets} projectTitle={project.title} />
        </div>
      </article>
      <section className="next-project">
        <p className="eyebrow">NEXT PROJECT / 继续探索</p>
        <Link href={`/work/${next.slug}`}>
          <div>
            <h2>{next.title}</h2>
            <p>
              {next.kind} / {next.client}
            </p>
          </div>
          <div className="next-art">
            <Image
              src={projectCover(next.slug)}
              width={960}
              height={540}
              unoptimized
              alt={next.title}
              className="object-contain"
            />
          </div>
          <ArrowUpRight size={36} />
        </Link>
      </section>
      <Footer variant="project" />
    </main>
  );
}
