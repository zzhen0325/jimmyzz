"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowUpRight, ArrowUp, Menu, X } from "lucide-react";
import { profile } from "@/lib/site-data";
const nav = [
  ["作品", "/work"],
  ["视觉漫游", "/#gallery"],
  ["设计实践", "/#services"],
  ["关于", "/#about"],
] as const;
export function TopNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  return (
    <header className="site-nav">
      <Link href="/" className="site-wordmark" aria-label="ZZ 张振 首页">
        ZZ<span>©</span>
      </Link>
      <nav aria-label="主导航" className="desktop-nav">
        {nav.map(([label, href]) => (
          <Link
            aria-current={pathname === href ? "page" : undefined}
            key={href}
            href={href}
          >
            {label}
          </Link>
        ))}
        <a href={`mailto:${profile.email}`}>
          聊聊项目 <ArrowUpRight size={14} />
        </a>
      </nav>
      <button
        className="mobile-menu-toggle"
        aria-label={open ? "关闭导航" : "打开导航"}
        aria-expanded={open}
        aria-controls="mobile-navigation"
        onClick={() => setOpen(!open)}
      >
        {open ? <X /> : <Menu />}
      </button>
      {open && (
        <nav
          id="mobile-navigation"
          className="mobile-nav"
          aria-label="移动导航"
        >
          {nav.map(([label, href]) => (
            <Link onClick={() => setOpen(false)} key={href} href={href}>
              {label}
              <ArrowUpRight size={20} />
            </Link>
          ))}
          <a href={`mailto:${profile.email}`}>
            联系我 <ArrowUpRight size={20} />
          </a>
        </nav>
      )}
    </header>
  );
}
export function Timeline({
  className = "",
}: {
  max?: string;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={`absolute right-[var(--page-pad)] left-[var(--page-pad)] z-4 flex justify-between border-t border-white/20 pt-2 text-[10px] text-white/60 ${className}`}
    >
      <span>THINK</span>
      <span>PLAN</span>
      <span>DO</span>
      <span>REVIEW</span>
      <span>REPEAT</span>
    </div>
  );
}
export function SectionLabel({
  index,
  title,
  time,
}: {
  index: string;
  title: string;
  time: string;
}) {
  return (
    <div className="section-label">
      <span>
        ({index}) — {title}
      </span>
      <span aria-hidden>+</span>
      <span>{time}</span>
    </div>
  );
}
export function Footer({
  variant = "home",
}: {
  variant?: "home" | "work" | "project";
}) {
  return (
    <footer id="contact" className={`portfolio-footer footer-${variant}`}>
      <p className="eyebrow">HAVE SOMETHING IN MIND? / 一起创造点什么</p>
      <a href={`mailto:${profile.email}`} className="footer-title">
        Let&apos;s make
        <br />
        it happen.
        <ArrowUpRight />
      </a>
      <div className="footer-details">
        <a href={`mailto:${profile.email}`}>{profile.email}</a>
        <div>
          {nav.map(([label, href]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} ZZ · 张振</span>
        <span>VISUAL DESIGN & CREATIVE TECHNOLOGY</span>
        <a href="#top">
          回到顶部 <ArrowUp size={14} />
        </a>
      </div>
    </footer>
  );
}
export function GlobalChrome() {
  return null;
}
