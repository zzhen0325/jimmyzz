"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { SectionLabel } from "./site-chrome";
import styles from "./wave-type.module.css";

const DEFAULT_TEXT = "VIBE MAKING";
const COLORS = ["#ff99d0", "#909bff", "#ffa148", "#54befe", "#44a74d", "#e0ff5e"];

export function WaveType() {
  const section = useRef<HTMLElement>(null);
  const [text, setText] = useState(DEFAULT_TEXT);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [active, setActive] = useState(false);
  const [replay, setReplay] = useState(0);
  const letters = Array.from(text.trim() || DEFAULT_TEXT).slice(0, 18);

  useEffect(() => {
    let visible = false;
    const update = () => setActive(visible && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    if (section.current) observer.observe(section.current);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  return (
    <section id="wave-type" ref={section} className={styles.section} aria-labelledby="wave-type-title">
      <SectionLabel index="02 / B" title="TYPE IN MOTION / 字体实验" time="PLAY WITH WORDS" />
      <div className={styles.heading}>
        <h2 id="wave-type-title">Make some <em>waves.</em></h2>
        <p>让文字动起来。<br />输入你的灵感，看它自由起伏。</p>
      </div>
      <div className={styles.stage} role="img" aria-label={`彩色波浪字体：${letters.join("")}`} data-playing={active && !paused}
        style={{ "--letters": letters.length, "--duration": `${4 / speed}s` } as CSSProperties}>
        <div className={styles.rows} key={replay} aria-hidden="true">
          {Array.from({ length: 5 }, (_, row) => (
            <div className={styles.row} key={row}>
              {letters.map((letter, column) => (
                <span className={styles.letter} key={`${column}-${letter}`} style={{
                  "--delay": `${-(column * 0.22 + row * 0.45) * 4 / speed}s`,
                  "--color": COLORS[(Math.floor(column / 2) + row) % COLORS.length],
                } as CSSProperties}>{letter === " " ? "\u00a0" : letter}</span>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className={styles.controls}>
        <label className={styles.textControl} htmlFor="wave-text">
          <span>你的文字</span>
          <input id="wave-text" value={text} maxLength={36} placeholder={DEFAULT_TEXT} autoComplete="off"
            onChange={(event) => setText(Array.from(event.target.value).slice(0, 18).join(""))} />
        </label>
        <label className={styles.speedControl} htmlFor="wave-speed">
          <span>速度</span>
          <input id="wave-speed" type="range" min="0.25" max="2" step="0.25" value={speed}
            onChange={(event) => setSpeed(Number(event.target.value))} />
          <output htmlFor="wave-speed">{speed.toFixed(2)}×</output>
        </label>
        <button type="button" onClick={() => setPaused(!paused)} aria-pressed={paused}>
          {paused ? <Play size={14} /> : <Pause size={14} />}{paused ? "播放" : "暂停"}
        </button>
        <button type="button" onClick={() => { setText(DEFAULT_TEXT); setSpeed(1); setPaused(false); setReplay(replay + 1); }}>
          <RotateCcw size={14} />重置
        </button>
      </div>
      <p className={styles.credit}>TYPE EXPERIMENT / 01 <a href="https://brik.space/toolviewer?slug=remix-of-label-block-type-mshpil8d" target="_blank" rel="noreferrer">Inspired by Wave Type ↗</a></p>
    </section>
  );
}
