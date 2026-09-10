"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { emptyBoard, playCell } from "@/lib/minesweeper";

const colors = ["#f7a6cf", "#b9b2fa", "#fbb33c", "#9cdc62", "#48bee9", "#ff704e"];
function startBoard(columns: number, rows: number) {
  // Open a safe clearing immediately so the video is visible through the grid.
  return playCell(emptyBoard(columns, rows), Math.floor(rows / 2) * columns + Math.floor(columns / 2));
}
export function HeroMinesweeper({ origin, onClose }: {
  origin: { x: number; y: number };
  onClose: () => void;
}) {
  const [board, setBoard] = useState(() => startBoard(window.innerWidth < 600 ? 9 : 16, window.innerWidth < 600 ? 12 : 9));
  const [flagMode, setFlagMode] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const surface = useRef<HTMLElement>(null);
  const exit = useRef<HTMLButtonElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const game = surface.current!;
    const hero = game.closest(".home-hero")!;
    const trigger = hero.querySelector<HTMLButtonElement>(".hero-secret-trigger");
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.dispatchEvent(new CustomEvent("hero-game-change", { detail: true }));
    const siblings: { node: HTMLElement; inert: boolean }[] = [];
    let parent: Element | null = hero;
    while (parent && parent !== document.body) {
      for (const node of Array.from(parent.parentElement?.children ?? [])) {
        if (node !== parent && node instanceof HTMLElement) { siblings.push({ node, inert: node.inert }); node.inert = true; }
      }
      parent = parent.parentElement;
    }
    exit.current?.focus({ preventScroll: true });
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
      if (event.key === "Tab") {
        const buttons = Array.from(game.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
        const first = buttons[0], last = buttons.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    const stopScroll = (event: Event) => event.preventDefault();
    window.addEventListener("keydown", key);
    window.addEventListener("wheel", stopScroll, { passive: false, capture: true });
    game.addEventListener("touchmove", stopScroll, { passive: false });
    return () => {
      document.body.style.overflow = oldOverflow;
      window.dispatchEvent(new CustomEvent("hero-game-change", { detail: false }));
      siblings.forEach(({ node, inert }) => { node.inert = inert; });
      window.removeEventListener("keydown", key);
      window.removeEventListener("wheel", stopScroll, true);
      game.removeEventListener("touchmove", stopScroll);
      trigger?.focus({ preventScroll: true });
    };
  }, []);
  useEffect(() => {
    if (board.status !== "playing") return;
    const timer = setInterval(() => setSeconds(value => value + 1), 1000);
    return () => clearInterval(timer);
  }, [board.status]);
  const remaining = board.mines - board.cells.filter(cell => cell.flagged).length;
  const message = board.status === "won" ? "漂亮！所有安全方格已找到。" : board.status === "lost" ? "踩到雷了，再试一次？" : board.status === "ready" ? "点开任意方格，第一步总是安全的。" : "数字代表周围八格的雷数。";
  return <section ref={surface} className="hero-minesweeper" aria-label="S04 隐藏扫雷游戏" data-lenis-prevent style={{ "--origin-x": `${origin.x}%`, "--origin-y": `${origin.y}%` } as CSSProperties}>
    <div className="mines-content">
      <div className="mines-toolbar">
        <span className="mines-edition">S04 / 扫雷</span>
        <div className="mines-counters"><span>雷 <b>{String(remaining).padStart(3, "0")}</b></span><span>时间 <b>{String(Math.min(999, seconds)).padStart(3, "0")}</b></span></div>
        <div className="mines-actions"><button aria-pressed={flagMode} onClick={() => setFlagMode(value => !value)}>{flagMode ? "⚑ 插旗中" : "⚑ 插旗"}</button><button onClick={() => { setBoard(startBoard(board.columns, board.rows)); setSeconds(0); setFlagMode(false); }}>重开 ↻</button><button ref={exit} onClick={onClose} aria-label="退出扫雷">退出 ×</button></div>
      </div>
      <div className="mines-board" role="group" aria-label="扫雷棋盘" style={{ "--columns": board.columns, "--rows": board.rows } as CSSProperties}>
        {board.cells.map((cell, index) => {
          const ended = board.status === "lost" || board.status === "won";
          const mine = ended && cell.mine;
          const value = mine ? (board.status === "won" ? "⚑" : "✳") : cell.flagged ? "⚑" : cell.open ? cell.adjacent || "" : "";
          return <button key={index} type="button" className="mines-cell" data-open={cell.open} data-mine={mine} data-flag={cell.flagged} data-number={cell.open ? cell.adjacent : 0} disabled={ended} style={{ "--tile": colors[(index * 17 + Math.floor(index / board.columns) * 11) % colors.length] } as CSSProperties}
            aria-label={`第 ${Math.floor(index / board.columns) + 1} 行，第 ${index % board.columns + 1} 列，${mine ? "雷" : cell.flagged ? "已插旗" : cell.open ? `${cell.adjacent} 个相邻雷` : "未翻开"}`}
            onClick={() => setBoard(current => playCell(current, index, flagMode))}
            onContextMenu={event => { event.preventDefault(); setBoard(current => playCell(current, index, true)); }}
            onKeyDown={event => {
              const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -board.columns, ArrowDown: board.columns }[event.key];
              if (delta !== undefined) { event.preventDefault(); const buttons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("button"); buttons?.[Math.max(0, Math.min(board.cells.length - 1, index + delta))]?.focus(); }
            }}>{value}</button>;
        })}
      </div>
      <footer className="mines-footer"><p role="status">{message}</p><span>点击翻开 / 右键或切换插旗 <i>ESC 返回</i></span></footer>
    </div>
  </section>;
}
