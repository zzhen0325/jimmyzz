import "./project.css";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Footer, TopNav } from "@/components/site-chrome";
import { MotionImage } from "@/components/motion-image";
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
  const cover = assets.find((a) => a.name === "cover");
  const chapters = assets.filter((a) => a.name !== "cover");
  const index = projects.indexOf(project);
  const next = projects[(index + 1) % projects.length];
  return (
    <main id="top" className="case-page">
      <TopNav />
      <article className="case-editorial">
        <header className="case-intro">
          <Link className="case-back" href="/work">
            <ArrowLeft size={15} /> 全部作品
          </Link>
          <div className="case-kicker">
            <span>{project.kind}</span>
            <span>{String(index + 1).padStart(2, "0")} / {projects.length}</span>
          </div>
          <h1>{project.title}</h1>
          <p className="case-english">{project.english}</p>
        </header>
        {cover && (
          <figure className="case-cover" style={{ backgroundColor: project.color }}>
            <MotionImage
              src={cover.src}
              width={cover.width}
              height={cover.height}
              alt={`${project.title}主视觉`}
              priority
              sizes="(max-width: 1000px) 100vw, 43vw"
            />
          </figure>
        )}
        <div className="case-story">
          <section className="case-info case-editorial-section" aria-labelledby="case-info-title">
            <h2 id="case-info-title" className="case-margin-label">INFO / 信息</h2>
            <dl className="case-facts">
              <div><dt>项目 / CLIENT</dt><dd>{project.client}</dd></div>
              <div><dt>方向 / CATEGORY</dt><dd>{project.kind}</dd></div>
              <div><dt>标签 / TAGS</dt><dd>{project.tags.map((tag) => <span key={tag}>{tag}</span>)}</dd></div>
            </dl>
          </section>
          <section className="case-overview case-editorial-section" aria-labelledby="case-overview-title">
            <h2 id="case-overview-title" className="case-margin-label">ABOUT / 背景</h2>
            <p className="case-summary">{project.summary}</p>
            <p>{project.description}</p>
            <h3>设计思路</h3>
            <p>{project.approach}</p>
          </section>
          {project.results && (
            <section className="case-results case-editorial-section" aria-labelledby="case-results-title">
              <h2 id="case-results-title" className="case-margin-label">IMPACT / 成果</h2>
              <dl className="case-facts case-impact">
                {project.results.map((result) => (
                  <div key={result.label}><dt>{result.label}</dt><dd>{result.value}</dd></div>
                ))}
              </dl>
              <p>数据来源：作品集原稿中的项目成果记录。</p>
            </section>
          )}
          <section className="case-work case-editorial-section" aria-labelledby="case-work-title">
            <h2 id="case-work-title" className="case-margin-label">WORK / 展开</h2>
            <nav className="chapter-nav" aria-label="案例章节">
              {chapters.map((chapter, i) => (
                <a key={chapter.name} href={`#${chapter.name}`}>
                  <span>{String(i + 1).padStart(2, "0")}</span>{chapter.title}
                </a>
              ))}
            </nav>
            <CaseGallery assets={chapters} projectTitle={project.title} />
          </section>
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
