"use client";

import { useRef, useState } from "react";
import { Download, Pause, Play, RotateCcw, Settings2, X } from "lucide-react";
import { useGSAP } from "@/lib/gsap";
import { activityImageCount, createActivitySphere, sphereDefaults, orbitDefaults, type ActivityLayout, type SphereParameters } from "@/lib/activity-sphere-scene";
import styles from "./activity-sphere.module.css";

const orbitControls: { key: keyof SphereParameters; label: string; min: number; max: number; step: number }[] = [
  { key: "orbitTilt", label: "轨道倾斜", min: -90, max: 90, step: 1 },
  { key: "orbitDepth", label: "轨道纵深", min: 0, max: 1, step: 0.01 },
];

const controls: { key: keyof SphereParameters; label: string; min: number; max: number; step: number }[] = [
  { key: "speed", label: "旋转速度", min: 0, max: 3, step: 0.05 },
  { key: "imageSize", label: "图片大小", min: 0.3, max: 2, step: 0.05 },
  { key: "spacing", label: "图片间距", min: 0.6, max: 1.8, step: 0.05 },
  { key: "sphereSize", label: "球体大小", min: 0.5, max: 1.5, step: 0.05 },
  { key: "sphereWidth", label: "球体宽度", min: 0.5, max: 2, step: 0.05 },
  { key: "sphereHeight", label: "球体高度", min: 0.5, max: 2, step: 0.05 },
  { key: "depth", label: "远近层次", min: 0, max: 1, step: 0.05 },
  { key: "count", label: "图片数量", min: 12, max: 1200, step: 1 },
];

