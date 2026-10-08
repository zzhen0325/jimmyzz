// Local samples from https://auge-xp.com/assets/sounds/ (see assets/sounds/README.md).
export type Sound = "hover" | "click" | "menu-open" | "transition" | "scramble" | "step";
const names = ["click", "menu-open", "transition", "scramble", ...Array.from({ length: 4 }, (_, i) => `hover-${i + 1}`), ...Array.from({ length: 6 }, (_, i) => `step-${i + 1}`)];
const buffers = new Map<string, { buffer: AudioBuffer; offset: number }>();
const playing = new Set<AudioBufferSourceNode>();
let context: AudioContext | undefined;
let gain: GainNode | undefined;
let enabled = true;
let unlocked = false;
let initialized = false;
let previousHover = 0;
let lastHover = -Infinity;
let lastStep = -Infinity;
let idle: ReturnType<typeof setTimeout> | undefined;
let generation = 0;
function stop() {
  generation++;
  clearTimeout(idle);
  playing.forEach((source) => { try { source.stop(); } catch {} });
  playing.clear();
}
function armIdle() {
  clearTimeout(idle);
  idle = setTimeout(() => { void context?.suspend().catch(() => {}); }, 30000);
}
export function unlockSound() {
  unlocked = true;
  if (enabled && !document.hidden) { void context?.resume().catch(() => {}); armIdle(); }
}
export function initSound() {
  if (initialized) return;
  initialized = true;
  if (typeof window.AudioContext !== "function") return;
  try {
    context = new AudioContext({ latencyHint: "interactive" });
    gain = context.createGain();
    gain.gain.value = .6;
    gain.connect(context.destination);
    // Sound stays enabled and starts after the first browser-authorized gesture.
    const audioContext = context;
    for (const name of names) {
      void fetch(`/assets/sounds/${name}.mp3`).then(async (response) => {
        if (!response.ok) return;
        const buffer = await audioContext.decodeAudioData(await response.arrayBuffer());
        const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i));
        let start = 0;
        while (start < buffer.length && channels.every((channel) => Math.abs(channel[start]) < .0025)) start++;
        buffers.set(name, { buffer, offset: start < buffer.length ? start / buffer.sampleRate : 0 });
      }).catch(() => {});
    }
  } catch { enabled = false; }
}
export function suspendSound() {
  stop();
  void context?.suspend().catch(() => {});
}
export function playSound(sound: Sound, options: { step?: number; delay?: number } = {}) {
  if (!enabled || !unlocked || !context || !gain || document.hidden) return;
  const now = performance.now();
  let name: string = sound;
  if (sound === "hover") {
    if (now - lastHover < 65) return;
    const choices = [1, 2, 3, 4].filter((value) => value !== previousHover);
    previousHover = choices[Math.floor(Math.random() * choices.length)];
    name = `hover-${previousHover}`;
    lastHover = now;
  } else if (sound === "step") {
    if (now - lastStep < 65) return;
    name = `step-${Math.min(6, Math.max(1, (options.step ?? 0) + 1))}`;
    lastStep = now;
  }
  const sample = buffers.get(name);
  if (!sample) return; // Never replay a stale interaction once loading finishes.
  const audioContext = context;
  const output = gain;
  const token = generation;
  const start = () => {
    if (token !== generation || !enabled || document.hidden || audioContext.state !== "running") return;
    const source = audioContext.createBufferSource();
    source.buffer = sample.buffer;
    source.connect(output);
    playing.add(source);
    source.onended = () => { playing.delete(source); source.disconnect(); };
    source.start(audioContext.currentTime + (options.delay ?? 0), sample.offset);
    armIdle();
  };
  if (audioContext.state === "running") start();
  else void audioContext.resume().then(start).catch(() => {});
}
