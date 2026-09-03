"use client";

import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion, useScroll, useTransform } from "motion/react";
import { ArrowLeft, ArrowRight, Play, X } from "lucide-react";
import { useRef, useState } from "react";
import { Footer, SectionLabel, Stats, Timeline, TopNav } from "./site-chrome";
import { projects, reviews, services } from "@/lib/site-data";

function EditorCard() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="grid w-[220px] grid-cols-[48px_1fr_26px] items-center gap-[11px] rounded-md border border-white/25 bg-[rgba(8,8,8,.46)] p-[9px] text-left backdrop-blur-[10px] max-[809px]:w-[205px] max-[809px]:grid-cols-[43px_1fr_22px] max-[809px]:justify-self-end" onClick={() => setOpen(true)}>
        <Image className="size-12 rounded-[3px] object-cover max-[809px]:size-[43px]" src="/assets/images/NqT2lKYkuENxmwkazQv8ACVHnA.png" width={1200} height={1200} alt="Noah Reyes" />
        <span className="flex flex-col gap-[3px]"><b className="text-xs">Hey, I&apos;m Noah</b><small className="text-[10px] text-[#aaa]">Editor & Colourist</small></span><Play size={18} fill="currentColor"/>
      </button>
      <AnimatePresence>
        {open && <motion.div className="fixed inset-0 z-110 grid place-items-center bg-black/56 p-[30px] backdrop-blur-[14px] max-[809px]:p-3.5" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={() => setOpen(false)}>
          <motion.div className="w-[min(880px,85vw)] border border-[#343434] bg-[#0b0b0b] shadow-[0_28px_90px_rgba(0,0,0,.6)] max-[809px]:w-full" initial={{scale:.9,y:24}} animate={{scale:1,y:0}} onClick={e=>e.stopPropagation()}>
            <div className="flex h-[34px] items-center justify-between border-b border-[#303030] px-3 text-[10px] text-[#888]"><span>Jimmy_SHOWREEL_v2.4.mp4</span><button className="grid size-[30px] place-items-center [&_svg]:w-[15px]" onClick={() => setOpen(false)} aria-label="Close showreel"><X/></button></div>
            <video className="block aspect-video w-full object-cover" src="/assets/videos/x35f6GMC2qq48CEkSbzGt3mjk.mp4" autoPlay playsInline controls />
          </motion.div>
        </motion.div>}
      </AnimatePresence>
    </>
  );
}

function Hero() {
  const hero = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: hero, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 170]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.05]);
  return (
    <section id="top" ref={hero} className="relative h-svh min-h-[720px] overflow-hidden bg-[#06141b] min-[810px]:after:pointer-events-none min-[810px]:after:absolute min-[810px]:after:z-1 min-[810px]:after:content-[''] min-[810px]:after:inset-[45px_var(--page-pad)_98px] min-[810px]:after:bg-[repeating-linear-gradient(90deg,rgba(255,255,255,.085)_0_1px,transparent_1px_calc(25%_-_1px))] max-[809px]:min-h-[844px]">
      <motion.div className="absolute -inset-[4%] max-[809px]:inset-0" style={{y,scale}}><Image className="object-cover object-[center_44%] max-[809px]:object-[55%_center]" src="/assets/images/bg23.png" fill priority sizes="100vw" alt="Cinematic scene lit in blue and amber" /></motion.div>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.28),transparent_45%,rgba(0,0,0,.22))] max-[809px]:bg-[linear-gradient(180deg,rgba(0,0,0,.25),transparent_50%,rgba(0,0,0,.34))]" />
      <TopNav/>
      <div className="absolute top-[35%] left-[var(--page-pad)] z-3 flex flex-col text-[11px] max-[809px]:hidden"><span className="mb-[18px] text-white/60">(01) — SERVICES</span>{services.map(s=><a className="my-0.5" key={s.title} href="#services">{s.title}</a>)}</div>
      <div className="absolute top-[24%] right-[var(--page-pad)] z-3 flex w-[285px] flex-col items-end gap-[18px] max-[809px]:top-auto max-[809px]:right-4 max-[809px]:bottom-[215px] max-[809px]:left-4 max-[809px]:grid max-[809px]:w-auto max-[809px]:grid-cols-2 max-[809px]:items-end"><EditorCard/><p className="w-[235px] text-right text-xs text-white/82 max-[809px]:col-span-full max-[809px]:col-start-1 max-[809px]:row-start-2 max-[809px]:w-auto max-[809px]:max-w-[340px] max-[809px]:justify-self-center max-[809px]:text-center max-[809px]:text-[13px]">Cinematic editing for premium creatives and brands — long-form and short-form, cut for retention and graded so it feels like film.</p></div>
      <div className="absolute top-[92px] left-[var(--page-pad)] z-4 flex gap-7 text-[10px] text-white/70 max-[809px]:top-[116px] max-[809px]:left-4 max-[809px]:w-[calc(100%-32px)] max-[809px]:justify-between"><span className="flex items-center gap-[7px]"><i className="size-1.5 rounded-full bg-[#f13d19] shadow-[0_0_8px_#f13d19]"/> REC&nbsp; 00:14:18:09</span><em className="absolute top-[330px] left-0 w-[180px] not-italic max-[809px]:hidden">(EST. 2026 — REEL v2.4)</em></div>
      <Timeline className="top-[52px] bottom-auto max-[809px]:top-[68px]"/>
      <motion.h1 className="absolute right-[2.5vw] bottom-9 left-[2.5vw] z-3 m-0 w-auto origin-bottom-left whitespace-nowrap text-[16.8vw] leading-[.78] font-[480] tracking-normal max-[809px]:bottom-6 max-[809px]:text-[16.4vw]" initial={{opacity:0,y:48}} animate={{opacity:1,y:0}} transition={{duration:.85,ease:[.2,.7,.2,1]}}>VibeMaking</motion.h1>
    </section>
  );
}

