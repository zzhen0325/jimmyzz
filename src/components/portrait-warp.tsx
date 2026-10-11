"use client";

import { useEffect, useId, useRef, useState, type PointerEvent, type KeyboardEvent } from "react";
import Image from "next/image";
import styles from "./portrait-warp.module.css";

type Point = { x: number; y: number };
const portraitProps = [
  { name: "coffee", u: .06, v: .76, width: .225 },
  { name: "laptop", u: .81, v: .74, width: .40 },
] as const;
// Default control points matched to the supplied pinched-in portrait reference.
const initial: Point[] = [
  { x: .14, y: .22 }, { x: .468, y: .312 }, { x: .80, y: .15 },
  { x: .613, y: .513 }, { x: .87, y: .79 }, { x: .505, y: .697 },
  { x: .134, y: .80 }, { x: .310, y: .521 },
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
const DEFORMATION_STRENGTH = 1.35;
// Allow local mesh compression; only stop a crossed or inverted outer contour.
function isValidBoundary(points: Point[]): boolean {
  const boundary = Array.from({ length: 64 }, (_, index) => {
    const side = Math.floor(index / 16), t = (index % 16) / 16;
    return side === 0 ? edge(points[0], points[1], points[2], t)
      : side === 1 ? edge(points[2], points[3], points[4], t)
      : side === 2 ? edge(points[4], points[5], points[6], t)
      : edge(points[6], points[7], points[0], t);
  });
  const cross = (a: Point, b: Point, c: Point) =>
    (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  let area = 0;
  for (let i = 0; i < boundary.length; i++) {
    const a = boundary[i], b = boundary[(i + 1) % boundary.length];
    area += a.x * b.y - b.x * a.y;
    for (let j = i + 2; j < boundary.length; j++) {
      if (i === 0 && j === boundary.length - 1) continue;
      const c = boundary[j], d = boundary[(j + 1) % boundary.length];
      if (cross(a, b, c) * cross(a, b, d) <= 0
        && cross(c, d, a) * cross(c, d, b) <= 0
        && Math.max(a.x, b.x) >= Math.min(c.x, d.x)
        && Math.max(c.x, d.x) >= Math.min(a.x, b.x)
        && Math.max(a.y, b.y) >= Math.min(c.y, d.y)
        && Math.max(c.y, d.y) >= Math.min(a.y, b.y)) return false;
    }
  }
  return area > .01;
}
function moveControlPoint(points: Point[], index: number, dx: number, dy: number): Point[] {
  const origin = points[index];
  const target = {
    x: clamp(origin.x + dx * DEFORMATION_STRENGTH),
    y: clamp(origin.y + dy * DEFORMATION_STRENGTH),
  };
  const candidate = (amount: number) => points.map((point, i) => i === index
    ? { x: origin.x + (target.x - origin.x) * amount, y: origin.y + (target.y - origin.y) * amount }
    : point);
  const next = candidate(1);
  if (isValidBoundary(next)) return next;
  let low = 0, high = 1;
  for (let step = 0; step < 12; step++) {
    const middle = (low + high) / 2;
    if (isValidBoundary(candidate(middle))) low = middle;
    else high = middle;
  }
  return low > 0 ? candidate(low) : points;
}

const PLAYBACK_FPS = 24;
const PORTRAIT_ASSETS = "/assets/images/portrait-video-20261011-232951";
const SMILE_FRAME = 54; // Source frame 92: settled smile after trimming holds.
const SHAKE_START = 0;
const SHAKE_END = 44; // Source frame 72: return to front after the final head turn.

export function PortraitWarp() {
  const labelPathId = useId();
  const [points, setPoints] = useState(initial);
  const geometry = useRef(points);
  const lastDeformation = useRef(-Infinity);
  const [requestedOffset, setRequestedOffset] = useState<Point>({ x: 0, y: 0 });
  const moving = useRef<{ id: number; x: number; y: number; origin: Point } | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const area = useRef<HTMLDivElement>(null);
  const figure = useRef<HTMLElement>(null);
  const [bounds, setBounds] = useState({ width: 600, height: 450, size: 450, left: 75, top: 0 });
  const props = portraitProps.map(prop => ({ ...prop, anchor: surface(points, prop.u, prop.v) }));
  // Include the curved edges as well as their handles when limiting movement.
  const extent = [...points, ...props.flatMap(({ anchor, width }) => [
    { x: anchor.x / 600 - width / 2, y: anchor.y / 600 - width / 2 },
    { x: anchor.x / 600 + width / 2, y: anchor.y / 600 + width / 2 },
  ]), ...Array.from({ length: 128 }, (_, index) => {
    const side = Math.floor(index / 32), t = (index % 32) / 32;
    const uv = side === 0 ? [t, 0] : side === 1 ? [1, t] : side === 2 ? [1 - t, 1] : [0, 1 - t];
    const point = surface(points, uv[0], uv[1]);
    return { x: point.x / 600, y: point.y / 600 };
  })];
  const limitOffset = (next: Point): Point => {
    const minX = 8 - bounds.left - Math.min(...extent.map(p => p.x)) * bounds.size;
    const maxX = bounds.width - 8 - bounds.left - Math.max(...extent.map(p => p.x)) * bounds.size;
    const minY = 8 - bounds.top - Math.min(...extent.map(p => p.y)) * bounds.size;
    const maxY = bounds.height - 8 - bounds.top - Math.max(...extent.map(p => p.y)) * bounds.size;
    return { x: Math.max(minX, Math.min(maxX, next.x)), y: Math.max(minY, Math.min(maxY, next.y)) };
  };
  const offset = limitOffset(requestedOffset);
  const setOffset = (next: Point) => setRequestedOffset(limitOffset(next));
  useEffect(() => {
    const container = figure.current, surface = area.current;
    if (!container || !surface) return;
    const measure = () => setBounds({ width: container.clientWidth, height: container.clientHeight,
      size: surface.clientWidth, left: surface.offsetLeft, top: surface.offsetTop });
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(surface);
    measure();
    return () => observer.disconnect();
  }, []);
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
    poster.decoding = "async";
    // Trimmed source video sampled at its native 24 fps.
    // A single frame is rendered at full opacity, including every transition.
    const sheets = Array.from({ length: 2 }, () => {
      const image = new window.Image();
      image.decoding = "async";
      return image;
    });
    // Warm the small poster near the viewport; keep the large sprite sheets
    // out of the hero's loading path until the portrait is actually visible.
    const preload = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      poster.src = `${PORTRAIT_ASSETS}/poster.webp`;
      preload.disconnect();
    }, { rootMargin: "300px" });
    preload.observe(output);
    let visible = false;
    let sheetsRequested = false;
    let frame = 0;
    let lastDraw = -Infinity;
    let renderedFrame = -2;
    let renderedPoints: Point[] | null = null;
    let meshPoints: Point[] | null = null;
    let triangles: (() => void)[] = [];
    let position = SMILE_FRAME;
    let direction = 1;
    let state: "smile" | "struggle" | "returning" = "smile";
    let velocity = 0;
    let consumedDeformation = -Infinity;
    const shakeStart = SHAKE_START, shakeEnd = SHAKE_END;
    const syncPlayback = () => {
      lastDraw = -Infinity;
      if (visible && !document.hidden) {
        if (!sheetsRequested) {
          sheetsRequested = true;
          sheets.forEach((image, index) => {
            image.src = `${PORTRAIT_ASSETS}/sheet-${String(index + 1).padStart(2, "0")}.webp`;
          });
        }
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
      const active = now - lastDeformation.current < 220;
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
          // Ease into forward playback and settle on the final smile after release.
          state = "returning";
          direction = 1;
        }
        const shaking = state === "struggle";
        const entering = position < shakeStart || position > shakeEnd;
        const distanceToTurn = direction > 0 ? shakeEnd - position : position - shakeStart;
        // Brake before a turn, then accelerate out of it instead of reversing at full speed.
        const turnEase = Math.min(1, Math.max(0, distanceToTurn) / 10);
        const targetSpeed = state === "returning"
          ? .45 + .8 * Math.min(1, Math.max(0, SMILE_FRAME-position) / 12)
          : shaking ? (entering ? 1.5 : .35 + .65 * turnEase) : 0;
        const targetVelocity = direction * targetSpeed;
        velocity += (targetVelocity - velocity) * (1 - Math.exp(-dt / .08));
        if (state !== "smile") position += dt * PLAYBACK_FPS * velocity;
        if (shaking) {
          const reachedEnd = direction > 0 && position >= shakeEnd;
          const reachedStart = direction < 0 && position <= shakeStart;
          if (reachedEnd || reachedStart) {
            position = reachedEnd ? shakeEnd : shakeStart;
            velocity = 0;
            direction = reachedEnd ? -1 : 1;
          }
        } else if (state === "returning") {
          if (position >= SMILE_FRAME) {
            position = SMILE_FRAME;
            velocity = 0;
            direction = -1;
            state = "smile";
          }
        }
        const index = Math.max(0, Math.min(SMILE_FRAME, Math.round(position)));
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
          const sheet = sheets[Math.floor(frameIndex / 32)];
          const tileWidth = sheet.naturalWidth / 8, tileHeight = sheet.naturalHeight / 4;
          source.drawImage(sheet, (tile % 8) * tileWidth, Math.floor(tile / 8) * tileHeight, tileWidth, tileHeight, 0, 0, 600, 600);
          output.dataset.frame = String(frameIndex);
        } else {
          source.drawImage(poster, 0, 0, 600, 600);
        }
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
      preload.disconnect();
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
    setPoints(p=>moveControlPoint(p, drag.index, dx, dy));
  };
  const keyboard = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const delta = event.shiftKey ? .04 : .01;
    const offsets: Record<string, Point> = { ArrowLeft:{x:-delta,y:0}, ArrowRight:{x:delta,y:0}, ArrowUp:{x:0,y:-delta}, ArrowDown:{x:0,y:delta} };
    const offset = offsets[event.key];
    if (!offset) return;
    event.preventDefault();
    deform(event.timeStamp);
    setPoints(p=>moveControlPoint(p, index, offset.x, offset.y));
  };
  const boundary = Array.from({ length: 64 }, (_, i) => {
    const side = Math.floor(i / 16), t = (i % 16) / 16;
    const uv = side === 0 ? [t, 0] : side === 1 ? [1, t] : side === 2 ? [1-t, 1] : [0, 1-t];
    const p = surface(points, uv[0], uv[1]);
    return `${p.x / 6},${p.y / 6}`;
  }).join(" ");
  // Follow the top edge outward, starting beside the upper-left control point.
  const labelPath = Array.from({ length: 65 }, (_, i) => {
    const t = i / 64;
    const point = edge(points[0], points[1], points[2], t);
    const before = edge(points[0], points[1], points[2], Math.max(0, t - .001));
    const after = edge(points[0], points[1], points[2], Math.min(1, t + .001));
    const dx = after.x - before.x, dy = after.y - before.y;
    const length = Math.hypot(dx, dy);
    const nx = length > .000001 ? dy / length : 0;
    const ny = length > .000001 ? -dx / length : -1;
    const labelGap = 1000 / bounds.size; // Keep the baseline 10 CSS pixels from the edge.
    return `${i === 0 ? "M" : "L"}${point.x * 100 + nx * labelGap},${point.y * 100 + ny * labelGap}`;
  }).join(" ");
  return <figure ref={figure} className={styles.portrait}>
    <svg className={styles.guides} viewBox={`0 0 ${bounds.width} ${bounds.height}`} aria-hidden="true">
      {points.map((point, index) => {
        const x = bounds.left + point.x * bounds.size + offset.x;
        const y = bounds.top + point.y * bounds.size + offset.y;
        const top = index <= 2, bottom = index >= 4 && index <= 6;
        const left = index === 0 || index === 6 || index === 7;
        const right = index >= 2 && index <= 4;
        return <g key={index}>
          {(top || bottom) && <>
            <line x1={x} y1={y} x2={x} y2={top ? 0 : bounds.height} />
            <text x={Math.max(4, Math.min(bounds.width - 42, x + 5))} y={top ? 12 : bounds.height - 5}>X {Math.round(x)}</text>
          </>}
          {(left || right) && <>
            <line x1={x} y1={y} x2={left ? 0 : bounds.width} y2={y} />
            <text x={left ? 4 : bounds.width - 4} y={Math.max(12, Math.min(bounds.height - 5, y - 5))} textAnchor={left ? "start" : "end"}>Y {Math.round(y)}</text>
          </>}
        </g>;
      })}
    </svg>
    <div ref={area} className={styles.area} style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }} data-native-cursor>
      <svg className={styles.background} viewBox="0 0 100 100" aria-hidden="true"><polygon points={boundary} /></svg>
      <canvas ref={canvas} width={600} height={600} role="img" tabIndex={0} aria-label="可拖动的 ZZ 头像，拖动移动位置，方向键微调"
        onPointerDown={e=>{ e.preventDefault(); e.currentTarget.focus({preventScroll:true}); e.currentTarget.setPointerCapture(e.pointerId); moving.current={id:e.pointerId,x:e.clientX,y:e.clientY,origin:offset}; }}
        onPointerMove={e=>{ const drag=moving.current; if (drag && drag.id===e.pointerId) { const next={x:drag.origin.x+e.clientX-drag.x,y:drag.origin.y+e.clientY-drag.y}; if(next.x!==offset.x || next.y!==offset.y) deform(e.timeStamp); setOffset(next); } }}
        onPointerUp={()=>{moving.current=null;}} onPointerCancel={()=>{moving.current=null;}} onLostPointerCapture={()=>{moving.current=null;}}
        onKeyDown={e=>{ const step=e.shiftKey?20:5; const delta: Record<string, Point>={ArrowLeft:{x:-step,y:0},ArrowRight:{x:step,y:0},ArrowUp:{x:0,y:-step},ArrowDown:{x:0,y:step}}; if(delta[e.key]) {e.preventDefault(); deform(e.timeStamp); const d=delta[e.key]; setOffset({x:offset.x+d.x,y:offset.y+d.y});} }} />
      {props.map(({ name, anchor, width }) => <Image key={name}
        className={styles.prop} src={`/assets/images/portrait-props/${name === "laptop" ? "laptop" : "coffee-held"}.png`}
        alt="" aria-hidden="true" width={1280} height={1280} unoptimized draggable={false}
        style={{ left: `${anchor.x / 6}%`, top: `${anchor.y / 6}%`, width: `${width * 100}%` }} />)}
      <svg className={styles.outline} viewBox="0 0 100 100" aria-hidden="true"><polygon points={boundary} /></svg>
      <svg className={styles.dragLabel} viewBox="0 0 100 100" aria-hidden="true">
        <defs><path id={labelPathId} d={labelPath} /></defs>
        <text style={{ fontSize: `${1400 / bounds.size}px` }}><textPath href={`#${labelPathId}`} startOffset="0%" textAnchor="start">Drag me</textPath></text>
      </svg>
      {points.map((point,index)=><button key={index} type="button" className={styles.handle} style={{left:`${point.x*100}%`,top:`${point.y*100}%`}} aria-label={`${names[index]}变形点，使用方向键移动`} onKeyDown={e=>keyboard(e,index)}
        onPointerDown={e=>{ e.preventDefault(); e.currentTarget.focus({preventScroll:true}); e.currentTarget.setPointerCapture(e.pointerId); dragging.current={index,id:e.pointerId,x:e.clientX,y:e.clientY,point}; }} onPointerMove={move}
        onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release} />)}
    </div>
    {/* <figcaption className={styles.caption}><span>拖动头像移动 · 拖动控制点变形</span><button type="button" onClick={()=>{setPoints(initial);setOffset({x:0,y:0});}}>还原</button></figcaption> */}
  </figure>;
}
