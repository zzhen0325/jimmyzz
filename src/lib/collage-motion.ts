// Authored poses in fitted-image space: offset X/Y, width/height multiplier.
// Pose zero preserves the entrance composition. Each panel moves once per beat.
const poses = [
  [[0, 0, 1, 1], [0, 0, 1, 1], [0, 0, 1, 1], [0, 0, 1, 1], [0, 0, 1, 1]],
  [[0.04, -0.15, 0.85, 1.5], [0.03, 0.12, 1.45, 0.8], [0, 0, 1.1, 1.1], [0.10, 0.14, 0.85, 1.3], [-0.06, 0.04, 1.3, 0.85]],
  [[0.10, -0.02, 1.5, 0.8], [-0.09, -0.20, 0.9, 1.35], [0.02, 0.03, 0.9, 1.25], [0.05, 0.30, 1.15, 1.05], [-0.02, 0.06, 0.8, 1.4]],
  [[-0.02, -0.10, 1.1, 1.25], [0.15, 0.14, 0.85, 0.9], [-0.02, -0.02, 1.15, 0.9], [-0.10, -0.08, 1.4, 0.85], [0.01, 0.18, 1.05, 1.2]],
] as const;

export const collageMotionCycle = 16;
const beat = collageMotionCycle / poses.length;
const delays = [0.08, 0.32, 0, 0.22, 0.45];

export function sampleCollageMotion(seconds: number, panel: number) {
  const time = Math.max(0, seconds) % collageMotionCycle;
  const stage = Math.floor(time / beat);
  const from = poses[stage][panel];
  const to = poses[(stage + 1) % poses.length][panel];
  // Hold for 1.5 seconds, then ease into the next composition with stagger.
  const progress = Math.max(0, Math.min(1, (time % beat - 1.5 - delays[panel]) / 1.65));
  const eased = progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
  return from.map((value, i) => value + (to[i] - value) * eased);
}