export function ActivitySphere() {
  const rootRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<ReturnType<typeof createActivitySphere> | null>(null);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const playingRef = useRef(true);
  const layoutRef = useRef<ActivityLayout>("sphere");
  const savedParameters = useRef({ sphere: { ...sphereDefaults }, orbit: { ...orbitDefaults } });
  const [layout, setLayout] = useState<ActivityLayout>("sphere");
  const parametersRef = useRef({ ...sphereDefaults });
  const exportUrlRef = useRef<string | null>(null);
  const [parameters, setParameters] = useState({ ...sphereDefaults });
  const [playing, setPlaying] = useState(true);
  const [panelOpen, setPanelOpen] = useState(true);
  const [status, setStatus] = useState("正在载入图片…");
  const [ready, setReady] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState("");
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const [exportResolution, setExportResolution] = useState(8192);
  const [trimExport, setTrimExport] = useState(true);
  const [exportFilename, setExportFilename] = useState("activity-sphere-transparent.png");

  useGSAP(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let scene: ReturnType<typeof createActivitySphere>;
    try {
      scene = createActivitySphere(canvas, () => { setReady(true); setStatus("拖动旋转 · 滚轮缩放"); }, (message) => { setReady(false); setStatus(message); });
    } catch {
      setStatus("无法启动 WebGL，请检查浏览器的硬件加速设置");
      return;
    }
    sceneRef.current = scene;
    scene.setLayout(layoutRef.current, parametersRef.current);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const applyPreference = () => {
      playingRef.current = !reduced.matches;
      setPlaying(playingRef.current);
      scene.setPlaying(playingRef.current);
    };
    applyPreference();
    reduced.addEventListener("change", applyPreference);
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const value = Math.max(0.5, Math.min(1.5, parametersRef.current.sphereSize * Math.exp(-event.deltaY * 0.001)));
      parametersRef.current = { ...parametersRef.current, sphereSize: value };
      setParameters(parametersRef.current);
      scene.setParameters({ sphereSize: value });
    };
    canvas.addEventListener("wheel", wheel, { passive: false });
    return () => {
      sceneRef.current = null;
      canvas.removeEventListener("wheel", wheel);
      reduced.removeEventListener("change", applyPreference);
      scene.dispose();
      if (exportUrlRef.current) URL.revokeObjectURL(exportUrlRef.current);
    };
  }, { scope: rootRef });

  const update = (key: keyof SphereParameters, value: number) => {
    parametersRef.current = { ...parametersRef.current, [key]: value };
    setParameters(parametersRef.current);
    sceneRef.current?.setParameters({ [key]: value });
  };
  const changeLayout = (value: ActivityLayout) => {
    if (value === layoutRef.current) return;
    savedParameters.current[layoutRef.current] = { ...parametersRef.current };
    layoutRef.current = value;
    setLayout(value);
    parametersRef.current = { ...savedParameters.current[value] };
    setParameters(parametersRef.current);
    sceneRef.current?.setLayout(value, parametersRef.current);
  };
  const togglePlaying = () => {
    playingRef.current = !playingRef.current;
    setPlaying(playingRef.current);
    sceneRef.current?.setPlaying(playingRef.current);
  };
  const endDrag = () => { drag.current = null; sceneRef.current?.setDragging(false); };
  const reset = () => {
    parametersRef.current = { ...(layoutRef.current === "orbit" ? orbitDefaults : sphereDefaults) };
    setParameters(parametersRef.current);
    sceneRef.current?.setLayout(layoutRef.current, parametersRef.current);
  };
  const exportPng = async () => {
    if (!sceneRef.current || exporting) return;
    setExporting(true);
    setExportStatus("");
    try {
      const { blob, width, height } = await sceneRef.current.exportPng(exportResolution, trimExport);
      if (!rootRef.current) return;
      const url = URL.createObjectURL(blob);
      if (exportUrlRef.current) URL.revokeObjectURL(exportUrlRef.current);
      exportUrlRef.current = url;
      setExportUrl(url);
      const link = document.createElement("a");
      link.href = url;
      const filename = `activity-sphere-${width}x${height}.png`;
      setExportFilename(filename);
      link.download = filename;
      link.click();
      setExportStatus(`${width} × ${height} 透明 PNG 已生成`);
    } catch (error) {
      setExportStatus(error instanceof Error ? error.message : "导出失败，请重试");
    } finally {
      setExporting(false);
    }
  };

  return <main ref={rootRef} className={styles.page}>
    <canvas
      ref={canvasRef}
      className={styles.canvas}
      aria-label={`${activityImageCount} 张活动海报组成的${layout === "orbit" ? "倾斜环绕轨道" : "三维旋转图片球体"}，方向键旋转，空格暂停或播放`}
      tabIndex={0}
      onPointerDown={(event) => {
        if (drag.current) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
        sceneRef.current?.setDragging(true);
      }}
      onPointerMove={(event) => {
        const pointer = drag.current;
        if (!pointer || pointer.id !== event.pointerId) return;
        sceneRef.current?.rotate((event.clientX - pointer.x) * 0.006, (event.clientY - pointer.y) * 0.006);
        pointer.x = event.clientX; pointer.y = event.clientY;
      }}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onLostPointerCapture={endDrag}
      onKeyDown={(event) => {
        if (event.key === " ") { event.preventDefault(); togglePlaying(); }
        if (event.key.startsWith("Arrow")) {
          event.preventDefault();
          sceneRef.current?.rotate(event.key === "ArrowLeft" ? -0.12 : event.key === "ArrowRight" ? 0.12 : 0,
            event.key === "ArrowUp" ? 0.12 : event.key === "ArrowDown" ? -0.12 : 0);
        }
      }}
    />
    <div className={styles.toolbar}>
      <span className={styles.hint} role="status">{status}</span>
      <div className={styles.buttons}>
        <button type="button" onClick={togglePlaying} aria-label={playing ? "暂停旋转" : "开始旋转"}>{playing ? <Pause size={16} /> : <Play size={16} />}</button>
        <button type="button" onClick={reset} aria-label="重置全部参数"><RotateCcw size={16} /></button>
        <button type="button" onClick={() => setPanelOpen(!panelOpen)} aria-label={panelOpen ? "隐藏参数" : "显示参数"} aria-expanded={panelOpen} aria-controls="sphere-parameters"><Settings2 size={16} /></button>
      </div>
    </div>
    {panelOpen && <aside className={styles.panel} id="sphere-parameters" aria-label="排列与动效参数">
      <header><span>参数</span><button type="button" onClick={() => setPanelOpen(false)} aria-label="关闭参数面板"><X size={16} /></button></header>
      <div className={styles.modes} role="group" aria-label="排列方式">
        <button type="button" aria-pressed={layout === "sphere"} onClick={() => changeLayout("sphere")}>球体分布</button>
        <button type="button" aria-pressed={layout === "orbit"} onClick={() => changeLayout("orbit")}>轨道环绕</button>
      </div>
      {layout === "orbit" && <p className={styles.modeHint}>Orbit Showcase · 默认 12 秒一圈</p>}
      {[...controls, ...(layout === "orbit" ? orbitControls : [])].map(({ key, label: originalLabel, min, max, step }) => {
        const label = layout === "orbit" ? originalLabel.replace("球体", "轨道") : originalLabel;
        return <label className={styles.control} key={key}>
        <span>{label}<output>{key === "orbitTilt" ? `${parameters[key]}°` : key === "count" ? Math.round(parameters[key]) : `${parameters[key].toFixed(2)}×`}</output></span>
        <input aria-label={label} type="range" min={min} max={max} step={step} value={parameters[key]} onChange={(event) => update(key, Number(event.target.value))} />
      </label>; })}
      {layout === "orbit" && <div className={styles.modes} role="group" aria-label="旋转方向">
        <button type="button" aria-pressed={parameters.direction === 1} onClick={() => update("direction", 1)}>顺时针</button>
        <button type="button" aria-pressed={parameters.direction === -1} onClick={() => update("direction", -1)}>逆时针</button>
      </div>}
      <footer><span>{activityImageCount} 张素材 · {Math.round(parameters.count)} 张卡片</span><button type="button" onClick={reset}>恢复默认</button></footer>
      <label className={styles.exportResolution}>导出长边
        <select aria-label="导出分辨率" value={exportResolution} disabled={exporting} onChange={event => setExportResolution(Number(event.target.value))}>
          <option value={2048}>2048 px</option><option value={4096}>4096 px · 高清</option><option value={8192}>8192 px · 超清</option>
        </select>
      </label>
      <label className={styles.exportTrim}><input type="checkbox" checked={trimExport} disabled={exporting} onChange={event => setTrimExport(event.target.checked)} />裁切透明留白</label>
      <button className={styles.export} type="button" disabled={!ready || exporting} onClick={() => void exportPng()}><Download size={14} />{exporting ? "正在导出…" : "导出透明 PNG"}</button>
      {exportStatus && <p className={styles.exportStatus} role="status">{exportStatus}{exportUrl && <a href={exportUrl} download={exportFilename}>下载 PNG</a>}</p>}
      {exportUrl && <a className={styles.exportPreview} href={exportUrl} download={exportFilename} aria-label="下载透明图片预览">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={exportUrl} alt="透明背景排列导出预览" />
      </a>}
    </aside>}
  </main>;
}
