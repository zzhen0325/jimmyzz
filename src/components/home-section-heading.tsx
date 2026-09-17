import type { ReactNode } from "react";

/** Shared 12-column reading line: chapter / title / supporting copy. */
export function HomeSectionHeading({ index, label, title, children, id }: {
  index: string;
  label: string;
  title: string;
  children: ReactNode;
  id: string;
}) {
  return <header className="home-section-heading">
    <p className="home-chapter"><span>({index})</span> {label}</p>
    <h2 id={id}>{title}</h2>
    <div className="home-section-description">{children}</div>
  </header>;
}
