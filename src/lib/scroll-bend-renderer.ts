type Media = HTMLImageElement | HTMLVideoElement;
type Rect = { x: number; y: number; width: number; height: number };
type TextureEntry = {
  media: Media; texture: WebGLTexture; src: string; width: number; height: number;
  used: number; dirty: boolean; time: number; callback?: number;
};
type Layer = { entry: TextureEntry; rect: Rect; clip: Rect; radius: number; opacity: number; order: number };

const vertexSource = `
attribute vec2 point;
uniform vec2 viewport;
uniform vec4 host, media;
uniform float bend;
varying vec2 uv, sourcePoint;
void main() {
  uv = point;
  vec2 p = media.xy + point * media.zw;
  sourcePoint = p;
  float x = clamp((p.x - host.x) / host.z, 0.0, 1.0);
  p.y -= bend * (0.45 * (1.0-x) * (1.0-x) - 0.15) + abs(bend) * 0.32;
  gl_Position = vec4(p.x / viewport.x * 2.0 - 1.0, 1.0 - p.y / viewport.y * 2.0, 0.0, 1.0);
}`;
const fragmentSource = `
precision highp float;
uniform sampler2D image;
uniform vec4 clip;
uniform float opacity, radius;
uniform vec3 reveal; // center in viewport pixels and radius; zero radius disables reveal
varying vec2 uv, sourcePoint;
void main() {
  vec2 q = abs(sourcePoint - (clip.xy + clip.zw * 0.5)) - clip.zw * 0.5 + radius;
  float distance = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
  if (distance > 0.0) discard;
  // Uploaded pixels are premultiplied sRGB, matching the browser's DOM surface.
  vec4 color = texture2D(image, uv);
  if (reveal.z > 0.0) {
    float t = length(sourcePoint - reveal.xy) / reveal.z;
    // Match the CSS screen gradient and alpha mask on the undeformed surface,
    // so the colored ring follows exactly the same mesh as the image.
    vec3 tint = vec3(0.0);
    tint = mix(tint, vec3(0.0, 59.0, 109.0) / 255.0, clamp((t-.0459)/.0218, 0.0, 1.0));
    tint = mix(tint, vec3(49.0, 190.0, 255.0) / 255.0, clamp((t-.0677)/.0215, 0.0, 1.0));
    tint = mix(tint, vec3(142.0, 218.0, 255.0) / 255.0, clamp((t-.0892)/.01, 0.0, 1.0));
    tint = mix(tint, vec3(255.0, 223.0, 196.0) / 255.0, clamp((t-.0992)/.01, 0.0, 1.0));
    tint = mix(tint, vec3(230.0, 183.0, 227.0) / 255.0, clamp((t-.1092)/.01, 0.0, 1.0));
    tint = mix(tint, vec3(255.0, 240.0, 223.0) / 255.0, clamp((t-.1192)/.01, 0.0, 1.0));
    tint = mix(tint, vec3(1.0), clamp((t-.1292)/.0133, 0.0, 1.0));
    color.rgb = color.rgb + tint * (color.a - color.rgb);
    color *= 1.0 - clamp((t-.0992)/.0433, 0.0, 1.0);
  }
  gl_FragColor = color * opacity;
}`;
const source = (media: Media) => media.currentSrc || media.src;
const dimensions = (media: Media) => media instanceof HTMLVideoElement
  ? [media.videoWidth, media.videoHeight] : [media.naturalWidth, media.naturalHeight];
const ready = (media: Media) => media instanceof HTMLVideoElement ? media.readyState >= 2 : media.complete && media.naturalWidth > 0;
const rectOf = (element: Element): Rect => {
  const { left: x, top: y, width, height } = element.getBoundingClientRect();
  return { x, y, width, height };
};
const intersect = (a: Rect, b: Rect): Rect => ({ x: Math.max(a.x, b.x), y: Math.max(a.y, b.y),
  width: Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)),
  height: Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)) });

