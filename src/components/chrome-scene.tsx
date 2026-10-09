"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type { HomeWeather } from "@/lib/home-rain";
import { isFlowMode } from "@/lib/floating-flow";
import { createChromeWorld, type FloatingMode } from "@/lib/chrome-world";

export default function ChromeScene({ workProgress, interactive, paused = false, weather = "sunny", floatingMode = "physics" }: { workProgress: RefObject<number>; interactive: boolean; paused?: boolean; weather?: HomeWeather; floatingMode?: FloatingMode }) {
  const guided = isFlowMode(floatingMode);
  const usesPhysics = guided || floatingMode === "physics" || floatingMode === "physics-wave";
  const initialPaused = useRef(paused);
  const initialWeather = useRef(weather);
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
      controller.current = createChromeWorld(canvas.current, { weather: initialWeather.current, floatingMode: initialMode.current, paused: initialPaused.current, vortexTarget: vortexTarget.current ?? undefined, workProgress, debug: process.env.NODE_ENV !== "production", onError: fail });
    } catch { fail(); }
    return () => { mounted = false; controller.current?.dispose(); controller.current = null; };
  }, [workProgress]);
  useEffect(() => { controller.current?.setWeather(weather); }, [weather]);
  useEffect(() => { controller.current?.setPaused(paused); }, [paused]);
  useEffect(() => { controller.current?.setFloatingMode(floatingMode); }, [floatingMode]);
  return <>
    <canvas data-hover-label={interactive ? usesPhysics ? "hold to attract · release to burst" : floatingMode === "planet-belt" ? "hold to accelerate" : floatingMode === "diagonal-drift" ? "diagonal drift" : "move to explore" : undefined} ref={canvas} tabIndex={interactive ? 0 : -1} role="img" aria-label={`${guided ? "沿三维轨迹自然漂浮、旋转和碰撞，鼠标悬停推开，按住吸引，松开炸开，空格加速。" : usesPhysics ? "自由漂浮，鼠标悬停推开，按住吸引，松开炸开，空格加速旋转。" : floatingMode === "planet-belt" ? "行星带围绕中央 Logo 旋转，按住鼠标或空格、回车加速，松开后自然减速。" : floatingMode === "diagonal-drift" ? "元素从左下向右上穿过画面，各自缓慢翻转，离开画面后循环入场。" : "有序漂浮，移动鼠标探索。"}${weather === "rainy" ? "阴天灰蓝云层与斜落雨丝、" : "缓慢飘动的白云与浅蓝天空背景、"}银色 ZZ、漂浮的黑色高光 Jimmy 手写字标、金属土星与银色云朵雨滴、蓝色凹刻 ZZ 挂件、始终朝向镜头的滑板人物、好运气瓶、扁苹果、花瓶、披风马、丘比特、粉色飞猪、戴银色耳机的金鱼、吃面人物和黄绿色像素漩涡、绿色传送枪、立体箭头、黑色 C 形、黑胶唱片、白色镂空雕塑、银色环形物体、银色块状茶壶与黄绿色透明玻璃三角形的互动场景。滚动进入作品。点击绿色传送枪或按 V 瞄准发射漩涡，触发吸入与喷出彩蛋，Esc 取消。`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", touchAction: "pan-y", cursor: "pointer" }} />
    <button ref={vortexTarget} type="button" aria-label="点击绿色传送枪，发射漩涡并触发吸入与吐出彩蛋" data-hover-label="click to shoot" style={{ display: "none", position: "absolute", zIndex: 2, left: 0, top: 0, width: 1, height: 1, padding: 0, border: 0, borderRadius: "50%", background: "transparent", cursor: "pointer", touchAction: "pan-y", transformOrigin: "0 0" }} />
    {failed && <p role="status" style={{ position: "absolute", top: "72%", left: 0, right: 0, textAlign: "center", fontSize: 12, color: "#aaa" }}>三维场景加载失败，请刷新重试。</p>}
  </>;
}
