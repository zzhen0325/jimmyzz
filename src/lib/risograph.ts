import { getHeroPalette } from "./hero-palettes";
import { sampleCollageMotion, orbitEntranceDuration, createOrbitMotion } from "./collage-motion";
import { heroVideoRect } from "./hero-video-geometry";

const panelEntrances = new WeakMap<Element, { start: number | null }>();
const orbitMotions = new WeakMap<Element, ReturnType<typeof createOrbitMotion>>();

// Reconstructed from the visible Effect.app Risograph + Exposure controls.
// Grain and ink blending approximate the reference preview.
export const risographSettings = {
  // Set to false to show the original homepage video without the effect.
  "enabled": true,
  "duotone": false,
  "duotoneThreshold": 0.4225,
  "duotoneSoftness": 0.3975,
  "paper": "#f5f2e8",
  "grainScale": 0.23,
  "grainOpacity": 0.55,
  "grainSoftness": 0.5,
  "grainContrast": 1,
  "grainAnimationFps": 12,
  "grainAnimationStrength": 0.35,
  "paperTextureStrength": 0.34,
  "paperCreaseStrength": 0.24,
  "paperChangeEveryFrames": 8,
  "coolColorRecovery": 0.38,
  "shadowDepth": 0.65,
  "shadowNeutrality": 1,
  "shadowThreshold": 0.42,
  "exposure": 0.26,
  "gamma": 2.2,
  "inks": [
    { "color": "#ff665e", "weights": [-1.04, 3, 3, 3, 3, 0.35], "shift": [0, 0] },
    { "color": "#0078bf", "weights": [2.3, 3, -2, -2, 0.89, 0.63], "shift": [0, 0.002] },
    { "color": "#ffae3b", "weights": [0.54, -2, 3, 3, 3, 1.87], "shift": [0.003, 0.001] }
  ]
} as const;

export type RisographStyle = {
  [K in keyof typeof risographSettings]: K extends "inks"
    ? readonly { color: string; weights: readonly number[]; shift: readonly [number, number] }[]
    : K extends "paper" ? string : K extends "enabled" | "duotone" ? boolean : number;
};

const duotoneStyle = (dark: string, light: string, overrides: Partial<RisographStyle> = {}): RisographStyle => ({
  ...risographSettings,
  duotone: true,
  paper: light,
  grainOpacity: 0.65,
  grainSoftness: 0.4,
  paperTextureStrength: 0.16,
  paperCreaseStrength: 0.08,
  ...overrides,
  inks: [dark, light].map((color, i) => ({ ...risographSettings.inks[i], color })),
});

