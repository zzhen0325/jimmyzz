/** One shared GPU surface: only the image under the pointer needs a renderer. */
const vertexSource = `
attribute vec2 position;
varying vec2 uv;
void main() { uv = vec2(position.x * .5 + .5, .5 - position.y * .5); gl_Position = vec4(position, 0., 1.); }
`;
const fragmentSource = `
precision highp float;
varying vec2 uv;
uniform sampler2D image;
uniform vec2 resolution;
uniform vec2 crop;
uniform vec4 trails[20];
float randomValue(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }
float brushNoise(float coordinate) {
  vec2 p = vec2(coordinate, 3.7);
  vec2 cell = floor(p), f = fract(p);
  vec2 blend = f * f * (3. - 2. * f);
  return mix(mix(randomValue(cell), randomValue(cell + vec2(1.,0.)), blend.x),
    mix(randomValue(cell + vec2(0.,1.)), randomValue(cell + vec2(1.,1.)), blend.x), blend.y);
}
vec4 sampleImage(vec2 point) { return texture2D(image, clamp((point - .5) * crop + .5, .001, .999)); }
void main() {
  vec2 aspect = vec2(resolution.x / resolution.y, 1.);
  float radius = min(50., resolution.y * .12);
  vec2 flow = vec2(0.);
  for (int i = 0; i < 20; i++) {
    vec2 motion = trails[i].zw;
    float distanceSquared = dot(motion, motion);
    if (distanceSquared < .00000001) continue;
    vec2 relative = (uv - trails[i].xy) * resolution;
    float influence = smoothstep(.05, .55, exp(-dot(relative,relative) / (radius * radius)));
    vec2 direction = normalize(motion);
    float transverse = dot(relative, vec2(-direction.y, direction.x));
    float bristles = .3 + .7 * brushNoise(transverse * .2);
    flow += motion * influence * bristles;
  }
  float amount = length(flow) * 4.;
  vec4 original = sampleImage(uv);
  if (amount <= .003) { gl_FragColor = original; return; }
  vec2 spread = normalize(flow) / aspect * min(amount * 2.2, .5);
  float jitter = (randomValue(((uv - .5) * crop + .5) * 731.) - .5) * .1;
  vec4 pigment = vec4(0.);
  float weightSum = 0.;
  // A centered brush blends color in both directions. It does not warp edges.
  for (int tap = 0; tap < 20; tap++) {
    float offset = (float(tap) + .5) * .1 - 1. + jitter;
    float weight = pow(max(1. - abs(offset), 0.), 2.);
    pigment += sampleImage(uv - spread * offset) * weight;
    weightSum += weight;
  }
  gl_FragColor = mix(original, pigment / weightSum, smoothstep(.003, .05, amount));
}
`;

type Stroke = { x: number; y: number; dx: number; dy: number; heat: number; target: number };
class PointerSmear {
  private canvas = document.createElement("canvas");
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private texture: WebGLTexture;
  private owner: HTMLElement | null = null;
  private source: HTMLImageElement | null = null;
  private strokes: Stroke[] = [];
  private previous: { x: number; y: number; time: number } | null = null;
  private frame = 0;
  private trails = new Float32Array(80);
  private lastFrame = 0;
  private locations: Record<string, WebGLUniformLocation | null> = {};

