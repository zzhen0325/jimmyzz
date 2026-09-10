export const orbitPanelCount = 8;
export const orbitEntranceStagger = 0.085;
export const orbitEntranceDuration = (orbitPanelCount - 1) * orbitEntranceStagger + 0.82;
const turn = Math.PI * 2;
const easeOut = (value: number) => 1 - (1 - Math.max(0, Math.min(1, value))) ** 3;

/** Shared across video layers; interrupted reveals hide from their current size. */
export function createPanelScrollVisibility() {
  let lastScroll = -Infinity;
  let hideStart = 0;
  let from = Array<number>(orbitPanelCount).fill(1);
  const sample = (now: number, panel: number) => {
    if (lastScroll === -Infinity) return 1;
    if (now - lastScroll <= 0.18) {
      return from[panel] * (1 - easeOut((now - hideStart) / 0.12));
    }
    return easeOut((now - lastScroll - 0.18 - panel * 0.085) / 0.26);
  };
  return {
    sample,
    pulse(now: number) {
      if (now - lastScroll > 0.18) {
        from = from.map((_, panel) => sample(now, panel));
        hideStart = now;
      }
      lastScroll = now;
    },
    isSettled(now: number) {
      return now - lastScroll >= 0.18 + (orbitPanelCount - 1) * 0.085 + 0.26;
    },
  };
}

/** Unit-circle positions in bottom-origin coordinates; cards stay upright. */
export function sampleCollageMotion(entranceTime: number, panel: number, orbitTime = 0) {
  const local = entranceTime - panel * orbitEntranceStagger;
  // A short scale-up at the centre leads the outward glide by 100ms.
  const scale = easeOut(local / 0.24);
  const radius = easeOut((local - 0.1) / 0.72);
  const angle = Math.PI / 2 + panel * turn / orbitPanelCount + orbitTime * turn / 24;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, scale };
}

export const orbitExitStart = 6.8;
export const orbitExitStagger = 0.2;
export const orbitExitDuration = 0.85;

/** Seekable exit: scrolling back restores exactly the same radius and scale. */
export function sampleOrbitExit(videoTime: number, panel: number) {
  const progress = Math.max(0, Math.min(1,
    (videoTime - orbitExitStart - panel * orbitExitStagger) / orbitExitDuration));
  return 1 - progress ** 3;
}

/** Shared by the two video layers so a crossfade preserves drag momentum. */
export function createOrbitMotion() {
  const cruisingSpeed = turn / 24;
  let phase = 0;
  let velocity = cruisingSpeed;
  let lastTime: number | null = null;
  let pointerAngle: number | null = null;
  let pointerTime = 0;
  return {
    advance(now: number, reduced: boolean) {
      const dt = lastTime === null ? 0 : Math.min(0.1, Math.max(0, now - lastTime));
      lastTime = now;
      if (reduced) { velocity = 0; return phase; }
      if (pointerAngle === null) {
        const decay = Math.exp(-dt / 1.1);
        phase += cruisingSpeed * dt + (velocity - cruisingSpeed) * 1.1 * (1 - decay);
        velocity = cruisingSpeed + (velocity - cruisingSpeed) * decay;
      }
      return phase;
    },
    impulse(pixels: number) {
      if (pointerAngle !== null) return;
      velocity = Math.max(-7, Math.min(7, velocity + Math.max(-200, Math.min(200, pixels)) * 0.008));
    },
    begin(angle: number, now: number) {
      pointerAngle = angle;
      pointerTime = now;
      velocity = 0;
    },
    drag(angle: number, now: number) {
      if (pointerAngle === null) return;
      const delta = Math.atan2(Math.sin(angle - pointerAngle), Math.cos(angle - pointerAngle));
      const dt = Math.max(1 / 120, now - pointerTime);
      phase += delta * 1.35;
      velocity = Math.max(-7, Math.min(7, delta * 1.35 / dt));
      pointerAngle = angle;
      pointerTime = now;
    },
    end(now: number) {
      if (pointerAngle === null) return;
      // Holding still before release should not fling with an old movement sample.
      velocity *= Math.exp(-Math.max(0, now - pointerTime - 0.08) / 0.12);
      pointerAngle = null;
    },
  };
}
