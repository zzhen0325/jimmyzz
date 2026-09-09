// One mapping for the native video, WebGL treatment and Canvas2D effect windows.
export function heroVideoRect(width: number, height: number, sourceWidth: number, sourceHeight: number, progress: number) {
  const cover = Math.max(width / sourceWidth, height / sourceHeight);
  const contain = Math.min(width / sourceWidth, height / sourceHeight);
  const scale = cover + (contain - cover) * progress;
  const w = sourceWidth * scale;
  const h = sourceHeight * scale;
  return { x: (width - w) / 2, y: (height - h) / 2 * progress, w, h, scale };
}
