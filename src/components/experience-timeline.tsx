"use client";

import { ScrambleText } from "./scramble-text";

import Image from "next/image";
import Link from "next/link";
import { TextRoll, textRollDuration, useTextRollInteraction } from "./text-roll";
import { ArrowRight } from "lucide-react";
import { projectCover, projects } from "@/lib/site-data";
import "./experience-timeline.css";

type TimelineEntry = {
  company: string;
  title: string;
  category: string;
  slug?: string;
  // Populate only with confirmed dates. The original experience order is the fallback.
  date: string | null;
};

const entries: TimelineEntry[] = [
  ...projects.filter((project) => project.slug !== "visual-explorations").map((project) => ({
    company: project.client === "Lemon8" ? "Lemon8" : "网易云音乐",
    title: project.title,
    category: project.kind,
    slug: project.slug,
    date: null,
  })),
  { company: "马蜂窝", title: "旅行地图与成就勋章", category: "用户增长 / 成长体系", slug: "visual-explorations", date: null },
  { company: "字节跳动", title: "今日头条 / 西瓜视频", category: "品牌 / 运营视觉", date: null },
];

const chronologicalEntries = [...entries].sort((a, b) =>
  (b.date ?? "").localeCompare(a.date ?? ""),
);

function TimelineRow({ entry }: { entry: TimelineEntry }) {
  const interaction = useTextRollInteraction(Math.max(...[entry.company, entry.title, entry.category].map(textRollDuration)));
  const content = <>
            <span className="timeline-date">{entry.date ? <time dateTime={entry.date}><ScrambleText>{entry.date}</ScrambleText></time> : <span aria-label="时间待补充"><ScrambleText>—</ScrambleText></span>}</span>
            <span className="timeline-company"><TextRoll>{entry.company}</TextRoll></span>
            <span className="timeline-project"><TextRoll reveal>{entry.title}</TextRoll></span>
            <span className="timeline-category"><TextRoll reveal>{entry.category}</TextRoll></span>
            {entry.slug ? <ArrowRight className="timeline-arrow" size={16} aria-hidden="true" /> : null}
            {entry.slug ? <span className="timeline-preview" aria-hidden="true">
              <Image src={projectCover(entry.slug)} alt="" width={600} height={400} sizes="28vw" />
            </span> : null}
          </>;
  return <li>
    {entry.slug
      ? <Link href={`/work/${entry.slug}`} className="timeline-row" {...interaction}>{content}</Link>
      : <div className="timeline-row" {...interaction}>{content}</div>}
  </li>;
}

export function ExperienceTimeline() {
  return (
    <section id="services" className="timeline-section" aria-label="项目与经历" tabIndex={-1}>
      <div className="home-sr-only" aria-hidden="true">
        <span><ScrambleText>时间</ScrambleText></span><span><ScrambleText>公司</ScrambleText></span><span><ScrambleText>项目名称</ScrambleText></span><span><ScrambleText>分类</ScrambleText></span>
      </div>
      <ul className="timeline-list">
        {chronologicalEntries.map((entry) => {
          return <TimelineRow key={`${entry.company}-${entry.title}`} entry={entry} />;
        })}
      </ul>
    </section>
  );
}
