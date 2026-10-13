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
