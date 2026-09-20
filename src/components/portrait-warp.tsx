"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type PointerEvent, type KeyboardEvent } from "react";
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

export function PortraitWarp() {
  const [points, setPoints] = useState(initial);
  const [loaded, setLoaded] = useState(false);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const moving = useRef<{ id: number; x: number; y: number; origin: Point } | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const area = useRef<HTMLDivElement>(null);
  const picture = useRef<HTMLImageElement | null>(null);
  const dragging = useRef<{ index: number; id: number; x: number; y: number; point: Point } | null>(null);
  useEffect(() => {
    const img = new window.Image();
    img.onload = () => { picture.current = img; setLoaded(true); };
    img.src = "/assets/images/zz-portrait-default.png";
    return () => { img.onload = null; };
  }, []);
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d"), img = picture.current;
    if (!ctx || !img || !loaded) return;
    ctx.clearRect(0, 0, 600, 600);
    // Affine texture mapping over a fine mesh deforms the image itself, not just its border.
    const triangle = (src: Point[], dst: Point[]) => {
      const [a,b,c] = src, [d,e,f] = dst;
      const det = (b.x-a.x)*(c.y-a.y)-(c.x-a.x)*(b.y-a.y);
      const xx = ((e.x-d.x)*(c.y-a.y)-(f.x-d.x)*(b.y-a.y))/det;
      const xy = ((f.x-d.x)*(b.x-a.x)-(e.x-d.x)*(c.x-a.x))/det;
      const yx = ((e.y-d.y)*(c.y-a.y)-(f.y-d.y)*(b.y-a.y))/det;
      const yy = ((f.y-d.y)*(b.x-a.x)-(e.y-d.y)*(c.x-a.x))/det;
      ctx.save(); ctx.beginPath(); ctx.moveTo(d.x,d.y); ctx.lineTo(e.x,e.y); ctx.lineTo(f.x,f.y); ctx.closePath(); ctx.clip();
      ctx.transform(xx,yx,xy,yy,d.x-xx*a.x-xy*a.y,d.y-yx*a.x-yy*a.y);
      ctx.drawImage(img,0,0,600,600); ctx.restore();
    };
    const n = 24;
    for (let y=0;y<n;y++) for(let x=0;x<n;x++) {
      const uv = [{x:x/n,y:y/n},{x:(x+1)/n,y:y/n},{x:(x+1)/n,y:(y+1)/n},{x:x/n,y:(y+1)/n}];
      const dst = uv.map(p=>surface(points,p.x,p.y));
      const src = uv.map(p=>({x:p.x*600,y:p.y*600}));
      triangle([src[0],src[1],src[2]],[dst[0],dst[1],dst[2]]);
      triangle([src[0],src[2],src[3]],[dst[0],dst[2],dst[3]]);
    }
  }, [points, loaded]);
  const move = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragging.current, rect = area.current?.getBoundingClientRect();
    if (!drag || drag.id !== event.pointerId || !rect) return;
    const next = { x: clamp(drag.point.x+(event.clientX-drag.x)/rect.width), y: clamp(drag.point.y+(event.clientY-drag.y)/rect.height) };
    setPoints(p=>p.map((point,i)=>i===drag.index?next:point));
  };
  const keyboard = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const delta = event.shiftKey ? .04 : .01;
    const offsets: Record<string, Point> = { ArrowLeft:{x:-delta,y:0}, ArrowRight:{x:delta,y:0}, ArrowUp:{x:0,y:-delta}, ArrowDown:{x:0,y:delta} };
    const offset = offsets[event.key];
    if (!offset) return;
    event.preventDefault();
    setPoints(p=>p.map((point,i)=>i===index?{x:clamp(point.x+offset.x),y:clamp(point.y+offset.y)}:point));
  };
  const boundary = Array.from({ length: 64 }, (_, i) => {
    const side = Math.floor(i / 16), t = (i % 16) / 16;
    const uv = side === 0 ? [t, 0] : side === 1 ? [1, t] : side === 2 ? [1-t, 1] : [0, 1-t];
    const p = surface(points, uv[0], uv[1]);
    return `${p.x / 6},${p.y / 6}`;
  }).join(" ");
  return <figure className={styles.portrait}>
    <div ref={area} className={styles.area} style={{ transform: `translate(calc(-7.7747% + ${offset.x}px), calc(-8.7347% + ${offset.y}px))` }} data-lenis-prevent>
      <svg className={styles.background} viewBox="0 0 100 100" aria-hidden="true"><polygon points={boundary} /></svg>
      <canvas ref={canvas} width={600} height={600} role="img" tabIndex={0} aria-label="可拖动的 ZZ 头像，拖动移动位置，方向键微调"
        onPointerDown={e=>{ e.preventDefault(); e.currentTarget.focus({preventScroll:true}); e.currentTarget.setPointerCapture(e.pointerId); moving.current={id:e.pointerId,x:e.clientX,y:e.clientY,origin:offset}; }}
        onPointerMove={e=>{ const drag=moving.current; if (drag && drag.id===e.pointerId) setOffset({x:drag.origin.x+e.clientX-drag.x,y:drag.origin.y+e.clientY-drag.y}); }}
        onPointerUp={()=>{moving.current=null;}} onPointerCancel={()=>{moving.current=null;}} onLostPointerCapture={()=>{moving.current=null;}}
        onKeyDown={e=>{ const step=e.shiftKey?20:5; const delta: Record<string, Point>={ArrowLeft:{x:-step,y:0},ArrowRight:{x:step,y:0},ArrowUp:{x:0,y:-step},ArrowDown:{x:0,y:step}}; if(delta[e.key]) {e.preventDefault(); const d=delta[e.key]; setOffset(p=>({x:p.x+d.x,y:p.y+d.y}));} }} />
      {!loaded && <Image className={styles.fallback} src="/assets/images/zz-portrait-default.png" alt="ZZ 头像" width={502} height={513} unoptimized />}
      <svg className={styles.outline} viewBox="0 0 100 100" aria-hidden="true"><polygon points={boundary} /></svg>
      {points.map((point,index)=><button key={index} type="button" className={styles.handle} style={{left:`${point.x*100}%`,top:`${point.y*100}%`}} aria-label={`${names[index]}变形点，使用方向键移动`} onKeyDown={e=>keyboard(e,index)}
        onPointerDown={e=>{ e.preventDefault(); e.currentTarget.focus({preventScroll:true}); e.currentTarget.setPointerCapture(e.pointerId); dragging.current={index,id:e.pointerId,x:e.clientX,y:e.clientY,point}; }} onPointerMove={move}
        onPointerUp={()=>{dragging.current=null;}} onPointerCancel={()=>{dragging.current=null;}} onLostPointerCapture={()=>{dragging.current=null;}} />)}
    </div>
    {/* <figcaption className={styles.caption}><span>拖动头像移动 · 拖动控制点变形</span><button type="button" onClick={()=>{setPoints(initial);setOffset({x:0,y:0});}}>还原</button></figcaption> */}
  </figure>;
}
