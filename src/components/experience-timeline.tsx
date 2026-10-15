"use client";

import { ScrambleText } from "./scramble-text";
import { useState } from "react";

import Image from "./content-image";
import Link from "next/link";
import { TextRoll, textRollDuration, useTextRollInteraction } from "./text-roll";
import { ArrowRight } from "lucide-react";
import { projectCover, projects } from "@/lib/site-data";
import { additionalExperience, timelineExcludedSlugs, type TimelineEntry } from "@/lib/projects-config";
import "./experience-timeline.css";

const entries: TimelineEntry[] = [
  ...projects.filter((project) => !timelineExcludedSlugs.includes(project.slug)).map((project) => ({
    company: project.client === "Lemon8" ? "Lemon8" : "网易云音乐",
    title: project.title,
    category: project.kind,
    slug: project.slug,
    date: null,
  })),
  ...additionalExperience,
];

const chronologicalEntries = [...entries].sort((a, b) =>
  (b.date ?? "").localeCompare(a.date ?? ""),
);

function TimelineRow({ entry, cover, reveal = true }: { entry: TimelineEntry; cover?: string; reveal?: boolean }) {
  const interaction = useTextRollInteraction(Math.max(...[entry.company, entry.title, entry.category].map(textRollDuration)));
  const content = <>
            <span className="timeline-date">{entry.date ? <time dateTime={entry.date}><ScrambleText>{entry.date}</ScrambleText></time> : <span aria-label="时间待补充"><ScrambleText>—</ScrambleText></span>}</span>
            <span className="timeline-company"><TextRoll>{entry.company}</TextRoll></span>
            <span className="timeline-project"><TextRoll reveal={reveal}>{entry.title}</TextRoll></span>
            <span className="timeline-category"><TextRoll reveal={reveal}>{entry.category}</TextRoll></span>
            {entry.slug ? <ArrowRight className="timeline-arrow" size={16} aria-hidden="true" /> : null}
            {entry.slug ? <span className="timeline-preview" aria-hidden="true">
              <Image src={cover ?? projectCover(entry.slug)} alt="" width={600} height={400} sizes="28vw" />
            </span> : null}
          </>;
  return <li>
    {entry.slug
      ? <Link href={`/work/${entry.slug}`} prefetch={true} className="timeline-row" {...interaction}>{content}</Link>
      : <div className="timeline-row" {...interaction}>{content}</div>}
  </li>;
}

export function RelatedProjectList({ entries }: { entries: (TimelineEntry & { cover: string })[] }) {
  const [expanded, setExpanded] = useState(false);
  const label = expanded ? "Less" : "More";
  const interaction = useTextRollInteraction(textRollDuration(label));
  const visible = expanded ? entries : entries.slice(0, 5);
  return (
    <section className="timeline-section case-project-list" aria-label="更多项目">
      <ul id="related-projects" className="timeline-list">
        {visible.map((entry) => <TimelineRow key={entry.slug} entry={entry} cover={entry.cover} reveal={false} />)}
      </ul>
      {entries.length > 5 && (
        <button className="case-project-more" type="button" aria-label={label} aria-expanded={expanded} aria-controls="related-projects" {...interaction} onClick={() => setExpanded((value) => !value)}>
          <TextRoll>{label}</TextRoll>
        </button>
      )}
    </section>
  );
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
