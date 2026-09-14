import "./project.css";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
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
      <article className="case-editorial">
        <ProjectCopy>
        <header className="case-intro">
          <Link className="case-back" href="/">
            <ArrowLeft size={15} /> 返回首页
          </Link>
          <h1>{project.title}</h1>
        </header>
        <div className="case-story">
          <section className="case-overview case-editorial-section" aria-labelledby="case-about-title">
            <h2 id="case-about-title" className="case-margin-label">About</h2>
            <p className="case-summary">{project.summary}</p>
            <p>{project.description}</p>
            <dl className="case-facts">
              <div><dt>项目 / CLIENT</dt><dd>{project.client}</dd></div>
              <div><dt>方向 / CATEGORY</dt><dd>{project.kind}</dd></div>
              <div><dt>标签 / TAGS</dt><dd>{project.tags.map((tag) => <span key={tag}>{tag}</span>)}</dd></div>
            </dl>
          </section>
          <section className="case-overview case-editorial-section" aria-labelledby="case-challenge-title">
            <h2 id="case-challenge-title" className="case-margin-label">Challenge</h2>
            <p>{project.challenge}</p>
          </section>
          <section className="case-overview case-editorial-section" aria-labelledby="case-solution-title">
            <h2 id="case-solution-title" className="case-margin-label">Solution</h2>
            <p>{project.approach}</p>
            {project.results && <dl className="case-facts case-impact">
              {project.results.map((result) => <div key={result.label}><dt>{result.label}</dt><dd>{result.value}</dd></div>)}
            </dl>}
          </section>

        </div>
        </ProjectCopy>
        <div className="case-visuals" aria-label={`${project.title}作品长图`}>
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
