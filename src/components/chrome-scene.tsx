"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { createChromeWorld, type FloatingMode } from "@/lib/chrome-world";

export default function ChromeScene({ workProgress, interactive, paused = false, floatingMode = "physics" }: { workProgress: RefObject<number>; interactive: boolean; paused?: boolean; floatingMode?: FloatingMode }) {
  const usesPhysics = floatingMode === "physics" || floatingMode === "physics-wave";
  const initialPaused = useRef(paused);
  const initialMode = useRef(floatingMode);
  const canvas = useRef<HTMLCanvasElement>(null);
  const vortexTarget = useRef<HTMLButtonElement>(null);
  const controller = useRef<ReturnType<typeof createChromeWorld> | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!canvas.current) return;
    let mounted = true;
    const fail = () => { if (mounted) queueMicrotask(() => { if (mounted) setFailed(true); }); };
    try {
      controller.current = createChromeWorld(canvas.current, { floatingMode: initialMode.current, paused: initialPaused.current, vortexTarget: vortexTarget.current ?? undefined, workProgress, debug: process.env.NODE_ENV !== "production", onError: fail });
    } catch { fail(); }
    return () => { mounted = false; controller.current?.dispose(); controller.current = null; };
  }, [workProgress]);
  useEffect(() => { controller.current?.setPaused(paused); }, [paused]);
  useEffect(() => { controller.current?.setFloatingMode(floatingMode); }, [floatingMode]);
  return <>
    <canvas data-hover-label={interactive ? usesPhysics ? "hold to spin" : floatingMode === "planet-belt" ? "hold to accelerate" : "move to explore" : undefined} ref={canvas} tabIndex={interactive ? 0 : -1} role="img" aria-label={`${usesPhysics ? "自由漂浮，按住或按空格加速旋转。" : floatingMode === "planet-belt" ? "行星带围绕中央 Logo 旋转，按住鼠标或空格、回车加速，松开后自然减速。" : "有序漂浮，移动鼠标探索。"}银色 ZZ、漂浮的黑色高光 Jimmy 手写字标、灰色立体角色、金属土星与银色云朵雨滴、蓝色凹刻 ZZ 挂件、笑脸键帽、始终朝向镜头的滑板人物和黄绿色像素漩涡、五个立牌、绿色传送枪的互动场景。滚动进入作品。点击绿色传送枪或按 V 瞄准发射漩涡，触发吸入与喷出彩蛋，Esc 取消。`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", touchAction: "pan-y", cursor: "pointer" }} />
    <button ref={vortexTarget} type="button" aria-label="点击绿色传送枪，发射漩涡并触发吸入与吐出彩蛋" data-hover-label="click to shoot" style={{ display: "none", position: "absolute", zIndex: 2, left: 0, top: 0, padding: 0, border: 0, borderRadius: "50%", background: "transparent", cursor: "pointer", touchAction: "none", transformOrigin: "center" }} />
    {failed && <p role="status" style={{ position: "absolute", top: "72%", left: 0, right: 0, textAlign: "center", fontSize: 12, color: "#aaa" }}>三维场景加载失败，请刷新重试。</p>}
  </>;
}
