import { WorkLink } from "@/components/work-link";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Footer, SectionLabel, Timeline, TopNav } from "@/components/site-chrome";
import { projects } from "@/lib/site-data";

export function generateStaticParams() { return projects.map((project) => ({ slug: project.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = projects.find((item) => item.slug === slug);
  return project ? { title: project.title, description: `${project.project} — cut, graded and delivered by Jimmy™.` } : { title: "Not Found" };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = projects.find((item) => item.slug === slug);
  if (!project) notFound();
  const nextProject = projects.find((item) => item.slug === project.next);
  const previousProject = projects.find((item) => item.slug === project.previous);

  return (
    <main id="top" className="min-h-svh bg-[#090909] text-[#f4f2ed]">
      <section className="relative h-svh min-h-[720px] overflow-hidden after:pointer-events-none after:absolute after:z-1 after:content-[''] after:inset-[52px_var(--page-pad)_44px] after:bg-[repeating-linear-gradient(90deg,rgba(255,255,255,.08)_0_1px,transparent_1px_calc(25%_-_1px))] max-[809px]:h-[708px] max-[809px]:min-h-[708px] max-[809px]:after:inset-[68px_16px_40px]">
        <TopNav/>
        <video className="size-full object-cover" src={project.video} muted loop autoPlay playsInline poster={project.still}/>
        <div className="absolute inset-0 bg-black/25"/>
        <div className="absolute top-[95px] left-[var(--page-pad)] z-3 flex items-center gap-[7px] text-[10px] text-white/70 max-[809px]:top-[116px] max-[809px]:left-4"><i className="block size-1.5 rounded-full bg-[#ef3b1f] shadow-[0_0_8px_#ef3b1f]"/> REC 00:14:13:10</div>
        <div className="absolute right-[var(--page-pad)] bottom-28 left-[var(--page-pad)] z-2 flex justify-between text-[11px] max-[809px]:bottom-[82px]"><span>{project.kind}</span><span>{project.year}</span></div>
        <Timeline className="top-[52px] bottom-auto max-[809px]:top-[68px]"/><h1 className="absolute bottom-3.5 left-[var(--page-pad)] z-2 m-0 text-[7.8vw] leading-[.8] font-[450] tracking-[-.07em] max-[809px]:bottom-5 max-[809px]:left-4 max-[809px]:text-[13vw]">{project.title}</h1>
      </section>
      <section className="min-h-[650px] max-[809px]:min-h-[700px]">
        <SectionLabel index="01" title="THE SHEET" time="00:01:00:00"/>
        <div className="mx-[var(--page-pad)] mt-60 grid grid-cols-4 border-t border-white/16 max-[809px]:mx-4 max-[809px]:mt-[170px] max-[809px]:grid-cols-2">{[["Client", project.client], ["Project", project.project], ["Spec", project.spec], ["Deliverables", project.deliverables]].map(([key, value]) => <div className="flex flex-col gap-3.5 border-r border-white/16 py-[22px] last:border-0 max-[809px]:min-h-[130px] max-[809px]:[&:nth-child(2)]:border-0" key={key}><span className="text-[11px] text-[#666]">{key}</span><strong className="text-lg font-[450]">{value}</strong></div>)}</div>
      </section>
      <section className="min-h-[900px] max-[809px]:min-h-[1100px]">
        <SectionLabel index="02" title="THE MASTER" time="00:02:00:00"/>
        <div className="mx-auto mt-[120px] mb-[100px] grid w-[71%] grid-cols-[1.45fr_1fr] gap-[70px] max-[1199px]:w-[85%] max-[809px]:mt-[90px] max-[809px]:w-[calc(100%-32px)] max-[809px]:grid-cols-1">
          <div><div className="aspect-video bg-[#111]"><iframe className="size-full border-0" src="https://www.youtube-nocookie.com/embed/Sgxbx65IDeM?rel=0" title={`${project.title} master film`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen/></div><div className="mt-4 flex justify-between text-[9px] text-[#666]"><span>{project.file}</span><span>{project.spec}</span></div></div>
          <div>{["The Brief", "The Cut", "The Grade", "The Result"].map((title, index) => <article className="mb-[34px]" key={title}><h2 className="mt-0 mb-4 text-2xl font-[450]">{title}</h2><p className="m-0 text-[17px] leading-[1.35] text-[#888] max-[809px]:text-base">{project.copy[index]}</p></article>)}</div>
        </div>
      </section>
      <section className="grid min-h-[360px] grid-cols-2 max-[809px]:min-h-[560px] max-[809px]:grid-cols-1">
        {previousProject && <Link href={`/work/${previousProject.slug}`} className="group relative flex min-h-[360px] flex-col justify-end overflow-hidden border-t border-white/16 bg-[#111] px-[var(--page-pad)] py-[55px] max-[809px]:min-h-[280px]"><small className="relative text-[#888]">PREVIOUS SCREENING</small><b className="relative flex items-center gap-[18px] text-[62px] font-[450] tracking-[-.05em] max-[809px]:text-[46px]"><ArrowLeft/>{previousProject.title}</b></Link>}
        {nextProject && <WorkLink href={`/work/${nextProject.slug}`} className="group relative col-start-2 flex min-h-[360px] flex-col justify-end overflow-hidden border-t border-white/16 px-[var(--page-pad)] py-[55px] max-[809px]:col-start-1 max-[809px]:min-h-[280px]"><video className="absolute inset-0 size-full object-cover opacity-50" src={nextProject.video} muted loop autoPlay playsInline/><small className="relative text-[#888]">NEXT SCREENING</small><b className="relative flex items-center gap-[18px] text-[62px] font-[450] tracking-[-.05em] max-[809px]:text-[46px]">{nextProject.title}<ArrowRight/></b></WorkLink>}
      </section>
      <Footer variant="project"/>
    </main>
  );
}
