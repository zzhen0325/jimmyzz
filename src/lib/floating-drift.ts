import { Vector3 } from "three";

const seed = (index: number, salt: number) => {
  const value = Math.sin((index + 1) * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
};

// UNLIRICE-inspired diagonal crossings: independent travel and tumble periods.
// Both ends are beyond the viewport so recycling never crosses the visible scene.
export function sampleFloatingDrift(index: number, time: number, width: number, height: number, out: Vector3) {
  const duration = 16 + seed(index, 1) * 14;
  const cycle = time / duration + seed(index, 2);
  const progress = cycle - Math.floor(cycle);
  const margin = 1.2;
  const lane = (seed(index, 3) - .5) * .65;
  const x = (progress - .5) * (width + margin * 2);
  const y = (progress - .5) * (height + margin * 2);
  out.set(x + (index % 3 === 0 ? lane * width : 0),
    y + (index % 3 === 0 ? 0 : lane * height),
    (seed(index, 4) - .5) * Math.min(width, height) * .55);
  return Math.floor(cycle);
}

export function driftRotation(index: number, time: number) {
  return (seed(index, 5) * Math.PI * 2 + time * Math.PI * 2 / (12 + seed(index, 6) * 28))
    * (index % 2 ? 1 : -1);
}
