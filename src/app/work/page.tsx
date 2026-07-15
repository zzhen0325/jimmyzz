import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Footer, SectionLabel, Timeline, TopNav } from "@/components/site-chrome";
import { projects } from "@/lib/site-data";

export const metadata: Metadata = {
  title: "Selected Work",
  description: "Selected films, campaigns and title work — cut, graded and delivered by Jimmy™.",
};

export default function WorkPage() {
  return (
    <main id="top" className="min-h-svh bg-[#090909] text-[#f4f2ed]">
      <section className="relative flex h-[500px] flex-col justify-center px-[var(--page-pad)] after:pointer-events-none after:absolute after:z-1 after:content-[''] after:inset-[52px_var(--page-pad)_44px] after:bg-[repeating-linear-gradient(90deg,rgba(255,255,255,.08)_0_1px,transparent_1px_calc(25%_-_1px))] max-[809px]:h-[425px] max-[809px]:px-4 max-[809px]:after:inset-[86px_20px_50px]">
        <TopNav/><Timeline className="top-[82px] bottom-auto max-[809px]:hidden"/><p className="absolute right-0 bottom-[108px] left-0 text-center text-[11px] text-[#777] max-[809px]:bottom-[88px]">4 FILMS — 2025–2026</p>
        <h1 className="z-2 mt-2.5 text-center text-[78px] leading-[.9] font-[450] tracking-[-.06em] max-[809px]:mt-6 max-[809px]:w-[330px] max-[809px]:text-left max-[809px]:text-[44px] max-[809px]:leading-[1.08]">Everything that left<br/><span className="text-[#373737]">this room cut by cut</span></h1>
      </section>
      <section className="pb-[120px]">
        <SectionLabel index="02" title="ALL WORK" time="00:02:00:00"/>
        {projects.map((project, index) => (
          <Link className="group relative grid min-h-[220px] grid-cols-[70px_220px_1.2fr_1fr_42px] items-center gap-5 overflow-hidden border-b border-white/16 px-[var(--page-pad)] py-[30px] max-[809px]:min-h-[520px] max-[809px]:grid-cols-[34px_1fr_26px] max-[809px]:px-5 max-[809px]:pt-20 max-[809px]:pb-[26px]" href={`/work/${project.slug}`} key={project.slug}>
            <span className="relative z-3 text-[#777] max-[809px]:hidden">0{index + 1}</span>
            <div className="relative z-2 h-28 w-[200px] overflow-hidden transition-all duration-500 group-hover:absolute group-hover:inset-0 group-hover:z-0 group-hover:size-full max-[809px]:col-span-full max-[809px]:col-start-1 max-[809px]:row-start-1 max-[809px]:h-[200px] max-[809px]:w-full"><video className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" src={project.video} muted loop playsInline autoPlay/></div>
            <div className="relative z-3 flex flex-col gap-[15px] max-[809px]:col-[1/3]"><h2 className="m-0 text-[76px] font-[450] tracking-[-.06em] max-[809px]:text-[52px]">{project.title}</h2><p className="text-[#888]">{project.project}</p></div>
            <div className="relative z-3 flex flex-col gap-[15px] max-[809px]:col-[1/3]"><span>{project.year}</span><small className="text-[#888]">{project.spec}</small></div>
            <ArrowRight className="relative z-3 max-[809px]:col-start-3 max-[809px]:row-[2/4]"/>
            <span aria-hidden className="pointer-events-none absolute inset-0 z-1 bg-black/55 opacity-0 transition-opacity duration-300 group-hover:opacity-100 max-[809px]:bg-black/54 max-[809px]:opacity-100" />
          </Link>
        ))}
      </section>
      <Footer variant="work"/>
    </main>
  );
}