export const risographPresets: { name: string; description: string; settings: RisographStyle }[] = [
  { name: "钴蓝米白", description: "保留加强 · 钴蓝 × 米白 · 高反差分色", settings: duotoneStyle("#123cbb", "#fff5df", { duotoneThreshold: 0.4, duotoneSoftness: 0.08, grainOpacity: 0.45 }) },
  { name: "群青荧粉", description: "群青 × 荧粉 · 中低阈值 · 跳色海报", settings: duotoneStyle("#192480", "#ff83d5", { duotoneThreshold: 0.27, duotoneSoftness: 0.035, grainOpacity: 0.55 }) },
  { name: "紫墨薄荷", description: "紫墨 × 薄荷 · 低阈值 · 亮色铺开", settings: duotoneStyle("#45216e", "#a8ffd6", { duotoneThreshold: 0.2, duotoneSoftness: 0.045, grainOpacity: 0.5 }) },
  { name: "绯红纸白", description: "绯红 × 纸白 · 中阈值硬切 · 版画感", settings: duotoneStyle("#c82036", "#fff9eb", { duotoneThreshold: 0.36, duotoneSoftness: 0.015, grainOpacity: 0.65 }) },
  { name: "深蓝蜜橙", description: "深蓝 × 蜜橙 · 高阈值 · 浓墨高光", settings: duotoneStyle("#132c62", "#ffab37", { duotoneThreshold: 0.52, duotoneSoftness: 0.065, grainOpacity: 0.5 }) },
  { name: "电蓝酸橙", description: "电蓝 × 酸橙 · 轻柔分色 · 保留鲜明对比", settings: duotoneStyle("#1833bc", "#d7ff58", { duotoneThreshold: 0.18, duotoneSoftness: 0.035, grainOpacity: 0.4 }) },
  { name: "孔雀蓝桃", description: "孔雀蓝 × 桃粉 · 中低阈值 · 柔硬平衡", settings: duotoneStyle("#075873", "#ffb7a5", { duotoneThreshold: 0.28, duotoneSoftness: 0.085, grainOpacity: 0.55 }) },
  { name: "黑墨电绿", description: "黑墨 × 电绿 · 中高阈值 · 大块荧光", settings: duotoneStyle("#18251b", "#b9ff32", { duotoneThreshold: 0.43, duotoneSoftness: 0.025, grainOpacity: 0.6 }) },
  { name: "葡萄冰紫", description: "葡萄 × 冰紫 · 高阈值 · 深紫留白", settings: duotoneStyle("#40147d", "#d6d0ff", { duotoneThreshold: 0.58, duotoneSoftness: 0.04, grainOpacity: 0.5 }) },
  { name: "深棕天蓝", description: "深棕 × 天蓝 · 中阈值 · 冷暖撞色", settings: duotoneStyle("#472621", "#8addff", { duotoneThreshold: 0.33, duotoneSoftness: 0.035, grainOpacity: 0.6 }) },
  { name: "雾粉珊瑚", description: "参考粉色 · 淡紫粉 × 珊瑚桃粉 · 柔和雾面", settings: duotoneStyle("#d9b9fa", "#ff947f", { duotoneThreshold: 0.36, duotoneSoftness: 0.34, grainOpacity: 0.3, grainAnimationStrength: 0.15, paperTextureStrength: 0.09, paperCreaseStrength: 0.02 }) },
];

// Independent ink/paper treatment for the drifting rectangular windows.
export const risographWindowSettings = {
  paper: "#f2ddff",
  grainScale: 0.42,
  grainOpacity: 0.92,
  grainSoftness: 0.18,
  grainContrast: 1.3,
  exposure: 0.18,
  gamma: 1.85,
  inks: ["#c05be8", "#2371B2", "#ff754c"],
} as const;

// Eight landscape 4:3 video windows, evenly spaced around the orbit.
export const collagePanels = [
  { label: "S01 / PASTEL", color: "#a6b8ff" },
  { label: "S02 / RISO", color: "#f4bcac" },
  { label: "S03 / ORIGINAL", color: "#ade4d0" },
  { label: "S04 / DUOTONE GRID", color: "#ff8e30" },
  { label: "S05 / SOFT PASTEL", color: "#ffd4e8" },
  { label: "S06 / HALFTONE", color: "#fff6de" },
  { label: "S07 / ASCII", color: "#fffbea" },
  { label: "S08 / ACCENT", color: "#ffbd9e" },
] as const;
const risographWindowCount = collagePanels.length;
const panelEntranceDuration = orbitEntranceDuration;

const vertexSource = `#version 300 es

in vec2 position;
out vec2 uv;
void main() {
  uv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const fragmentSource = `#version 300 es

