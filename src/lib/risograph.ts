// Reconstructed from the visible Effect.app Risograph + Exposure controls.
// Grain and ink blending approximate the reference preview.
export const risographSettings = {
  // Set to false to show the original homepage video without the effect.
  "enabled": true,
  "paper": "#f5f2e8",
  "grainScale": 0.23,
  "grainOpacity": 0.55,
  "grainSoftness": 0.5,
  "grainContrast": 1,
  "grainAnimationFps": 12,
  "grainAnimationStrength": 0.35,
  "paperTextureStrength": 0.24,
  "paperCreaseStrength": 0.16,
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

// Independent ink/paper treatment for the drifting rectangular windows.
export const risographWindowSettings = {
  paper: "#f2ddff",
  grainScale: 0.42,
  grainOpacity: 0.92,
  grainSoftness: 0.18,
  grainContrast: 1.3,
  exposure: 0.18,
  gamma: 1.85,
  inks: ["#c05be8", "#36a68d", "#ff754c"],
} as const;

const risographWindowCount = 3;

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
uniform vec3 paper;
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
uniform vec4 windows[${risographWindowCount}];
uniform vec2 borderPixel;
uniform vec3 windowPaper;
uniform vec4 windowGrain;
uniform vec2 windowExposureGamma;
uniform vec3 windowInk[3];
in vec2 uv;
out vec4 outputColor;
vec2 coverUV(vec2 p) {
  float viewAspect = resolution.x / resolution.y;
  float videoAspect = sourceSize.x / sourceSize.y;
  vec2 scale = vec2(min(viewAspect / videoAspect, 1.0),
    min(videoAspect / viewAspect, 1.0));
  // Match object-position: center top; the flipped video texture has its top at y=1.
  vec2 anchor = vec2(0.5, 1.0);
  return (p - anchor) * scale + anchor;
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
  bool inWindow = false;
  float border = 0.0;
  for (int i = 0; i < ${risographWindowCount}; i++) {
    vec2 d = abs(uv - windows[i].xy) - windows[i].zw * 0.5;
    if (max(d.x, d.y) <= 0.0) {
      inWindow = true;
      // Subpixel white rule, measured in CSS pixels at every render scale.
      vec2 inside = -d / borderPixel;
      border = max(border, 1.0 - smoothstep(0.35, 1.05, min(inside.x, inside.y)));
    }
  }
  vec4 activeGrain = inWindow ? windowGrain : grain;
  vec2 activeExposure = inWindow ? windowExposureGamma : exposureGamma;
  vec3 printColor = inWindow ? windowPaper : paper;
  vec2 grainUV = uv * resolution / (activeGrain.x * 1920.0);
  for (int i = 0; i < 3; i++) {
    vec3 source = texture(frame, coverUV(uv) - inkShift[i]).rgb;
    // A negative separation turns the dark background into lilac paper and
    // prints its lights in saturated ink, instead of a pale tint of the base.
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
  vec2 paperPixel = uv / borderPixel;
  // Change the sheet only every eight grain frames; share its phase across windows.
  vec2 paperOffset = fract(sin(vec2(paperFrame + 1.0, paperFrame + 7.0)
    * vec2(127.1, 311.7)) * 43758.5453);
  paperPixel += (paperOffset - 0.5) * vec2(420.0, 260.0);
  float relief = paperRelief(paperPixel);
  float creases = paperCrease(paperPixel, normalize(vec2(1.0, 0.16)), 286.0)
    + paperCrease(paperPixel, normalize(vec2(-0.09, 1.0)), 394.0);
  float paperMark = relief * paperTexture.x + creases * paperTexture.y;
  // A little exposed paper keeps fibers visible in ink without washing out blacks.
  printColor *= 1.0 + paperMark;
  printColor += paper * max(paperMark, 0.0) * 0.12;
  printColor = mix(printColor, vec3(1.0), border * 0.8);
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
  const settings = risographSettings;
  const windowSettings = risographWindowSettings;
  gl.uniform3fv(uniform("windowPaper"), linearRgb(windowSettings.paper));
  gl.uniform4f(uniform("windowGrain"), windowSettings.grainScale, windowSettings.grainOpacity, windowSettings.grainSoftness, windowSettings.grainContrast);
  gl.uniform2f(uniform("windowExposureGamma"), windowSettings.exposure, windowSettings.gamma);
  windowSettings.inks.forEach((ink, index) => gl.uniform3fv(uniform(`windowInk[${index}]`), linearRgb(ink)));
  const windowUniform = uniform("windows[0]");
  const borderPixel = uniform("borderPixel");
  const windowPositions = new Float32Array(risographWindowCount * 4);
  const windowLayout = [
    [0.22, 0.46, 0.09, 0.095],
    [0.51, 0.72, 0.028, 0.12],
    [0.79, 0.43, 0.038, 0.065],
  ];
  // Random phases/speeds per mount; continuous translation without jumping cuts.
  const drift = windowLayout.map(() => [Math.random() * Math.PI * 2, 0.12 + Math.random() * 0.08]);
  let motionTime = 0;
  let draggedWindow = -1;
  const clampCenter = (value: number, size: number) => Math.max(size / 2 + 0.025, Math.min(1 - size / 2 - 0.025, value));
  gl.uniform1i(uniform("frame"), 0);
  gl.uniform1i(uniform("grainPattern"), 1);
  gl.uniform3fv(uniform("paper"), linearRgb(settings.paper));
  gl.uniform4f(uniform("grain"), settings.grainScale, settings.grainOpacity, settings.grainSoftness, settings.grainContrast);
  gl.uniform2f(uniform("exposureGamma"), settings.exposure, settings.gamma);
  gl.uniform3f(uniform("shadows"), settings.shadowDepth, settings.shadowNeutrality, settings.shadowThreshold);
  gl.uniform1f(uniform("coolColorRecovery"), settings.coolColorRecovery);
  gl.uniform2f(uniform("paperTexture"), settings.paperTextureStrength, settings.paperCreaseStrength);
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
  settings.inks.forEach((ink, index) => {
    gl.uniform3fv(uniform(`inkColor[${index}]`), linearRgb(ink.color));
    gl.uniform3fv(uniform(`primaryWeights[${index}]`), [ink.weights[0], ink.weights[2], ink.weights[4]]);
    gl.uniform3fv(uniform(`secondaryWeights[${index}]`), [ink.weights[1], ink.weights[3], ink.weights[5]]);
    gl.uniform2fv(uniform(`inkShift[${index}]`), ink.shift);
  });
  const resolution = uniform("resolution");
  const sourceSize = uniform("sourceSize");
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
    getWindowPositions() { return windowPositions; },
    beginDrag(index: number) { draggedWindow = index; },
    dragTo(x: number, y: number) {
      if (draggedWindow < 0) return;
      const offset = draggedWindow * 4;
      windowPositions[offset] = clampCenter(x, windowPositions[offset + 2]);
      windowPositions[offset + 1] = clampCenter(y, windowPositions[offset + 3]);
    },
    endDrag() {
      if (draggedWindow < 0) return;
      const [phase, speed] = drift[draggedWindow];
      // Rebase the drift orbit at the release point, with no snap back.
      windowLayout[draggedWindow][0] = windowPositions[draggedWindow * 4] - Math.sin(motionTime * speed + phase) * 0.075;
      windowLayout[draggedWindow][1] = windowPositions[draggedWindow * 4 + 1] - Math.sin(motionTime * speed * 0.73 + phase * 1.7) * 0.09;
      draggedWindow = -1;
    },
    setGrainFrame(frame: number) {
      if (disposed || gl.isContextLost()) return;
      gl.uniform2f(grainAnimation, frame % 16, settings.grainAnimationStrength);
      gl.uniform1f(paperFrame, Math.floor(frame / settings.paperChangeEveryFrames) % 256);
    },
    setMotionTime(time: number) { motionTime = time; },
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
      windowLayout.forEach(([x, y, width, height], index) => {
        if (index === draggedWindow) return;
        const [phase, speed] = drift[index];
        windowPositions.set([
          clampCenter(x + Math.sin(motionTime * speed + phase) * 0.075, width),
          clampCenter(y + Math.sin(motionTime * speed * 0.73 + phase * 1.7) * 0.09, height),
          width, height,
        ], index * 4);
      });
      gl.uniform4fv(windowUniform, windowPositions);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      return true;
    },
    dispose,
  };
}