function EditedFor() {
  const logos = [
    ["adidas", "/assets/images/uneKWpYGonP6Jsu5gB5AvQt85A.png", 800, 185],
    ["Allbirds", "/assets/images/47rmSHM7cEm5y8ggVfvWmMvmzC8.png", 820, 266],
    ["Audi", "/assets/images/49U0gO7YB6ifZuFPAu2KpGQfbNI.png", 800, 278],
    ["Pexels", "/assets/images/DosjC6u9HmbCxtI493idYHxhDDY.png", 820, 362],
    ["Airbnb", "/assets/images/KlertkhBNVvqn1OC47v27xOB1E.png", 820, 256],
    ["Noah", "/assets/images/BObY9AbefZujBRYHnUwc7YvP68.png", 1016, 357],
  ] as const;
  return <section className="min-h-[1260px] bg-[#090909] pt-0 text-[#f4f2ed] max-[809px]:min-h-[1350px]"><SectionLabel index="02" title="EDITED FOR" time="00:02:00:00"/><div className="overflow-hidden border-b border-white/16"><motion.div className="flex w-max" animate={{x:[0,-760]}} transition={{repeat:Infinity,duration:19,ease:"linear"}}>{[...logos,...logos].map(([name,src,width,height],i)=><span className="grid h-[150px] w-[190px] place-items-center border-r border-white/16 text-[23px] font-bold tracking-[-.04em] text-[#777] max-[809px]:h-[110px] max-[809px]:w-[130px] max-[809px]:text-base" key={`${name}-${i}`}><Image className="h-auto max-h-[38px] w-auto max-w-[100px] object-contain opacity-35" src={src} width={width} height={height} alt={name}/></span>)}</motion.div></div><h2 className="mx-auto mt-40 mb-[180px] max-w-[1000px] text-center text-[54px] leading-[.94] font-[450] tracking-[-.05em] max-[809px]:mx-6 max-[809px]:mt-[120px] max-[809px]:mb-[120px] max-[809px]:text-[39px]">The people who call when it has to feel like film, not content</h2><Stats/></section>;
}