precision highp float;
uniform sampler2D frame;
uniform sampler2D grainPattern;
uniform vec2 resolution;
uniform vec2 sourceSize;
uniform vec4 videoRect;
uniform vec3 paper;
uniform bool duotone;
uniform vec2 duotoneRange;
uniform vec4 grain;
uniform highp sampler2DArray animatedGrain;
uniform vec2 grainAnimation;
uniform vec2 paperTexture;
uniform float paperFrame;
uniform vec3 shadows;
uniform float coolColorRecovery;
uniform vec2 exposureGamma;
uniform vec3 inkColor[3];
uniform vec3 primaryWeights[3];
uniform vec3 secondaryWeights[3];
uniform vec2 inkShift[3];
uniform vec2 borderPixel;
uniform vec4 risoWindow;
uniform float risoRotation;
uniform vec3 windowPaper;
uniform vec4 windowGrain;
uniform vec2 windowExposureGamma;
uniform vec3 windowInk[3];
in vec2 uv;
out vec4 outputColor;
vec2 coverUV(vec2 p) {
  return (p - videoRect.xy) / videoRect.zw;
}
float separation(vec3 c, vec3 primary, vec3 secondary) {
  float base = min(c.r, min(c.g, c.b));
  vec3 primaries = max(c - max(c.gbr, c.brg), 0.0);
  vec3 secondaries = max(min(c, c.gbr) - c.brg, 0.0);
  float gray = base + dot(primaries, primary) + dot(secondaries, secondary);
  return 1.0 - clamp(gray, 0.0, 1.0);
}
// Paper relief in CSS pixels, held steady between paper animation steps.
float paperRelief(vec2 p) {
  float tooth = texture(grainPattern, p / 620.0 + vec2(0.31, 0.67)).r - 0.5;
  float fibers = texture(grainPattern, p / vec2(1350.0, 105.0)).r - 0.5;
  float mottling = texture(grainPattern, p / 2800.0 + vec2(0.57, 0.19)).r - 0.5;
  return tooth * 0.45 + fibers * 0.8 + mottling * 0.65;
}
float paperCrease(vec2 p, vec2 direction, float offset) {
  float along = dot(p, vec2(-direction.y, direction.x));
  float d = dot(p, direction) - offset + sin(along * 0.012) * 1.8
    + sin(along * 0.037) * 0.45;
  // Uneven paired shadow/highlight gives a shallow fold with a worn edge.
  float wear = 0.45 + 0.55 * texture(grainPattern, p / 410.0).r;
  return (exp(-pow((d - 1.4) / 2.0, 2.0)) * 0.55
    - exp(-pow(d / 1.2, 2.0)) * 0.7
    - exp(-pow(d / 8.0, 2.0)) * 0.16) * wear;
}
void main() {
  vec2 sourceUV = coverUV(uv);
  if (min(sourceUV.x, sourceUV.y) < 0.0 || max(sourceUV.x, sourceUV.y) > 1.0) {
    outputColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }
  vec2 delta = (uv - risoWindow.xy) * resolution;
  float c = cos(risoRotation), s = sin(risoRotation);
  vec2 local = vec2(c * delta.x - s * delta.y, s * delta.x + c * delta.y) / resolution;
  vec2 windowDistance = abs(local) - risoWindow.zw * 0.5;
  bool inWindow = max(windowDistance.x, windowDistance.y) <= 0.0;
  vec4 activeGrain = inWindow ? windowGrain : grain;
  vec2 activeExposure = inWindow ? windowExposureGamma : exposureGamma;
  vec3 printColor = inWindow ? windowPaper : paper;
  vec2 grainUV = uv * resolution / (activeGrain.x * 1920.0);
  for (int i = 0; i < 3; i++) {
    vec3 source = texture(frame, coverUV(uv) - inkShift[i]).rgb;
    if (inWindow) source = smoothstep(vec3(0.08), vec3(0.92), 1.0 - source);
    float density = separation(source, primaryWeights[i], secondaryWeights[i]);
    vec2 offset = vec2(float(i) * 0.173, float(i) * 0.317);
    // Keep the scanned paper fixed. Independent noise layers change the ink
    // density at each pixel, rather than moving the grain pattern as a sheet.
    float changingNoise = texture(animatedGrain, vec3(gl_FragCoord.xy / 256.0,
      mod(grainAnimation.x + float(i) * 5.0, 16.0))).r - 0.5;
    float speckle = clamp((texture(grainPattern, grainUV + offset).r - 0.5)
      * activeGrain.w + 0.5 + changingNoise * grainAnimation.y, 0.0, 1.0);
    float softness = max(activeGrain.z, 0.001);
    float coverage = smoothstep(speckle - softness, speckle + softness, density);
    coverage = mix(density, coverage, activeGrain.y);
    printColor *= mix(vec3(1.0), (inWindow ? windowInk[i] : inkColor[i]), coverage * 0.98);
  }
  float fiber = (texture(grainPattern, grainUV).r - 0.5) * activeGrain.w;
  printColor *= 1.0 + fiber * 0.3 * activeGrain.y;
  printColor = pow(max(printColor * exp2(activeExposure.x), 0.0),
    vec3(1.0 / activeExposure.y));
  // Neutralize only the deepest overprint; keep the red/blue midtones intact.
  float luminance = dot(printColor, vec3(0.2126, 0.7152, 0.0722));
  float shadow = 1.0 - smoothstep(0.04, shadows.z, luminance);
  printColor = mix(printColor, vec3(luminance), shadow * (inWindow ? 0.15 : shadows.y));
  printColor *= 1.0 - shadow * (inWindow ? 0.08 : shadows.x);
  // Restore some original green/blue hue at the printed luminance so paper,
  // animated grain and shadow depth remain visible in those areas.
  vec3 original = texture(frame, coverUV(uv)).rgb;
  float coolMask = smoothstep(0.025, 0.22, max(original.g, original.b) - original.r);
  float originalLuma = dot(original, vec3(0.2126, 0.7152, 0.0722));
  float printedLuma = dot(printColor, vec3(0.2126, 0.7152, 0.0722));
  vec3 recovered = clamp(original * printedLuma / max(originalLuma, 0.025), 0.0, 1.0);
  printColor = mix(printColor, recovered, coolMask * (inWindow ? 0.08 : coolColorRecovery));
  if (duotone && !inWindow) {
    // Map source lightness to exactly two authored inks; retain printed texture.
    float tone = smoothstep(duotoneRange.x - duotoneRange.y,
      duotoneRange.x + duotoneRange.y, originalLuma);
    float noise = texture(grainPattern, grainUV).r - 0.5;
    float moving = texture(animatedGrain, vec3(gl_FragCoord.xy / 256.0,
      mod(grainAnimation.x, 16.0))).r - 0.5;
    tone = clamp(tone + (noise + moving * grainAnimation.y) * grain.y
      * 0.48 * (0.3 + sin(tone * 3.14159) * 0.7), 0.0, 1.0);
    printColor = mix(pow(inkColor[0], vec3(1.0 / 2.2)),
      pow(inkColor[1], vec3(1.0 / 2.2)), tone);
  }
  vec2 paperPixel = uv / borderPixel;
  // Change the sheet only every eight grain frames; share its phase across windows.
  vec2 paperOffset = fract(sin(vec2(paperFrame + 1.0, paperFrame + 7.0)
    * vec2(127.1, 311.7)) * 43758.5453);
  paperPixel += (paperOffset - 0.5) * vec2(420.0, 260.0);
  float relief = paperRelief(paperPixel);
  float creases = paperCrease(paperPixel, normalize(vec2(1.0, 0.16)), 286.0)
    + paperCrease(paperPixel, normalize(vec2(-0.09, 1.0)), 394.0);
  vec2 sheetSize = 1.0 / borderPixel;
  creases += paperCrease(paperPixel, normalize(vec2(1.0, -0.22)), sheetSize.x * 0.68) * 0.75
    + paperCrease(paperPixel, normalize(vec2(0.12, 1.0)), sheetSize.y * 0.24) * 0.65
    + paperCrease(paperPixel, normalize(vec2(-0.18, 1.0)), sheetSize.y * 0.78) * 0.8
    + paperCrease(paperPixel, normalize(vec2(0.72, 0.69)), dot(sheetSize, vec2(0.72, 0.69)) * 0.62) * 0.5;
  float paperMark = relief * paperTexture.x + creases * paperTexture.y;
  // A little exposed paper keeps fibers visible in ink without washing out blacks.
  printColor *= 1.0 + paperMark;
  printColor += paper * max(paperMark, 0.0) * 0.12;
  // The opaque background canvas owns its shading; preserve the S02 effect window.
  // Other effect rectangles are composited above this canvas.
  if (!inWindow) {
    float y = 1.0 - uv.y;
    float shade = y < 0.18 ? mix(0.58, 0.20, y / 0.18)
      : y < 0.38 ? mix(0.20, 0.0, (y - 0.18) / 0.20)
      : y < 0.60 ? 0.0
      : y < 0.82 ? mix(0.0, 0.24, (y - 0.60) / 0.22)
      : mix(0.24, 0.65, (y - 0.82) / 0.18);
    printColor *= 1.0 - shade;
  }
  outputColor = vec4(clamp(printColor, 0.0, 1.0), 1.0);
}`;

function linearRgb(hex: string) {
  return [1, 3, 5].map((start) => (parseInt(hex.slice(start, start + 2), 16) / 255) ** 2.2);
}

let grainImagePromise: Promise<HTMLImageElement> | undefined;
function loadGrainImage() {
  return grainImagePromise ??= new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => { grainImagePromise = undefined; reject(new Error("Risograph grain failed to load")); };
    image.src = "/assets/effects/riso-pattern.webp";
  });
}

export function createRisographRenderer(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    depth: false,
  });
  if (!gl) return null;
  const shaders: WebGLShader[] = [];
  const program = gl.createProgram();
  const buffer = gl.createBuffer();
  const videoTexture = gl.createTexture();
  const grainTexture = gl.createTexture();
  const animatedGrainTexture = gl.createTexture();
  let disposed = false;
  const dispose = () => {
    disposed = true;
    gl.deleteTexture(videoTexture);
    gl.deleteTexture(grainTexture);
    gl.deleteTexture(animatedGrainTexture);
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
    shaders.forEach((shader) => gl.deleteShader(shader));
  };
  if (!program || !buffer || !videoTexture || !grainTexture || !animatedGrainTexture) { dispose(); return null; }
  for (const [type, source] of [[gl.VERTEX_SHADER, vertexSource], [gl.FRAGMENT_SHADER, fragmentSource]] as const) {
    const shader = gl.createShader(type);
    if (!shader) { dispose(); return null; }
    shaders.push(shader);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { dispose(); return null; }
    gl.attachShader(program, shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { dispose(); return null; }
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, videoTexture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const uniform = (name: string) => gl.getUniformLocation(program, name);
  let settings: RisographStyle = risographSettings;
  const palette = getHeroPalette();
  const windowSettings = { ...risographWindowSettings, paper: palette.paper,
    inks: [palette.main, palette.dark, palette.accent] };
  const risoWindow = uniform("risoWindow");
  gl.uniform3fv(uniform("windowPaper"), linearRgb(windowSettings.paper));
  gl.uniform4f(uniform("windowGrain"), windowSettings.grainScale, windowSettings.grainOpacity, windowSettings.grainSoftness, windowSettings.grainContrast);
  gl.uniform2f(uniform("windowExposureGamma"), windowSettings.exposure, windowSettings.gamma);
  windowSettings.inks.forEach((ink, index) => gl.uniform3fv(uniform(`windowInk[${index}]`), linearRgb(ink)));
  const borderPixel = uniform("borderPixel");
  const windowPositions = new Float32Array(risographWindowCount * 4);
  const windowRotations = new Float32Array(risographWindowCount);
  const orbitOwner = canvas.closest("section") ?? canvas;
  const orbit = orbitMotions.get(orbitOwner) ?? createOrbitMotion();
  orbitMotions.set(orbitOwner, orbit);
  const sharedEntrance = panelEntrances.get(orbitOwner) ?? { start: null };
  panelEntrances.set(orbitOwner, sharedEntrance);
  let fitProgress = 0;
  let scrollProgress = 0;
  let reducedMotion = false;
  let instantEntrance = false;
  let entranceComplete = false;
  let exiting = false;
  let imageBounds = { left: 0, right: 1, bottom: 0, top: 1 };
  const pointerAngle = (x: number, y: number) => Math.atan2(
    (y - (imageBounds.bottom + imageBounds.top) / 2) * canvas.height,
    (x - (imageBounds.left + imageBounds.right) / 2) * canvas.width,
  );
  gl.uniform1i(uniform("frame"), 0);
  gl.uniform1i(uniform("grainPattern"), 1);
  const grainAnimation = uniform("grainAnimation");
  const paperFrame = uniform("paperFrame");
  gl.uniform1f(paperFrame, 0);
  gl.uniform2f(grainAnimation, 0, settings.grainAnimationStrength);
  gl.uniform1i(uniform("animatedGrain"), 2);
  // Allocate independent noise frames once (1 MiB). Animation only switches a
  // layer index; no per-frame CPU noise generation or video texture upload.
  const noiseFrames = new Uint8Array(256 * 256 * 16);
  let seed = 0x72f4a31;
  for (let i = 0; i < noiseFrames.length; i++) {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    noiseFrames[i] = seed & 255;
  }
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, animatedGrainTexture);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.texImage3D(gl.TEXTURE_2D_ARRAY, 0, gl.R8, 256, 256, 16, 0, gl.RED, gl.UNSIGNED_BYTE, noiseFrames);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.activeTexture(gl.TEXTURE0);
  const setStyle = (next: RisographStyle) => {
    settings = next;
    gl.useProgram(program);
    gl.uniform1i(uniform("duotone"), settings.duotone ? 1 : 0);
    gl.uniform2f(uniform("duotoneRange"), settings.duotoneThreshold, Math.max(settings.duotoneSoftness, 0.001));
  gl.uniform3fv(uniform("paper"), linearRgb(settings.paper));
  gl.uniform4f(uniform("grain"), settings.grainScale, settings.grainOpacity, settings.grainSoftness, settings.grainContrast);
  gl.uniform2f(uniform("exposureGamma"), settings.exposure, settings.gamma);
  gl.uniform3f(uniform("shadows"), settings.shadowDepth, settings.shadowNeutrality, settings.shadowThreshold);
  gl.uniform1f(uniform("coolColorRecovery"), settings.coolColorRecovery);
  gl.uniform2f(uniform("paperTexture"), settings.paperTextureStrength, settings.paperCreaseStrength);
  settings.inks.forEach((ink, index) => {
    gl.uniform3fv(uniform(`inkColor[${index}]`), linearRgb(ink.color));
    gl.uniform3fv(uniform(`primaryWeights[${index}]`), [ink.weights[0], ink.weights[2], ink.weights[4]]);
    gl.uniform3fv(uniform(`secondaryWeights[${index}]`), [ink.weights[1], ink.weights[3], ink.weights[5]]);
    gl.uniform2fv(uniform(`inkShift[${index}]`), ink.shift);
  });
  };
  setStyle(settings);
  const resolution = uniform("resolution");
  const sourceSize = uniform("sourceSize");
  const videoRectUniform = uniform("videoRect");
  let grainReady = false;
  const ready = loadGrainImage().then((image) => {
    if (disposed || gl.isContextLost()) return;
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, grainTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    // WebGL2 supports repeating the original 1920px (non-power-of-two) texture.
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.activeTexture(gl.TEXTURE0);
    grainReady = true;
  });
  let sizeDirty = true;
  let lastTime = -1;
  let lastSource = "";
  return {
    ready,
    setStyle,
    beginEntrance(instant = false) {
      instantEntrance = instant;
      if (!instant) sharedEntrance.start ??= performance.now() / 1000;
    },
    isEntranceComplete() { return entranceComplete; },
    getWindowPositions() { return windowPositions; },
    getWindowRotations() { return windowRotations; },
    canDrag() { return entranceComplete && !exiting; },
    beginDrag(x: number, y: number) {
      if (entranceComplete && !exiting) orbit.begin(pointerAngle(x, y), performance.now() / 1000);
    },
    dragTo(x: number, y: number) {
      orbit.drag(pointerAngle(x, y), performance.now() / 1000);
    },
    endDrag() { orbit.end(performance.now() / 1000); },
    accelerateOrbit(pixels: number) { if (!reducedMotion) orbit.impulse(pixels); },

    setGrainFrame(frame: number) {
      if (disposed || gl.isContextLost()) return;
      gl.uniform2f(grainAnimation, frame % 16, settings.grainAnimationStrength);
      gl.uniform1f(paperFrame, Math.floor(frame / settings.paperChangeEveryFrames) % 256);
    },
    setReducedMotion(reduced: boolean) { reducedMotion = reduced; },
    setFitProgress(progress: number) { fitProgress = progress; },
    setScrollProgress(progress: number) { scrollProgress = progress; },
    resize() { sizeDirty = true; },
    draw(video: HTMLVideoElement, forceUpload = false) {
      if (disposed || !grainReady || gl.isContextLost() || video.readyState < 2 || !video.videoWidth) return false;
      if (sizeDirty) {
        const bounds = canvas.getBoundingClientRect();
        const scale = Math.min(window.devicePixelRatio || 1, 1.5, 1920 / Math.max(bounds.width, 1));
        const width = Math.max(1, Math.round(bounds.width * scale));
        const height = Math.max(1, Math.round(bounds.height * scale));
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }
        gl.viewport(0, 0, width, height);
        gl.uniform2f(resolution, width, height);
        gl.uniform2f(borderPixel, 1 / Math.max(bounds.width, 1), 1 / Math.max(bounds.height, 1));
        sizeDirty = false;
      }
      // currentTime changes before decoding completes. Keep the last uploaded
      // frame during a seek; seeked/rVFC will submit the finished frame.
      if (video.seeking && lastTime < 0) return false;
      if (!video.seeking && (forceUpload || lastTime !== video.currentTime || lastSource !== video.currentSrc)) {
        gl.uniform2f(sourceSize, video.videoWidth, video.videoHeight);
        // RGBA follows the browser's native video upload path; only upload new frames.
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
        lastTime = video.currentTime;
        lastSource = video.currentSrc;
      }
      const videoRect = heroVideoRect(canvas.width, canvas.height, video.videoWidth, video.videoHeight, fitProgress);
      gl.uniform4f(videoRectUniform, videoRect.x / canvas.width,
        1 - (videoRect.y + videoRect.h) / canvas.height, videoRect.w / canvas.width, videoRect.h / canvas.height);
      // A shared start lets the stagger finish across the overlapping video layers.
      const entranceTime = reducedMotion ? panelEntranceDuration : sharedEntrance.start !== null
        ? performance.now() / 1000 - sharedEntrance.start
        : instantEntrance ? panelEntranceDuration : -1;
      entranceComplete = entranceTime >= panelEntranceDuration;
      imageBounds = {
        left: Math.max(0, videoRect.x / canvas.width),
        right: Math.min(1, (videoRect.x + videoRect.w) / canvas.width),
        bottom: Math.max(0, 1 - (videoRect.y + videoRect.h) / canvas.height),
        top: Math.min(1, 1 - videoRect.y / canvas.height),
      };
      // Work in physical canvas pixels so the ring stays circular at every aspect ratio.
      const shortSide = Math.min((imageBounds.right - imageBounds.left) * canvas.width,
        (imageBounds.top - imageBounds.bottom) * canvas.height);
      const radius = shortSide * 0.35;
      const side = shortSide * 0.3;
      const centerX = (imageBounds.left + imageBounds.right) / 2;
      const centerY = (imageBounds.bottom + imageBounds.top) / 2;
      // Both video layers use the same clock phase, keeping the orbit steady through their crossfade.
      const orbitPhase = orbit.advance(performance.now() / 1000, reducedMotion);
      const orbitTime = orbitPhase * 24 / (Math.PI * 2);
      canvas.dataset.orbitPhase = String(orbitPhase);
      exiting = scrollProgress > 0.08;
      collagePanels.forEach((_, index) => {
        // Staggered contraction follows scroll position, so stopping never respawns panels.
        const exit = Math.max(0, Math.min(1, (scrollProgress - 0.08 - index * 0.035) / 0.32));
        const remaining = 1 - exit * exit * (3 - 2 * exit);
        const pose = sampleCollageMotion(entranceTime, index, orbitTime);
        const w = side / canvas.width * pose.scale * remaining;
        const h = side * 3 / 4 / canvas.height * pose.scale * remaining;
        const targetX = centerX + pose.x * radius * (0.35 + 0.65 * remaining) / canvas.width;
        const targetY = centerY + pose.y * radius * (0.35 + 0.65 * remaining) / canvas.height;
        windowRotations[index] = 0;
        windowPositions.set([targetX, targetY, w, h], index * 4);
      });
      // S02 shares the background's video texture and UV mapping.
      gl.uniform4fv(risoWindow, windowPositions.subarray(4, 8));
      gl.uniform1f(uniform("risoRotation"), windowRotations[1]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      return true;
    },
    dispose,
  };
}
