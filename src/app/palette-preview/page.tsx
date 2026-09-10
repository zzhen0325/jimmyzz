"use client";

import { useState } from "react";
import { heroPalettes } from "@/lib/hero-palettes";
import styles from "./preview.module.css";

export default function PalettePreview() {
  const [selected, setSelected] = useState(0);
  const palette = heroPalettes[selected];
  return <main className={styles.preview}>
    <header className={styles.header}>
      <div><p>ZZ / COLOR STUDIES</p><h1>同一节奏，五种色彩。</h1></div>
      <a href={`/?palette=${palette.id}`} target="_blank" rel="noreferrer">打开完整首页 ↗</a>
    </header>
    <nav className={styles.options} aria-label="矩形配色方案">
      {heroPalettes.map((item, index) => <button key={item.id} type="button" aria-pressed={selected === index} onClick={() => setSelected(index)}>
        <span className={styles.swatches} aria-hidden="true">{[item.dark, item.main, item.soft, item.accent, item.paper].map(color => <i key={color} style={{ background: color }} />)}</span>
        <span>0{index + 1} / {item.name}{index === 0 ? ' · 推荐' : ''}</span>
      </button>)}
    </nav>
    <p className={styles.description} aria-live="polite">{palette.description}</p>
    <iframe key={palette.id} src={`/?palette=${palette.id}`} title={`${palette.name}首页实时预览`} className={styles.frame} />
  </main>;
}
