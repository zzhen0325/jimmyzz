"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowDown, CircleDot, Menu, Play, Video, X } from "lucide-react";
import { FaInstagram, FaXTwitter, FaYoutube } from "react-icons/fa6";
import { useEffect, useState } from "react";

const nav = [
  ["Work", "/work", "01"],
  ["Reels", "/#reels", "02"],
  ["Services", "/#services", "03"],
  ["About", "/#about", "04"],
] as const;

export function TopNav() {
  return (
    <header className="absolute top-0 left-0 z-20 grid w-full grid-cols-[1fr_auto] items-center px-[var(--page-pad)] py-[22px] text-xs max-[809px]:grid-cols-2 max-[809px]:pt-[15px]">
      <Link href="/" className="text-sm font-[650]" aria-label="Jimmy home">Jimmy™</Link>
      <nav className="flex gap-[30px] justify-self-end max-[809px]:hidden" aria-label="Primary navigation">
        {nav.map(([label, href]) => <Link className="hover:opacity-55" key={label} href={href}>{label}</Link>)}
      </nav>
    </header>
  );
}

function FilmRunner() {
  const [playing, setPlaying] = useState(false);
  const [frame, setFrame] = useState(0);
  const [jump, setJump] = useState(false);
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setFrame((value) => value + 1), 90);
    return () => window.clearInterval(id);
  }, [playing]);
  const leap = () => {
    if (!playing) setPlaying(true);
    setJump(true);
    window.setTimeout(() => setJump(false), 480);
  };
  return (
    <button className="relative h-[82px] w-full overflow-hidden border-t border-white/16 text-left" onClick={leap} aria-label="Film runner game board">
      <span className="mt-2.5 flex justify-between text-[9px] text-[#777]"><b className="flex items-center gap-[5px] text-[#aaa]"><i className="block size-1.5 rounded-full bg-current" /> REC</b><em>FRAME {String(frame).padStart(4, "0")}</em></span>
      <span className="absolute right-0 bottom-1 left-0 h-[35px] border-b border-[#3a3a3a]">
        <motion.span animate={{ y: jump ? -22 : 0 }} transition={{ type: "spring", stiffness: 420, damping: 18 }} className="absolute bottom-px left-[5px]"><Video size={15}/></motion.span>
        <motion.span className="absolute bottom-px left-0" animate={playing ? { x: [220, -20] } : { x: 210 }} transition={{ repeat: Infinity, duration: 2.2, ease: "linear" }}><CircleDot size={18}/></motion.span>
      </span>
      {!playing && <span className="absolute right-0 bottom-[5px] grid size-7 place-items-center rounded-full border border-[#555] text-[0px] [&_svg]:w-2.5"><Play size={12} fill="currentColor" /> Play</span>}
    </button>
  );
}

