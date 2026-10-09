import { Vector3 } from "three";

export const flowModes = ["flow-rings", "flow-wave", "flow-twist", "flow-helix"] as const;
export type FlowMode = typeof flowModes[number];
export function isFlowMode(mode: string): mode is FlowMode {
  return (flowModes as readonly string[]).includes(mode);
}

// Closed currents, not object timelines: a body joins at its nearest point and
// can be displaced by a collision. Nothing assigns it a phase or orientation.
export function sampleFlow(mode: FlowMode, u: number, lane: number, time: number, width: number, height: number, out: Vector3) {
  const band = lane - 1;
  const c = Math.cos(u), s = Math.sin(u);
  const breath = Math.sin(time * .19) * .07;
  if (mode === "flow-rings") {
    const yaw = Math.sin(time * .16) * .55;
    const x = band * width * .19 + c * width * .15;
    const z = c * height * .20;
    out.set(x * Math.cos(yaw) + z * Math.sin(yaw), s * height * (.34 + band * .025),
      -x * Math.sin(yaw) + z * Math.cos(yaw));
  } else if (mode === "flow-wave") {
    out.set(c * width * .37,
      (band * .19 + Math.sin(u * 2 + time * .35 + band * .6) * .09) * height,
      s * height * .29);
  } else if (mode === "flow-twist") {
    const twist = s * 1.05 + Math.sin(time * .22) * .65;
    const x = c * width * (.28 + band * .035);
    out.set(x * Math.cos(twist), s * height * (.34 + band * .025),
      x * Math.sin(twist) * Math.min(1, height / width) + band * height * .065);
  } else {
    // A toroidal helix returns smoothly from top to bottom, with three broad
    // coils. The staggered strands share space and can exchange momentum.
    const turn = u * 3 + band * Math.PI * 2 / 3;
    const radius = .26 + Math.cos(u) * .07 + breath;
    out.set(Math.cos(turn) * width * radius,
      s * height * .32,
      Math.sin(turn) * height * radius);
  }
  return out;
}

export function createFloatingFlow() {
  const samples = Array.from({ length: 3 }, () => Array.from({ length: 97 }, () => new Vector3()));
  const nearest = new Vector3(), tangent = new Vector3(), segment = new Vector3();
  const offset = new Vector3(), future = new Vector3(), drift = new Vector3();
  let currentMode: FlowMode = "flow-rings", currentTime = 0, currentWidth = 6, currentHeight = 3;
  return {
    update(mode: FlowMode, time: number, width: number, height: number) {
      currentMode = mode; currentTime = time; currentWidth = width; currentHeight = height;
      for (let lane = 0; lane < 3; lane++) {
        for (let i = 0; i <= 96; i++) sampleFlow(mode, i / 96 * Math.PI * 2, lane, time, width, height, samples[lane][i]);
      }
    },
    acceleration(position: { x: number; y: number; z: number }, velocity: { x: number; y: number; z: number }, lane: number, speed: number, out: Vector3) {
      let best = Infinity, phase = 0;
      const points = samples[lane];
      for (let i = 0; i < 96; i++) {
        segment.subVectors(points[i + 1], points[i]);
        offset.set(position.x - points[i].x, position.y - points[i].y, position.z - points[i].z);
        const fraction = Math.max(0, Math.min(1, offset.dot(segment) / Math.max(1e-8, segment.lengthSq())));
        offset.addScaledVector(segment, -fraction);
        const distance = offset.lengthSq();
        if (distance < best) {
          best = distance;
          nearest.copy(points[i]).addScaledVector(segment, fraction);
          tangent.copy(segment).normalize();
          phase = (i + fraction) / 96 * Math.PI * 2;
        }
      }
      sampleFlow(currentMode, phase, lane, currentTime + .02, currentWidth, currentHeight, future);
      sampleFlow(currentMode, phase, lane, currentTime, currentWidth, currentHeight, drift);
      drift.subVectors(future, drift).multiplyScalar(50);
      const vx = velocity.x - drift.x, vy = velocity.y - drift.y, vz = velocity.z - drift.z;
      const along = vx * tangent.x + vy * tangent.y + vz * tangent.z;
      // Gentle cross-current spring plus tangent propulsion; acceleration is
      // capped so a collision retains its impulse instead of snapping back.
      out.set((nearest.x - position.x) * 1.4 - (vx - tangent.x * along) * .85,
        (nearest.y - position.y) * 1.4 - (vy - tangent.y * along) * .85,
        (nearest.z - position.z) * 1.4 - (vz - tangent.z * along) * .85);
      out.addScaledVector(tangent, (speed - along) * 1.1);
      return out.clampLength(0, 2.2);
    },
  };
}
