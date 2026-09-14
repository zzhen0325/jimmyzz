"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { createChromeWorld } from "@/lib/chrome-world";

export default function ChromeScene({ workProgress, interactive }: { workProgress: RefObject<number>; interactive: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const vortexTarget = useRef<HTMLButtonElement>(null);
  const controller = useRef<ReturnType<typeof createChromeWorld> | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!canvas.current) return;
    let mounted = true;
    const fail = () => { if (mounted) queueMicrotask(() => { if (mounted) setFailed(true); }); };
    try {
      controller.current = createChromeWorld(canvas.current, { vortexTarget: vortexTarget.current ?? undefined, workProgress, debug: process.env.NODE_ENV !== "production", onError: fail });
    } catch { fail(); }
    return () => { mounted = false; controller.current?.dispose(); controller.current = null; };
  }, [workProgress]);
  return <>
    <canvas data-hover-label={interactive ? "click to spin" : undefined} ref={canvas} tabIndex={interactive ? 0 : -1} role="img" aria-label="银色 ZZ、漂浮的黑色高光 Jimmy 手写字标、黄色和灰色立体角色、黄色巨臂大力士、蓝色凹刻 ZZ 挂件、笑脸键帽、始终朝向镜头的滑板人物和黄绿色像素漩涡、五个立牌、游戏手柄的物理互动场景。点击加速旋转，左右移动鼠标控制中央元素朝向；滚动页面使场景旋转缩小，空格或回车加速。点击绿色漩涡或按 V 触发吸入与喷出彩蛋，Esc 取消。" aria-describedby="chrome-interaction-hint" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", touchAction: "pan-y", cursor: "pointer" }} />
    <button ref={vortexTarget} type="button" aria-label="点击绿色漩涡，触发吸入彩蛋" data-hover-label="click to enter" style={{ display: "none", position: "absolute", zIndex: 2, left: 0, top: 0, padding: 0, border: 0, borderRadius: "50%", background: "transparent", cursor: "pointer", touchAction: "none", transformOrigin: "center" }} />
    {failed && <p role="status" style={{ position: "absolute", top: "72%", left: 0, right: 0, textAlign: "center", fontSize: 12, color: "#aaa" }}>三维场景加载失败，请刷新重试。</p>}
  </>;
}
