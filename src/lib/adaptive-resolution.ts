export type ResolutionSettings = {
  initial: number;
  min: number;
  max: number;
  step: number;
  sampleFrames: number;
  cooldownMs: number;
  decreaseAboveMs: number;
  increaseBelowMs: number;
  recoveryMs?: number;
};

/** Quality is a fraction of native DPR; return absolute drawing-buffer DPR. */
export function createAdaptiveResolution(settings: ResolutionSettings) {
  // Start below native resolution, then adapt to sustained measured load.
  let scale = Math.max(settings.min, Math.min(settings.max, settings.initial));
  let nativeDpr = 1;
  const pixelRatio = () => Math.min(nativeDpr, Math.max(1, nativeDpr * scale));
  let previous: number | undefined;
  let changedAt = -Infinity;
  let decreasedAt = -Infinity;
  let count = 0;
  let cursor = 0;
  const samples = new Float64Array(settings.sampleFrames);
  const reset = () => { previous = undefined; count = 0; cursor = 0; };
  return {
    get pixelRatio() { return pixelRatio(); },
    reset,
    setDevicePixelRatio(native: number) {
      nativeDpr = native;
      reset();
    },
    sample(time: number, active: boolean) {
      if (!active) { reset(); return pixelRatio(); }
      const frameMs = previous === undefined ? 0 : time - previous;
      previous = time;
      // Don't treat a tab wake-up, debugger stop, or loading gap as GPU load.
      if (frameMs <= 0 || frameMs > 250) { count = 0; cursor = 0; return pixelRatio(); }
      samples[cursor] = frameMs;
      cursor = (cursor + 1) % samples.length;
      count = Math.min(count + 1, samples.length);
      if (count < samples.length || time - changedAt < settings.cooldownMs) return pixelRatio();
      let sum = 0, min = Infinity, max = -Infinity;
      for (const ms of samples) { sum += ms; min = Math.min(min, ms); max = Math.max(max, ms); }
      const average = (sum - min - max) / (samples.length - 2);
      const direction = average > settings.decreaseAboveMs ? -1 : average < settings.increaseBelowMs ? 1 : 0;
      // A stable 60fps at the lower tier does not prove the next tier fits.
      // Give interaction sustained headroom before retrying a more expensive tier.
      if (direction > 0 && time - decreasedAt < (settings.recoveryMs ?? 15000)) return pixelRatio();
      const next = Math.max(settings.min, Math.min(settings.max, Math.round((scale + direction * settings.step) * 100) / 100));
      if (next !== scale) {
        if (direction < 0) decreasedAt = time;
        scale = next;
        changedAt = time;
        reset();
      }
      return pixelRatio();
    },
  };
}

/** Use native viewport size so changing render scale cannot oscillate MSAA tiers. */
export function homeAntialiasSamples(width: number, height: number, nativeDpr: number) {
  const longEdge = Math.max(width, height) * nativeDpr;
  return longEdge >= 3840 ? 0 : longEdge >= 2560 ? 2 : 4;
}
