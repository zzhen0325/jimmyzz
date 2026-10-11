"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type { HomeWeather } from "@/lib/home-rain";
import { isFlowMode } from "@/lib/floating-flow";
import { createChromeWorld, defaultExportLayout, type ExportLayout, type FloatingMode } from "@/lib/chrome-world";
import styles from "./chrome-scene.module.css";

export default function ChromeScene({ workProgress, interactive, paused = false, weather = "sunny", floatingMode = "physics" }: { workProgress: RefObject<number>; interactive: boolean; paused?: boolean; weather?: HomeWeather; floatingMode?: FloatingMode }) {
  const guided = isFlowMode(floatingMode);
  const usesPhysics = floatingMode === "gravity" || guided || floatingMode === "physics" || floatingMode === "physics-wave";
  const initialPaused = useRef(paused);
  const initialWeather = useRef(weather);
  const initialMode = useRef(floatingMode);
  const canvas = useRef<HTMLCanvasElement>(null);
  const vortexTarget = useRef<HTMLButtonElement>(null);
  const controller = useRef<ReturnType<typeof createChromeWorld> | null>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const exportPending = useRef(false);
  const exportButton = useRef<HTMLButtonElement>(null);
  const [exportMode, setExportMode] = useState(false);
  const [layout, setLayout] = useState(defaultExportLayout);
  const drag = useRef<{ x: number; rotation: number } | null>(null);
  const editing = exportMode && interactive;
  useEffect(() => { controller.current?.setExportLayout(editing ? layout : null); }, [editing, layout, ready]);
  useEffect(() => {
    if (!editing) return;
    const exit = (event: KeyboardEvent) => { if (event.key === "Escape") setExportMode(false); };
    window.addEventListener("keydown", exit);
    return () => window.removeEventListener("keydown", exit);
  }, [editing]);
  useEffect(() => {
    if (!interactive || !ready || paused || failed) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.isComposing || !event.shiftKey || event.ctrlKey || event.metaKey || event.altKey || event.code !== "KeyS") return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || target.closest("input, textarea, select, [role='textbox']"))) return;
      event.preventDefault();
      exportButton.current?.click();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [interactive, ready, paused, failed]);
  useEffect(() => {
    if (!canvas.current) return;
    let mounted = true;
    const fail = () => { if (mounted) queueMicrotask(() => { if (mounted) setFailed(true); }); };
    try {
      controller.current = createChromeWorld(canvas.current, { weather: initialWeather.current, floatingMode: initialMode.current, paused: initialPaused.current, vortexTarget: vortexTarget.current ?? undefined, workProgress, debug: process.env.NODE_ENV !== "production", onError: fail });
      void controller.current.loaded.then(() => { if (mounted) setReady(true); }, fail);
    } catch { fail(); }
    return () => { mounted = false; controller.current?.dispose(); controller.current = null; };
  }, [workProgress]);
  useEffect(() => { controller.current?.setWeather(weather); }, [weather]);
  useEffect(() => { controller.current?.setPaused(paused); }, [paused]);
  useEffect(() => { controller.current?.setFloatingMode(floatingMode); }, [floatingMode]);
  const exportFrame = async () => {
    if (!controller.current || exportPending.current) return;
    exportPending.current = true;
    setExporting(true);
    setExportError("");
    try {
      const blob = await controller.current.exportFrame();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `JimmyZZ-3D-${new Date().toISOString().replace(/[:.]/g, "-")}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "导出失败，请重试。");
    } finally {
      exportPending.current = false;
      setExporting(false);
    }
  };
  return <>
    {editing && <div className={styles.rotateSurface} aria-hidden="true"
      onPointerDown={event => { if (event.button !== 0) return; event.currentTarget.setPointerCapture(event.pointerId); drag.current = { x: event.clientX, rotation: layout.rotation }; }}
      onPointerMove={event => { const start = drag.current; if (start) setLayout(value => ({ ...value, rotation: ((start.rotation + (event.clientX - start.x) * .35 + 180) % 360 + 360) % 360 - 180 })); }}
      onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }} />}
    {interactive && !failed && <div className={styles.exportControl}>
      {editing && <div className={styles.exportPanel} role="group" aria-label="导出构图设置">
        <strong>导出模式</strong><span>拖动画面旋转，暂停后微调构图</span>
        <label>运动方式<select aria-label="导出运动方式" value={layout.motion} onChange={event => setLayout(value => ({ ...value, motion: event.target.value as ExportLayout["motion"] }))}>
          <option value="tilted-orbit">倾斜轨道</option><option value="flow-rings">并列环流</option><option value="flow-wave">横向波带</option><option value="flow-twist">扭转环流</option><option value="flow-helix">螺旋流</option><option value="diagonal-drift">斜向漫游</option><option value="physics">自由漂浮</option><option value="planet-belt">行星带</option><option value="orbit">双层轨道</option><option value="wave">波浪轨道</option>
        </select></label>
        <button type="button" aria-pressed={layout.playing} onClick={() => setLayout(value => ({ ...value, playing: !value.playing }))}>{layout.playing ? "暂停预览" : "播放预览"}</button>
        {([
          ["rotation", "轨道旋转", -180, 180, 1, "°"],
          ["tilt", "倾斜角度", -70, 70, 1, "°"],
          ["depth", "前后深度", 0, 2.5, .01, "%"],
          ["spacing", "元素间距", .6, 1.4, .01, "%"],
          ["size", "元素大小", .3, 1.8, .01, "%"],
          ["logoSize", "Logo 大小", .3, 1.2, .01, "%"],
        ] as const).map(([key, label, min, max, step, unit]) => <label key={key}>
          <span>{label}<output>{Math.round(layout[key] * (unit === "%" ? 100 : 1))}{unit}</output></span>
          <input type="range" aria-label={label} min={min} max={max} step={step} value={layout[key]} onChange={event => setLayout(value => ({ ...value, [key]: Number(event.target.value) }))} />
        </label>)}
        <button type="button" onClick={() => setLayout(defaultExportLayout)}>重置构图</button>
      </div>}
      <button type="button" disabled={!ready || paused || exporting} aria-pressed={editing} onClick={() => setExportMode(value => !value)}>{editing ? "退出导出模式" : "导出模式"}</button>
      <button ref={exportButton} type="button" onClick={exportFrame} disabled={!ready || paused || exporting} aria-busy={exporting} aria-keyshortcuts="Shift+S" title="导出当前高清帧（Shift + S）">
        {exporting ? "正在导出…" : "↓ 导出高清帧 · ⇧S"}
      </button>
      {exportError && <p role="alert">{exportError}</p>}
    </div>}
    <canvas data-hover-label={interactive ? "" : undefined} ref={canvas} tabIndex={interactive ? 0 : -1} role="img" aria-label={`${floatingMode === "gravity" ? "漂浮元素在重力下掉落到视口底部，碰撞后落稳，中央 ZZ 标志保持固定。" : guided ? "沿三维轨迹自然漂浮、旋转和碰撞，鼠标接触碰撞（传送枪除外），按住吸引，松开炸开，空格加速。" : usesPhysics ? "自由漂浮，鼠标接触碰撞（传送枪除外），按住吸引，松开炸开，空格加速旋转。" : floatingMode === "planet-belt" ? "行星带围绕中央 Logo 旋转，按住鼠标或空格、回车加速，松开后自然减速。" : floatingMode === "diagonal-drift" ? "元素从左下向右上穿过画面，各自缓慢翻转，离开画面后循环入场。" : "有序漂浮，移动鼠标探索。"}${weather === "rainy" ? "阴天灰蓝云层与斜落雨丝、" : "缓慢飘动的白云与浅蓝天空背景、"}银色 ZZ、漂浮的黑色高光 Jimmy 手写字标、金属土星与银色云朵雨滴、蓝色凹刻 ZZ 挂件、绿色曲线树干、始终朝向镜头的蓝色有机桌、蓝色穿环星星、黄色笑脸环、好运气瓶、扁苹果、花瓶、披风马、丘比特、粉色飞猪、戴银色耳机的金鱼、吃面人物和黄绿色像素漩涡、绿色传送枪、立体箭头、黑色 C 形、白色镂空雕塑、银色环形物体、银色块状茶壶与黄绿色透明玻璃三角形的互动场景。滚动进入作品。点击绿色传送枪或按 V 瞄准发射漩涡，触发吸入与喷出彩蛋，Esc 取消。`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", touchAction: "pan-y", cursor: "pointer" }} />
    <button ref={vortexTarget} type="button" aria-label="点击绿色传送枪，发射漩涡并触发吸入与吐出彩蛋" data-hover-label="Open The Portal" data-hover-label-on-control="" style={{ display: "none", position: "absolute", zIndex: 2, left: 0, top: 0, width: 1, height: 1, padding: 0, border: 0, borderRadius: "50%", background: "transparent", cursor: "pointer", touchAction: "pan-y", transformOrigin: "0 0" }} />
    {failed && <p role="status" style={{ position: "absolute", top: "72%", left: 0, right: 0, textAlign: "center", fontSize: 12, color: "#aaa" }}>三维场景加载失败，请刷新重试。</p>}
  </>;
}