export function FloatingMenu() {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 260);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <>
      <motion.div className="pointer-events-auto fixed bottom-[72px] left-10 z-80 flex items-center gap-2.5 max-[809px]:bottom-[22px] max-[809px]:left-4" animate={{ opacity: visible || open ? 1 : 0, y: visible || open ? 0 : 12 }}>
        <button className="grid size-12 place-items-center rounded-full border border-white/20 bg-[rgba(8,8,8,.8)] backdrop-blur-[10px] [&_svg]:w-5" onClick={() => setOpen(!open)} aria-label={open ? "Close menu" : "Open menu"}>{open ? <X /> : <Menu />}</button>
      </motion.div>
      <AnimatePresence>
        {open && (
          <>
            <motion.button aria-label="Close menu backdrop" onClick={() => setOpen(false)} className="fixed inset-0 z-70 bg-black/40 backdrop-blur-[10px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.aside className="fixed bottom-[130px] left-10 z-81 min-h-[214px] w-[440px] rounded-[14px] border border-white/12 bg-[rgba(13,13,13,.9)] p-6 backdrop-blur-[18px] max-[809px]:right-4 max-[809px]:bottom-[84px] max-[809px]:left-4 max-[809px]:w-auto" initial={{ opacity: 0, y: 26, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20 }}>
              <div className="grid grid-cols-[.85fr_1.15fr] gap-[26px] max-[809px]:grid-cols-[1fr_1.2fr] [&>div]:flex [&>div]:flex-col [&>div]:items-start [&_a]:my-0.5 [&_a]:text-base [&_sup]:ml-[7px] [&_sup]:text-[8px] [&_sup]:text-[#666]">
                <div>
                  <span className="mb-[18px] text-[11px] tracking-[.02em] text-[#777] uppercase">MENU</span>
                  {nav.map(([label, href, no]) => <Link onClick={() => setOpen(false)} key={label} href={href}>{label}<sup>{no}</sup></Link>)}
                </div>
                <div>
                  <span className="mb-[18px] text-[11px] tracking-[.02em] text-[#777] uppercase">GET IN TOUCH</span>
                  <a className="border-b border-[#555]" href="mailto:noah@Jimmy.studio">noah@Jimmy.studio</a>
                  <small className="my-[14px] mb-2.5 text-[#777]">© 2026 Jimmy™</small>
                  <FilmRunner />
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export function Timeline({ max = "02:00", className = "" }: { max?: string; className?: string }) {
  return (
    <div className={`absolute right-[var(--page-pad)] bottom-[104px] left-[var(--page-pad)] z-4 border-t border-white/20 pt-[7px] text-[10px] text-white/54 max-[809px]:top-[102px] max-[809px]:bottom-auto max-[809px]:[&_span:nth-child(even)]:hidden ${className}`} aria-hidden>
      <div className="absolute top-0 left-0 right-0 h-[5px] bg-[repeating-linear-gradient(90deg,rgba(255,255,255,.35)_0_1px,transparent_1px_calc(25%_-_1px))]" />
      <span className="absolute left-0">00:00</span>
      <span className="absolute left-1/4">00:30</span>
      <span className="absolute left-1/2">01:00</span>
      <span className="absolute left-3/4">01:30</span>
      <span className="absolute right-0 text-right">{max}</span>
    </div>
  );
}

export function Stats() {
  const data = [["120+","Projects Delivered"],["48M+","Views Generated"],["12","Years Editing"],["24H","Avg Turnaround"]];
  return <div className="mx-[var(--page-pad)] grid grid-cols-4 border-t border-white/16 max-[809px]:grid-cols-2">{data.map(([value,label], i)=><div className="grid grid-cols-[50px_1fr] border-r border-white/16 py-[22px] last:border-0 max-[809px]:min-h-[120px] max-[809px]:[&:nth-child(2)]:border-r-0" key={label}><small className="text-[#666]">0{i+1}</small><strong className="col-start-2 text-[42px] font-[450] max-[809px]:text-[32px]">{value}</strong><span className="col-start-2 mt-[5px] text-xs text-[#888]">{label}</span></div>)}</div>;
}

export function SectionLabel({ index, title, time }: { index: string; title: string; time: string }) {
  return <div className="grid grid-cols-[1fr_auto_1fr] border-b border-white/16 px-[var(--page-pad)] py-[22px] text-[11px] tracking-[.02em] text-[#777] uppercase max-[809px]:py-[18px]"><span>({index}) — {title}</span><i className="not-italic">+</i><time className="text-right">{time}</time></div>;
}

export function Footer({ variant = "home" }: { variant?: "home" | "work" | "project" }) {
  const height = variant === "work"
    ? "min-h-[1050px] max-[809px]:min-h-[700px]"
    : variant === "project"
      ? "min-h-[720px] max-[809px]:min-h-[750px]"
      : "min-h-[780px] max-[809px]:min-h-[1080px]";
  return (
    <footer className={`relative overflow-hidden border-t border-white/16 bg-[#090909] px-[var(--page-pad)] pt-[110px] pb-6 max-[809px]:px-4 max-[809px]:pt-[90px] max-[809px]:pb-5 ${height}`}>
      <div className="grid grid-cols-[1.7fr_1fr_1fr] gap-20 max-[809px]:grid-cols-2 max-[809px]:gap-x-[25px] max-[809px]:gap-y-[60px] [&>div]:flex [&>div]:flex-col [&>div]:items-start max-[809px]:[&>div:first-child]:col-span-full [&_p]:max-w-[280px] [&_p]:text-[#8a8a86] [&_a]:my-0.5">
        <div><p>I edit, grade and finish reels, campaigns and title work for creatives and brands.</p></div>
        <div><span className="mb-[18px] text-[11px] tracking-[.02em] text-[#777] uppercase">(01) — NAVIGATION</span>{nav.map(([l,h])=><Link key={l} href={h}>{l}</Link>)}<a href="mailto:noah@Jimmy.studio">Contact</a></div>
        <div><span className="mb-[18px] text-[11px] tracking-[.02em] text-[#777] uppercase">(02) — VISIT US</span><p>Downtown, Dubai — UAE</p><p>Mon–Fri: 09:00 – 18:00<br/>Sat: 10:00 – 16:00</p><div className="mt-[18px] flex gap-[9px] [&_a]:grid [&_a]:size-7 [&_a]:place-items-center [&_a]:border [&_a]:border-white/16"><a href="https://x.com/Jimmy" aria-label="X"><FaXTwitter/></a><a href="https://instagram.com/Jimmy.studio" aria-label="Instagram"><FaInstagram/></a><a href="https://youtube.com/@Jimmy" aria-label="YouTube"><FaYoutube/></a></div></div>
      </div>
      <div className="mt-[200px] mr-0 mb-[50px] ml-[-1.2vw] whitespace-nowrap text-[20.8vw] leading-[.8] font-[450] tracking-[-.07em] max-[1199px]:mt-[180px] max-[809px]:mt-[210px] max-[809px]:mb-10 max-[809px]:ml-0 max-[809px]:text-[26vw]">Jimmy</div>
      <div className="grid grid-cols-2 border-t border-white/16 pt-[15px] text-[10px] text-[#666] uppercase max-[809px]:grid-cols-[1fr_auto]"><span>© 2026 Jimmy™</span><span className="text-right"><a className="inline-flex items-center gap-[7px]" href="#top">Back To Top <ArrowDown size={14}/></a></span></div>
    </footer>
  );
}

export function GlobalChrome() {
  return <FloatingMenu/>;
}
