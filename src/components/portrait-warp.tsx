"use client";

import { useEffect, useId, useRef, useState, type PointerEvent, type KeyboardEvent } from "react";
import styles from "./portrait-warp.module.css";

type Point = { x: number; y: number };
// Saved from the user's adjusted portrait; reset returns to this shape.
const initial: Point[] = [
  { x: .173492, y: .19421 }, { x: .503686, y: .035 }, { x: .82, y: .18 },
  { x: .644707, y: .530211 }, { x: .82, y: .82 }, { x: .519736, y: .965 },
  { x: .18, y: .82 }, { x: .388421, y: .516413 },
];
const names = ["左上", "上中", "右上", "右中", "右下", "下中", "左下", "左中"];
const clamp = (n: number) => Math.max(.035, Math.min(.965, n));
// Quadratic edges pass through each corner and edge midpoint.
function edge(a: Point, m: Point, b: Point, t: number): Point {
  const k = 1 - t;
  return { x: k * k * a.x + 2 * k * t * (2 * m.x - (a.x + b.x) / 2) + t * t * b.x,
    y: k * k * a.y + 2 * k * t * (2 * m.y - (a.y + b.y) / 2) + t * t * b.y };
}
function surface(p: Point[], u: number, v: number): Point {
  const top = edge(p[0], p[1], p[2], u), bottom = edge(p[6], p[5], p[4], u);
  const left = edge(p[0], p[7], p[6], v), right = edge(p[2], p[3], p[4], v);
  const coord = (axis: "x" | "y") => (1-v)*top[axis]+v*bottom[axis]+(1-u)*left[axis]+u*right[axis]
    - ((1-u)*(1-v)*p[0][axis]+u*(1-v)*p[2][axis]+u*v*p[4][axis]+(1-u)*v*p[6][axis]);
  return { x: coord("x") * 600, y: coord("y") * 600 };
}

const MESH_SEGMENTS = 24;