function SelectedWork() {
  const [hovered,setHovered]=useState<string|null>(null);
  return <section className="bg-[#090909] text-[#f4f2ed]">
    {projects.slice(0,3).map((p,index)=><Link key={p.slug} onMouseEnter={()=>setHovered(p.slug)} onMouseLeave={()=>setHovered(null)} className="group relative block h-[1040px] overflow-hidden border-b border-white/16 bg-[#111] max-[809px]:h-[680px]" href={`/work/${p.slug}`}>
      <video className="size-full scale-[1.03] object-cover blur-0 transition-[filter,transform] duration-500 group-hover:scale-[1.08] group-hover:blur-[6px]" src={p.video} muted loop playsInline autoPlay={hovered===p.slug} poster={p.still}/><div className="absolute inset-0 bg-black/34"/><div className="absolute top-7 right-[var(--page-pad)] left-[var(--page-pad)] flex justify-between text-[11px] uppercase max-[809px]:right-4 max-[809px]:left-4"><span>({String(index+1).padStart(2,'0')}) — SELECTED WORK</span><span>{p.year}</span></div><div className="absolute top-1/2 right-0 left-0 -translate-y-1/2 overflow-hidden whitespace-nowrap text-[126px] leading-[.8] tracking-[-.06em] max-[1199px]:text-[100px] max-[809px]:text-[74px]"><motion.div className="w-max" animate={hovered===p.slug?{x:[0,-620]}:{x:0}} transition={hovered===p.slug?{repeat:Infinity,duration:8,ease:'linear'}:{}}>{p.title} &nbsp; {p.title} &nbsp; {p.title}</motion.div></div><div className="absolute right-[var(--page-pad)] bottom-7 left-[var(--page-pad)] flex justify-between text-[11px] uppercase max-[809px]:right-4 max-[809px]:left-4"><span>{p.project}</span><span>{p.kind}</span></div>
    </Link>)}
  </section>;
}

function Reels() {
  const reels = ["fFIZSd1iA0bT1JRZnG3ljs6oWCw.mp4","14Fkw8fup8bYItIGOUCPzpC8QCc.mp4","iqEokEjymtQr1bDZBJUpdAKG3A.mp4"];
  return <section id="reels" className="min-h-[1180px] bg-[#090909] text-[#f4f2ed] max-[809px]:min-h-[1200px]"><SectionLabel index="03" title="SHORT-FORM REELS" time="00:03:00:00"/><div className="relative grid h-[1080px] place-items-center overflow-hidden max-[809px]:h-[1120px]"><h2 className="absolute inset-0 flex items-center justify-between px-[9%] text-[92px] font-[450] tracking-[-.055em] max-[809px]:top-[180px] max-[809px]:items-start max-[809px]:px-[5%] max-[809px]:text-[56px]"><span>Short</span><span>Form</span></h2><div className="flex items-center justify-center">{reels.map((v,i)=><motion.video className="mx-[-56px] aspect-[9/16] w-[255px] rounded-[22px] border border-[#333] object-cover shadow-[0_22px_80px_rgba(0,0,0,.6)] [&:nth-child(2)]:z-2 max-[809px]:mx-[-72px] max-[809px]:w-[185px]" key={v} src={`/assets/videos/${v}`} muted loop autoPlay playsInline initial={{rotate:(i-1)*-8,x:(i-1)*-70}} whileHover={{scale:1.04,zIndex:4}}/>)}</div><div className="absolute right-[var(--page-pad)] bottom-7 left-[var(--page-pad)] flex justify-between text-[10px] text-[#777] max-[809px]:hidden"><span>EDITOR · COLOURIST</span><span>RUNTIME — 0:15</span><span>RATIO — 9:16</span></div></div></section>;
}

function Services() {
  const [active,setActive]=useState(0);
  return <section id="services" className="relative min-h-[1930px] bg-[#090909] text-[#f4f2ed] max-[809px]:min-h-[3500px]"><SectionLabel index="04" title="SERVICES" time="00:04:00:00"/><div className="sticky top-[70px] z-0 mx-auto mt-[45px] mb-[140px] h-[620px] w-[57%] overflow-hidden max-[809px]:relative max-[809px]:top-0 max-[809px]:mb-[90px] max-[809px]:h-[500px] max-[809px]:w-[86%]"><video className="size-full object-cover" key={services[active].video} src={services[active].video} muted loop autoPlay playsInline/><div className="absolute inset-0 shadow-[inset_0_0_110px_rgba(0,0,0,.5)]"/></div><div className="relative z-2 mt-[150px] max-[809px]:mt-0">{services.map((s,i)=><motion.article onViewportEnter={()=>setActive(i)} onMouseEnter={()=>setActive(i)} key={s.title} className={`grid min-h-[170px] grid-cols-[90px_minmax(260px,1.1fr)_minmax(320px,1fr)_40px] items-start gap-5 border-t border-white/16 px-[var(--page-pad)] py-[38px] transition-colors duration-300 last:border-b max-[809px]:min-h-[600px] max-[809px]:grid-cols-[42px_1fr_25px] max-[809px]:px-4 max-[809px]:py-[26px] ${active===i?"bg-[rgba(28,28,28,.95)]":"bg-[rgba(9,9,9,.8)]"}`}><span className="text-[#777]">0{i+1}</span><h3 className="m-0 text-[42px] leading-[.9] font-[450] tracking-[-.04em] max-[809px]:text-[31px]">{s.title}</h3><p className="m-0 max-w-[520px] text-[#777] max-[809px]:col-[2/4] max-[809px]:mt-[18px]">{s.text}</p><ArrowRight className="opacity-45 max-[809px]:col-start-3 max-[809px]:row-start-1"/></motion.article>)}</div></section>;
}