  constructor() {
    const gl = this.canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false, antialias: false, depth: false });
    if (!gl) throw new Error("WebGL unavailable");
    this.gl = gl;
    this.canvas.className = "pointer-smear-canvas";
    this.canvas.setAttribute("aria-hidden", "true");
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const error = gl.getShaderInfoLog(shader); gl.deleteShader(shader); throw new Error(error || "Shader failed");
      }
      return shader;
    };
    const vertex = compile(gl.VERTEX_SHADER, vertexSource);
    const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
    this.program = gl.createProgram()!;
    gl.attachShader(this.program, vertex); gl.attachShader(this.program, fragment); gl.linkProgram(this.program);
    gl.deleteShader(vertex); gl.deleteShader(fragment);
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) throw new Error("Smear shader link failed");
    gl.useProgram(this.program);
    const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(this.program, "position");
    gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    this.texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    for (const name of ["resolution", "crop", "trails"]) this.locations[name] = gl.getUniformLocation(this.program, name);
    this.canvas.addEventListener("webglcontextlost", () => this.detach());
  }

  move(owner: HTMLElement, image: HTMLImageElement, event: PointerEvent) {
    if (!image.complete || !image.naturalWidth || this.gl.isContextLost()) return;
    const bounds = owner.getBoundingClientRect();
    const width = owner.clientWidth;
    const height = owner.clientHeight;
    if (!width || !height) return;
    if (this.owner !== owner || this.source !== image) {
      this.detach();
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
      this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, image);
      this.owner = owner; this.source = image;
      owner.appendChild(this.canvas);
    }
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    const now = performance.now();
    if (!this.previous) { this.previous = { x, y, time: now }; return; }
    const dx = x - this.previous.x;
    const dy = y - this.previous.y;
    const distance = Math.hypot(dx, dy);
    // Accumulate tiny moves before depositing another brush sample.
    if (distance < .004) return;
    const scale = Math.min(distance, .1) / distance;
    const recycledHeat = this.strokes.length === 20 ? this.strokes.shift()!.heat : 0;
    this.strokes.push({ x, y, dx: dx * scale, dy: dy * scale, heat: recycledHeat, target: 1 });
    this.previous = { x, y, time: now };
    if (!this.frame) this.frame = requestAnimationFrame(this.render);
  }
  leave(owner: HTMLElement) { if (this.owner === owner) this.previous = null; }
  release(owner: HTMLElement) { if (this.owner === owner) this.detach(); }
  private detach() {
    cancelAnimationFrame(this.frame); this.frame = 0; this.strokes = []; this.previous = null;
    this.canvas.remove(); this.owner = null; this.source = null; this.lastFrame = 0;
  }
  private render = (now: number) => {
    if (!this.owner || !this.source || !this.owner.isConnected || document.hidden) { this.detach(); return; }
    const steps = Math.min(3, this.lastFrame ? (now - this.lastFrame) / (1000 / 60) : 1);
    this.lastFrame = now;
    // Faster recovery: roughly halve the time the pigment remains visible.
    const decay = Math.pow(.91, steps);
    const follow = 1 - Math.pow(.75, steps);
    let wet = 0;
    for (const stroke of this.strokes) {
      stroke.target *= decay;
      stroke.heat += (stroke.target - stroke.heat) * follow;
      wet = Math.max(wet, stroke.heat);
    }
    if (wet < .01) { this.detach(); return; }
    const gl = this.gl;
    const w = this.owner.clientWidth;
    const h = this.owner.clientHeight;
    const pixelRatio = Math.min(devicePixelRatio, 1.5, 1800 / Math.max(w, h));
    const rw = Math.max(1, Math.round(w * pixelRatio));
    const rh = Math.max(1, Math.round(h * pixelRatio));
    if (this.canvas.width !== rw || this.canvas.height !== rh) { this.canvas.width = rw; this.canvas.height = rh; }
    gl.viewport(0, 0, rw, rh);
    this.trails.fill(0);
    this.strokes.forEach((stroke, i) => {
      this.trails.set([stroke.x, stroke.y, stroke.dx * stroke.heat, stroke.dy * stroke.heat], i * 4);
    });
    const ratio = w / h;
    const imageRatio = this.source.naturalWidth / this.source.naturalHeight;
    const cover = getComputedStyle(this.source).objectFit === "cover";
    gl.uniform2f(this.locations.crop, cover ? Math.min(1, ratio / imageRatio) : 1, cover ? Math.min(1, imageRatio / ratio) : 1);
    gl.uniform2f(this.locations.resolution, w, h);
    gl.uniform4fv(this.locations.trails, this.trails);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    this.frame = requestAnimationFrame(this.render);
  };
}
let shared: PointerSmear | null = null;
let unavailable = false;
export function pointerSmear() {
  if (unavailable) return null;
  try { return shared ??= new PointerSmear(); }
  catch { unavailable = true; return null; }
}