/** One viewport-sized GPU surface for all visible media, never one context per image. */
export function createScrollBendRenderer(onLost: () => void) {
  const canvas = document.createElement('canvas');
  canvas.dataset.scrollBendCanvas = '';
  canvas.setAttribute('aria-hidden', 'true');
  const surface = document.createElement('div');
  // Scroll in the same compositor layer tree as the native page. A fixed canvas
  // would lag asynchronous scrolling by a frame, separating images from captions.
  surface.setAttribute('aria-hidden', 'true');
  surface.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:0;overflow:clip;pointer-events:none;z-index:4';
  canvas.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;display:none;will-change:transform';
  surface.append(canvas);
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: true, depth: false, stencil: false });
  if (!gl) return null;
  const compile = (type: number, code: string) => {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, code); gl.compileShader(shader);
    return shader;
  };
  const program = gl.createProgram()!;
  const vertex = compile(gl.VERTEX_SHADER, vertexSource), fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
  gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
  gl.deleteShader(vertex); gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { gl.deleteProgram(program); return null; }
  gl.useProgram(program);
  const names = ['viewport', 'host', 'media', 'bend', 'clip', 'opacity', 'radius', 'reveal'] as const;
  const uniforms = Object.fromEntries(names.map(name => [name, gl.getUniformLocation(program, name)])) as Record<typeof names[number], WebGLUniformLocation>;
  // Forty-eight strips approximate the quadratic to <0.02 CSS pixels at full bend.
  const points: number[] = [];
  for (let i = 0; i < 48; i++) {
    const a = i / 48, b = (i + 1) / 48;
    points.push(a, 0, a, 1, b, 0, b, 0, a, 1, b, 1);
  }
  const buffer = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);
  const attribute = gl.getAttribLocation(program, 'point');
  gl.enableVertexAttribArray(attribute); gl.vertexAttribPointer(attribute, 2, gl.FLOAT, false, 0, 0);
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  const maxSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
  const budget = (window.innerWidth < 810 ? 64 : 128) * 1024 * 1024;
  const textures = new Map<Media, TextureEntry>();
  const rejected = new WeakMap<Media, string>();
  let bytes = 0, lost = false;
  const arrivals = new Map<HTMLElement, number>();
  // The strongest desktop bend moves an edge by 210 * .62 = 130.2px.
  const overscan = 144;
  const resize = () => {
    const width = window.innerWidth, height = window.innerHeight + overscan * 2;
    const dpr = window.devicePixelRatio || 1;
    const targetWidth = Math.round(width * dpr), targetHeight = Math.round(height * dpr);
    if (canvas.width === targetWidth && canvas.height === targetHeight) return;
    canvas.width = targetWidth; canvas.height = targetHeight;
    canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
    gl.viewport(0, 0, targetWidth, targetHeight);
  };
  // Force the first actual shader draw and backing-buffer allocation while idle.
  // Linking alone can leave driver work deferred until the first visible draw.
  const warmTexture = () => {
    gl.uniform2f(uniforms.viewport, window.innerWidth, window.innerHeight + overscan * 2);
    gl.uniform4f(uniforms.host, 0, 0, 1, 1);
    gl.uniform4f(uniforms.media, 0, 0, 1, 1);
    gl.uniform4f(uniforms.clip, 0, 0, 1, 1);
    gl.uniform1f(uniforms.bend, 0); gl.uniform1f(uniforms.radius, 0); gl.uniform1f(uniforms.opacity, 0);
    gl.drawArrays(gl.TRIANGLES, 0, points.length / 2);
    gl.flush();
  };
  const remove = (entry: TextureEntry) => {
    if (entry.callback !== undefined && entry.media instanceof HTMLVideoElement) entry.media.cancelVideoFrameCallback(entry.callback);
    gl.deleteTexture(entry.texture); textures.delete(entry.media); bytes -= entry.width * entry.height * 4;
  };
  const contextLost = (event: Event) => { event.preventDefault(); lost = true; canvas.style.display = 'none'; onLost(); };
  canvas.addEventListener('webglcontextlost', contextLost);
  document.body.append(surface);
  resize();

  const needsPreparation = (media: Media) => {
    if (lost || !ready(media) || rejected.get(media) === source(media)) return false;
    const entry = textures.get(media), [width, height] = dimensions(media);
    return !entry || entry.src !== source(media) || entry.width !== width || entry.height !== height;
  };

  const prepare = (media: Media) => {
    if (!needsPreparation(media)) return;
    const [width, height] = dimensions(media);
    const existing = textures.get(media);
    if (existing?.src === source(media) && existing.width === width && existing.height === height) return;
    if (existing) remove(existing);
    // Oversized or cross-origin media keep the native DOM path, never a blurry copy.
    if (width > maxSize || height > maxSize || width * height * 4 > budget) { rejected.set(media, source(media)); return; }
    const url = new URL(source(media), location.href);
    if (url.origin !== location.origin && url.protocol !== 'blob:' && url.protocol !== 'data:' && !media.crossOrigin) {
      rejected.set(media, source(media)); return;
    }
    const now = performance.now();
    for (const entry of [...textures.values()].sort((a, b) => a.used - b.used)) {
      if (bytes + width * height * 4 <= budget) break;
      if (now - entry.used > 1000) remove(entry);
    }
    if (bytes + width * height * 4 > budget) return;
    const texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, media); }
    catch { gl.deleteTexture(texture); rejected.set(media, source(media)); return; }
    const entry: TextureEntry = { media, texture, src: source(media), width, height, used: now, dirty: false, time: -1 };
    if (media instanceof HTMLVideoElement && 'requestVideoFrameCallback' in media) {
      const frame = () => { entry.dirty = true; entry.callback = media.requestVideoFrameCallback(frame); };
      entry.callback = media.requestVideoFrameCallback(frame);
    }
    textures.set(media, entry); bytes += width * height * 4;
    canvas.dataset.textureBytes = String(bytes);
    warmTexture();
  };

  const readLayers = (host: HTMLElement, hostRect: Rect): Layer[] | null => {
    const layers: Layer[] = [];
    for (const media of host.querySelectorAll<Media>('img,video')) {
      const style = getComputedStyle(media);
      let opacity = Number(style.opacity), order = Number(style.zIndex) || 0;
      let clip = hostRect, radius = 0;
      for (let parent = media.parentElement; parent && parent !== host; parent = parent.parentElement) {
        const style = getComputedStyle(parent);
        opacity *= Number(style.opacity); order += Number(style.zIndex) || 0;
        if (style.overflow !== 'visible') {
          const box = rectOf(parent); clip = intersect(clip, box);
          radius = Math.max(radius, parseFloat(style.borderTopLeftRadius) * (style.borderTopLeftRadius.includes('%') ? box.width / 100 : 1) || 0);
        }
      }
      if (opacity < .001 || style.display === 'none') continue;
      const entry = textures.get(media);
      const [sourceWidth, sourceHeight] = dimensions(media);
      if (!entry || entry.src !== source(media) || !ready(media) || entry.width !== sourceWidth || entry.height !== sourceHeight) return null;
      const box = rectOf(media);
      let { width, height } = box;
      if (style.objectFit === 'contain' || style.objectFit === 'cover') {
        const scale = (style.objectFit === 'contain' ? Math.min : Math.max)(width / entry.width, height / entry.height);
        width = entry.width * scale; height = entry.height * scale;
      }
      const position = style.objectPosition.split(' ');
      const offset = (value: string | undefined, space: number) => value?.endsWith('%') ? parseFloat(value) / 100 * space : parseFloat(value ?? '0') || 0;
      const rect = { x: box.x + offset(position[0], box.width - width), y: box.y + offset(position[1], box.height - height), width, height };
      clip = intersect(clip, box);
      layers.push({ entry, rect, clip, radius: Math.min(radius, clip.width / 2, clip.height / 2), opacity, order });
    }
    return layers.length ? layers.sort((a, b) => a.order - b.order) : null;
  };
  const draw = (hosts: HTMLElement[], bend: number) => {
    const drawn = new Set<HTMLElement>();
    if (lost) return drawn;
    const width = window.innerWidth, height = window.innerHeight;
    const renderHeight = height + overscan * 2;
    const documentHeight = document.body.offsetHeight;
    const scrollTop = window.scrollY;
    resize();
    // All layout/style reads happen before source visibility or canvas writes.
    const batches = hosts.flatMap(host => {
      const box = rectOf(host);
      const entrance = host.closest<HTMLElement>('.case-chapter');
      const masked = !!host.style.maskImage && host.style.maskImage !== 'none';
      const style = masked ? getComputedStyle(host) : null;
      const diameter = parseFloat(style?.getPropertyValue('--cover-reveal-size') ?? '');
      const position = style?.getPropertyValue('--cover-reveal-position').trim().split(/\s+/);
      const offsetY = parseFloat(position?.[1] ?? '');
      const reveal = masked && Number.isFinite(diameter) && Number.isFinite(offsetY)
        ? [box.x + box.width / 2, box.y + offsetY + diameter / 2 + overscan, diameter / 2] : [0, 0, 0];
      if (!box.width || !box.height || box.y > height + overscan || box.y + box.height < -overscan ||
          (masked && !reveal[2]) || host.hasAttribute('data-work-transferred')) return [];
      const layers = readLayers(host, box);
      const opacity = entrance?.style.opacity ? Number(entrance.style.opacity) : 1;
      return layers ? [{ host, box, layers, reveal, opacity }] : [];
    });
    // Clip the overscan to the document so it cannot increase scroll height.
    surface.style.height = `${documentHeight}px`;
    canvas.style.transform = `translate3d(0,${scrollTop - overscan}px,0)`;
    gl.clear(gl.COLOR_BUFFER_BIT); gl.uniform2f(uniforms.viewport, width, renderHeight);
    // Update video pixels only when a new decoded frame arrives, before draw calls.
    const now = performance.now();
    for (const { layers } of batches) for (const { entry } of layers) {
      entry.used = now;
      const media = entry.media;
      const animatedImage = media instanceof HTMLImageElement && /\.(gif|apng)(?:[?#]|$)/i.test(entry.src);
      if (animatedImage || (media instanceof HTMLVideoElement && (entry.dirty || (entry.callback === undefined && entry.time !== media.currentTime)))) {
        gl.bindTexture(gl.TEXTURE_2D, entry.texture);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, media);
        entry.dirty = false; if (media instanceof HTMLVideoElement) entry.time = media.currentTime;
      }
    }
    for (const { host, box, layers, reveal, opacity: hostOpacity } of batches) {
      // Ease the first prepared frame into the curve, including during reveal.
      if (!arrivals.has(host)) arrivals.set(host, now);
      const progress = Math.min(1, (now - arrivals.get(host)!) / 140);
      gl.uniform1f(uniforms.bend, bend * progress * progress * (3 - 2 * progress));
      gl.uniform3f(uniforms.reveal, reveal[0], reveal[1], reveal[2]);
      gl.uniform4f(uniforms.host, box.x, box.y + overscan, box.width, box.height);
      for (const { entry, rect, clip, radius, opacity } of layers) {
        gl.bindTexture(gl.TEXTURE_2D, entry.texture);
        gl.uniform4f(uniforms.media, rect.x, rect.y + overscan, rect.width, rect.height);
        gl.uniform4f(uniforms.clip, clip.x, clip.y + overscan, clip.width, clip.height);
        gl.uniform1f(uniforms.radius, radius); gl.uniform1f(uniforms.opacity, opacity * hostOpacity);
        gl.drawArrays(gl.TRIANGLES, 0, points.length / 2);
      }
      drawn.add(host);
    }
    arrivals.forEach((_time, host) => { if (!drawn.has(host)) arrivals.delete(host); });
    canvas.style.display = drawn.size ? 'block' : 'none';
    canvas.dataset.visibleMedia = String(drawn.size);
    return drawn;
  };
  return {
    needsPreparation,
    prepare,
    resize,
    draw,
    hide() { canvas.style.display = 'none'; arrivals.clear(); },
    dispose() {
      canvas.removeEventListener('webglcontextlost', contextLost);
      textures.forEach(remove); gl.deleteBuffer(buffer); gl.deleteProgram(program);
      gl.getExtension('WEBGL_lose_context')?.loseContext(); surface.remove();
    },
  };
}