export function PortraitWarp() {
  const labelPathId = useId();
  const [points, setPoints] = useState(initial);
  const geometry = useRef(points);
  const lastDeformation = useRef(-Infinity);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const moving = useRef<{ id: number; x: number; y: number; origin: Point } | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const area = useRef<HTMLDivElement>(null);
  useEffect(() => { geometry.current = points; }, [points]);
  const dragging = useRef<{ index: number; id: number; x: number; y: number; point: Point } | null>(null);
  useEffect(() => {
    const output = canvas.current;
    const ctx = output?.getContext("2d");
    if (!ctx || !output) return;
    const texture = document.createElement("canvas");
    texture.width = texture.height = 600;
    const source = texture.getContext("2d");
    if (!source) return;
    const poster = new window.Image();
    poster.src = "/assets/images/zz-portrait-smile.jpg";
    // Original video frames, starting at 1.5s. Each sheet holds 32 frames.
    // A single frame is rendered at full opacity, including every transition.
    const sheets = Array.from({ length: 4 }, (_, index) => {
      const image = new window.Image();
      image.src = `/assets/images/portrait-frames/sheet-${String(index + 1).padStart(2, "0")}.webp`;
      return image;
    });
    let visible = false;
    let frame = 0;
    let lastDraw = -Infinity;
    let renderedFrame = -2;
    let renderedPoints: Point[] | null = null;
    let meshPoints: Point[] | null = null;
    let triangles: (() => void)[] = [];
    let position = 0;
    let direction = 1;
    let state: "smile" | "struggle" | "returning" = "smile";
    let idleStart = 0;
    let idleEnd = 24;
    let returnTo = 24;
    let speed = 1;
    let consumedDeformation = -Infinity;
    const shakeStart = 72, shakeEnd = 84;
    const syncPlayback = () => {
      lastDraw = -Infinity;
      if (visible && !document.hidden) {
        if (!frame) frame = requestAnimationFrame(draw);
      } else {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      syncPlayback();
    });
    observer.observe(output);
    document.addEventListener("visibilitychange", syncPlayback);
    // Affine texture mapping over a fine mesh deforms the image itself, not just its border.
    const prepareTriangle = (src: Point[], dst: Point[]) => {
      const [a,b,c] = src, [d,e,f] = dst;
      const det = (b.x-a.x)*(c.y-a.y)-(c.x-a.x)*(b.y-a.y);
      const xx = ((e.x-d.x)*(c.y-a.y)-(f.x-d.x)*(b.y-a.y))/det;
      const xy = ((f.x-d.x)*(b.x-a.x)-(e.x-d.x)*(c.x-a.x))/det;
      const yx = ((e.y-d.y)*(c.y-a.y)-(f.y-d.y)*(b.y-a.y))/det;
      const yy = ((f.y-d.y)*(b.x-a.x)-(e.y-d.y)*(c.x-a.x))/det;
      const tx = d.x-xx*a.x-xy*a.y, ty = d.y-yx*a.x-yy*a.y;
      return () => {
        ctx.save(); ctx.beginPath(); ctx.moveTo(d.x,d.y); ctx.lineTo(e.x,e.y); ctx.lineTo(f.x,f.y); ctx.closePath(); ctx.clip();
        ctx.transform(xx,yx,xy,yy,tx,ty);
        ctx.drawImage(texture,0,0,600,600); ctx.restore();
      };
    };
    const draw = (now: number) => {
      frame = 0;
      if (!visible || document.hidden) return;
      frame = requestAnimationFrame(draw);
      const dt = Number.isFinite(lastDraw) ? Math.min((now - lastDraw) / 1000, .08) : 0;
      lastDraw = now;
      const active = now - lastDeformation.current < 160;
      let frameIndex = -1;
      const ready = sheets.every(image => image.complete && image.naturalWidth > 0);
      if (ready) {
        // Keep brief drags queued until a rendered frame consumes them.
        const newDeformation = lastDeformation.current !== consumedDeformation;
        consumedDeformation = lastDeformation.current;
        if ((active || newDeformation) && state !== "struggle") {
          state = "struggle";
          direction = position < shakeStart ? 1 : position > shakeEnd ? -1 : direction;
        } else if (!active && !newDeformation && state === "struggle") {
          // Release plays the remaining action forward once; never replay it backwards.
          state = "returning";
          direction = 1;
          returnTo = 102;
        }
        const shaking = state === "struggle";
        const targetSpeed = state === "returning"
          ? 1 + 3 * Math.min(1, Math.abs(returnTo-position) / 12)
          : shaking ? (position < shakeStart || position > shakeEnd ? 4 : 2.2) : 1;
        speed += (targetSpeed - speed) * (1 - Math.exp(-dt / .09));
        position += direction * dt * 24 * speed;
        if (shaking) {
          const reachedEnd = direction > 0 && position >= shakeEnd;
          const reachedStart = direction < 0 && position <= shakeStart;
          if (reachedEnd || reachedStart) {
            position = 2 * (reachedEnd ? shakeEnd : shakeStart) - position;
            direction = reachedEnd ? -1 : 1;
          }
        } else if (state === "returning") {
          if ((direction > 0 && position >= returnTo) || (direction < 0 && position <= returnTo)) {
            position = returnTo;
            idleStart = returnTo === 24 ? 0 : 102;
            idleEnd = returnTo === 24 ? 24 : 120;
            direction = returnTo === 24 ? -1 : 1;
            state = "smile";
          }
        } else {
          if (position >= idleEnd) { position = 2 * idleEnd - position; direction = -1; }
          else if (position <= idleStart) { position = 2 * idleStart - position; direction = 1; }
        }
        const index = Math.max(0, Math.min(120, Math.round(position)));
        frameIndex = index;
      } else {
        if (!poster.complete || !poster.naturalWidth) return;
      }
      output.dataset.motion = state;
      // Follow display timing, but remap the mesh only for a new frame or shape.
      // A 24fps timer on a 60Hz display otherwise drops to uneven 20fps steps.
      if (renderedFrame === frameIndex && renderedPoints === geometry.current) return;
      // The texture changes at video cadence; the mesh only changes on deformation.
      if (renderedFrame !== frameIndex) {
        if (frameIndex >= 0) {
          const tile = frameIndex % 32;
          source.drawImage(sheets[Math.floor(frameIndex / 32)], (tile % 8) * 384, Math.floor(tile / 8) * 384, 384, 384, 0, 0, 600, 600);
          output.dataset.frame = String(frameIndex);
        } else source.drawImage(poster, 0, 0, 600, 600);
      }
      renderedFrame = frameIndex;
      renderedPoints = geometry.current;
      ctx.clearRect(0, 0, 600, 600);
      if (meshPoints !== geometry.current) {
        meshPoints = geometry.current;
        triangles = [];
        const n = MESH_SEGMENTS;
        for (let y=0;y<n;y++) for(let x=0;x<n;x++) {
          const uv = [{x:x/n,y:y/n},{x:(x+1)/n,y:y/n},{x:(x+1)/n,y:(y+1)/n},{x:x/n,y:(y+1)/n}];
          const dst = uv.map(p=>surface(meshPoints!,p.x,p.y));
          const src = uv.map(p=>({x:p.x*600,y:p.y*600}));
          triangles.push(prepareTriangle([src[0],src[1],src[2]],[dst[0],dst[1],dst[2]]));
          triangles.push(prepareTriangle([src[0],src[2],src[3]],[dst[0],dst[2],dst[3]]));
        }
      }
      for (const triangle of triangles) triangle();
    };
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", syncPlayback);
    };
  }, []);
  const deform = (time: number) => {
    lastDeformation.current = time;
  };
  const release = () => {
    dragging.current = null;
  };
  const move = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragging.current, rect = area.current?.getBoundingClientRect();
    if (!drag || drag.id !== event.pointerId || !rect) return;
    const dx = (event.clientX-drag.x)/rect.width, dy = (event.clientY-drag.y)/rect.height;
    drag.x = event.clientX;
    drag.y = event.clientY;
    if (dx !== 0 || dy !== 0) deform(event.timeStamp);
    setPoints(p=>p.map((point,i)=>i===drag.index?{x:clamp(point.x+dx),y:clamp(point.y+dy)}:point));
  };
  const keyboard = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const delta = event.shiftKey ? .04 : .01;
    const offsets: Record<string, Point> = { ArrowLeft:{x:-delta,y:0}, ArrowRight:{x:delta,y:0}, ArrowUp:{x:0,y:-delta}, ArrowDown:{x:0,y:delta} };
    const offset = offsets[event.key];
    if (!offset) return;
    event.preventDefault();
    deform(event.timeStamp);
    setPoints(p=>p.map((point,i)=>i===index?{x:clamp(point.x+offset.x),y:clamp(point.y+offset.y)}:point));
  };
  const boundary = Array.from({ length: 64 }, (_, i) => {
    const side = Math.floor(i / 16), t = (i % 16) / 16;
    const uv = side === 0 ? [t, 0] : side === 1 ? [1, t] : side === 2 ? [1-t, 1] : [0, 1-t];
    const p = surface(points, uv[0], uv[1]);
    return `${p.x / 6},${p.y / 6}`;
  }).join(" ");
  // Offset the text baseline along the bottom edge's outward normal.
  const labelPath = Array.from({ length: 65 }, (_, i) => {
    const t = i / 64;
    const point = edge(points[6], points[5], points[4], t);
    const before = edge(points[6], points[5], points[4], Math.max(0, t - .001));
    const after = edge(points[6], points[5], points[4], Math.min(1, t + .001));
    const dx = after.x - before.x, dy = after.y - before.y;
    const length = Math.hypot(dx, dy);
    const nx = length > .000001 ? -dy / length : 0;
    const ny = length > .000001 ? dx / length : 1;
    return `${i === 0 ? "M" : "L"}${point.x * 100 + nx * 7},${point.y * 100 + ny * 7}`;
  }).join(" ");
  return <figure className={styles.portrait}>
    <div ref={area} className={styles.area} style={{ transform: `translate(calc(-7.7747% + ${offset.x}px), calc(-8.7347% + ${offset.y}px))` }} data-lenis-prevent>
      <svg className={styles.background} viewBox="0 0 100 100" aria-hidden="true"><polygon points={boundary} /></svg>
      <canvas ref={canvas} width={600} height={600} role="img" tabIndex={0} aria-label="可拖动的 ZZ 头像，拖动移动位置，方向键微调"
        onPointerDown={e=>{ e.preventDefault(); e.currentTarget.focus({preventScroll:true}); e.currentTarget.setPointerCapture(e.pointerId); moving.current={id:e.pointerId,x:e.clientX,y:e.clientY,origin:offset}; }}
        onPointerMove={e=>{ const drag=moving.current; if (drag && drag.id===e.pointerId) setOffset({x:drag.origin.x+e.clientX-drag.x,y:drag.origin.y+e.clientY-drag.y}); }}
        onPointerUp={()=>{moving.current=null;}} onPointerCancel={()=>{moving.current=null;}} onLostPointerCapture={()=>{moving.current=null;}}
        onKeyDown={e=>{ const step=e.shiftKey?20:5; const delta: Record<string, Point>={ArrowLeft:{x:-step,y:0},ArrowRight:{x:step,y:0},ArrowUp:{x:0,y:-step},ArrowDown:{x:0,y:step}}; if(delta[e.key]) {e.preventDefault(); const d=delta[e.key]; setOffset(p=>({x:p.x+d.x,y:p.y+d.y}));} }} />
      <svg className={styles.outline} viewBox="0 0 100 100" aria-hidden="true"><polygon points={boundary} /></svg>
      <svg className={styles.dragLabel} viewBox="0 0 100 100" aria-hidden="true">
        <defs><path id={labelPathId} d={labelPath} /></defs>
        <text><textPath href={`#${labelPathId}`} startOffset="96%" textAnchor="end">Drag me</textPath></text>
      </svg>
      {points.map((point,index)=><button key={index} type="button" className={styles.handle} style={{left:`${point.x*100}%`,top:`${point.y*100}%`}} aria-label={`${names[index]}变形点，使用方向键移动`} onKeyDown={e=>keyboard(e,index)}
        onPointerDown={e=>{ e.preventDefault(); e.currentTarget.focus({preventScroll:true}); e.currentTarget.setPointerCapture(e.pointerId); dragging.current={index,id:e.pointerId,x:e.clientX,y:e.clientY,point}; }} onPointerMove={move}
        onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release} />)}
    </div>
    {/* <figcaption className={styles.caption}><span>拖动头像移动 · 拖动控制点变形</span><button type="button" onClick={()=>{setPoints(initial);setOffset({x:0,y:0});}}>还原</button></figcaption> */}
  </figure>;
}
