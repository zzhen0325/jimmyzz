/** Geometry shared by project covers and the full-viewport route reveal.
 * Screen blending makes the black center neutral and the white exterior opaque.
 */
export function projectRevealFrame(width: number, height: number, revealed: boolean) {
  const edge = Math.max(width, height);
  const diameter = revealed ? 21.7865 * Math.hypot(width, height) + 43.573 : 2 * edge;
  return {
    backgroundSize: `${diameter}px ${diameter}px`,
    backgroundPosition: `50% ${revealed ? (height - diameter) / 2 : height - .8 * edge}px`,
  };
}

export const projectRevealTiming = { start: .08, duration: 1.7 };

/** Progress where the blue band of the expanding gradient reaches a point. */
export function projectRevealArrival(x: number, y: number, width: number, height: number) {
  const edge = Math.max(width, height);
  const finalRadius = (21.7865 * Math.hypot(width, height) + 43.573) / 2;
  let low = 0;
  let high = 1;
  for (let i = 0; i < 16; i++) {
    const progress = (low + high) / 2;
    const centerY = height + .2 * edge + (height / 2 - height - .2 * edge) * progress;
    const radius = edge + (finalRadius - edge) * progress;
    if (Math.hypot(x - width / 2, y - centerY) > radius * .0892) low = progress;
    else high = progress;
  }
  return high;
}