function About() {
  return <section id="about" className="min-h-[1160px] bg-[#090909] text-[#f4f2ed] max-[809px]:min-h-[1200px]"><SectionLabel index="05" title="ABOUT" time="00:05:00:00"/><h2 className="mx-auto mt-[210px] mb-[155px] max-w-[880px] text-center text-[54px] leading-[.94] font-[450] tracking-[-.05em] max-[809px]:mx-6 max-[809px]:mt-[220px] max-[809px]:mb-[100px] max-[809px]:text-[39px]">Every frame handled<br/><span className="text-[#373737]">by the same person</span></h2><div className="mx-[var(--page-pad)] grid grid-cols-[1fr_1.5fr_1fr] items-end gap-11 max-[809px]:mx-4 max-[809px]:grid-cols-1"><div className="max-[809px]:order-2 [&_p]:m-0 [&_p]:flex [&_p]:justify-between [&_p]:border-b [&_p]:border-white/16 [&_p]:py-2 [&_p]:text-[11px] [&_span]:text-[#666] [&_b]:font-normal">{["EDIT","GRADE","SOUND","TITLES","MOTION"].map(x=><p key={x}><span>{x}</span><b>Noah Reyes</b></p>)}<p><span>CATERING</span><b>Still Noah</b></p></div><div className="relative h-[430px] overflow-hidden max-[809px]:order-1 max-[809px]:h-[500px]"><Image className="object-cover" src="/assets/images/wTYDMBOqLPO3ZeIo4cVIp5BU0.jpg" fill sizes="50vw" alt="Noah Reyes working in the editing suite"/><span className="absolute bottom-2.5 left-2.5 text-[10px] uppercase">noah_reyes_master.mov</span><small className="absolute right-2.5 bottom-2.5 text-[10px] uppercase">4K · 24 FPS</small></div><p className="max-w-[320px] text-lg text-[#aaa] max-[809px]:order-3">Same name on every credit. That’s just how I work.<br/><br/>Twelve years on documentary, music and branded projects.</p></div></section>;
}

function Reviews() {
  const [index,setIndex]=useState(0); const r=reviews[index];
  return <section className="min-h-[950px] bg-[#090909] text-[#f4f2ed] max-[809px]:min-h-[1000px]"><SectionLabel index="06" title="CLIENT REVIEWS" time="00:06:00:00"/><AnimatePresence mode="wait"><motion.div className="flex h-[650px] flex-col items-center justify-center text-center max-[809px]:h-[590px] max-[809px]:px-[22px]" key={index} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-20}}><blockquote className="m-0 max-w-[990px] text-[54px] leading-[.98] tracking-[-.05em] max-[809px]:text-4xl">{r.quote}</blockquote><p className="mt-[45px] flex flex-col gap-[7px] text-[11px]"><b>{r.author}</b><span className="text-[#666]">{r.role}</span></p></motion.div></AnimatePresence><div className="mx-[var(--page-pad)] grid grid-cols-[1fr_1fr_auto] items-center border-t border-white/16 py-5 text-[11px] text-[#888] max-[809px]:mx-4 max-[809px]:grid-cols-[1fr_auto]"><span>{String(index+1).padStart(2,'0')} / 03</span><small className="text-center max-[809px]:hidden">{r.file}</small><div className="flex gap-2 [&_button]:grid [&_button]:size-[42px] [&_button]:place-items-center [&_button]:border [&_button]:border-white/16 [&_svg]:w-[17px]"><button onClick={()=>setIndex((index+2)%3)} aria-label="Previous review"><ArrowLeft/></button><button onClick={()=>setIndex((index+1)%3)} aria-label="Next review"><ArrowRight/></button></div></div></section>;
}

export function HomePage() {
  return <main><Hero/><EditedFor/><SelectedWork/><Reels/><Services/><About/><Reviews/><Footer variant="home"/></main>;
}
