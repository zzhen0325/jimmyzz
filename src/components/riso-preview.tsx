"use client";

import { risographPresets } from "@/lib/risograph";
import styles from "./riso-preview.module.css";

export function RisoPreview({ selected, onSelect }: { selected: number; onSelect: (index: number) => void }) {
  return <aside className={styles.preview} aria-label="首页 Riso 效果对比" data-hover-label="">
    <div className={styles.heading}><b>RISO / {risographPresets.length} 组双色</b><span aria-live="polite">{risographPresets[selected].description}</span></div>
    <div className={styles.options}>
      {risographPresets.map((preset, index) => <button key={preset.name} type="button" aria-pressed={index === selected} onClick={() => onSelect(index)}>
        <span className={styles.swatches}>{preset.settings.inks.map((ink, i) => <i key={i} style={{ background: ink.color }} />)}</span>
        <span><small>{String(index + 1).padStart(2, "0")}</small> {preset.name}</span>
      </button>)}
    </div>
  </aside>;
}
