"use client";

import { useEffect, useRef, useState } from "react";
import { createChromeWorld } from "@/lib/chrome-world";

export default function ChromeScene({ paused, replayToken }: { paused: boolean; replayToken: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const controller = useRef<ReturnType<typeof createChromeWorld> | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!canvas.current) return;
    let mounted = true;
    const fail = () => { if (mounted) queueMicrotask(() => { if (mounted) setFailed(true); }); };
    try {
      controller.current = createChromeWorld(canvas.current, { debug: process.env.NODE_ENV !== "production", onError: fail });
    } catch { fail(); }
    return () => { mounted = false; controller.current?.dispose(); controller.current = null; };
  }, []);
  useEffect(() => { controller.current?.setPaused(paused); }, [paused]);
  useEffect(() => { if (replayToken) controller.current?.replay(); }, [replayToken]);
  return <>
    <canvas ref={canvas} tabIndex={0} role="img" aria-label="银色 ZZ、五个立牌、游戏手柄与几何物件的物理互动场景。按住拖动，松开弹散；方向键环绕，空格弹散。" aria-describedby="chrome-interaction-hint" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", touchAction: "none", cursor: "grab" }} />
    {failed && <p role="status" style={{ position: "absolute", top: "72%", left: 0, right: 0, textAlign: "center", fontSize: 12, color: "#aaa" }}>三维场景加载失败，请刷新重试。</p>}
  </>;
}
