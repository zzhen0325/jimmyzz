import * as THREE from "three";
import { gsap } from "@/lib/gsap";
import atlasItems from "../../public/assets/activity-sphere/atlas.json";
import { exportSpherePng } from "@/lib/activity-sphere-export";

export const activityImageCount = atlasItems.length;
const ATLAS_PADDING = 4;
const ATLAS_COLUMNS = Math.ceil(Math.sqrt(activityImageCount));
const ATLAS_ROWS = Math.ceil(activityImageCount / ATLAS_COLUMNS);

export type ActivityLayout = "sphere" | "orbit";

export type SphereParameters = {
  orbitTilt: number;
  orbitDepth: number;
  direction: number;
  speed: number;
  imageSize: number;
  spacing: number;
  sphereSize: number;
  sphereWidth: number;
  sphereHeight: number;
  depth: number;
  count: number;
};
export const sphereDefaults: SphereParameters = {
  orbitTilt: -18, orbitDepth: 0.33, direction: 1,
  speed: 1, imageSize: 1, spacing: 1, sphereSize: 1, sphereWidth: 1, sphereHeight: 1, depth: 1, count: 294,
};

export const orbitDefaults: SphereParameters = { ...sphereDefaults, count: 16 };

const MAX_CARDS = 1200;
const vertexShader = `
  attribute vec3 instanceCenter;
  attribute vec2 instanceSize;
  attribute vec2 instanceAtlas;
  attribute float instanceId;
  uniform float phase;
  uniform float orbitPhase;
  uniform float orbitMode;
  uniform float orbitTilt;
  uniform float orbitDepth;
  uniform vec2 rotation;
  uniform float sphereSize;
  uniform vec2 sphereShape;
  uniform float spacing;
  uniform float imageSize;
  uniform float depthStrength;
  uniform vec2 atlasTileSize;
  varying vec2 atlasUv;
  varying float brightness;
  vec3 rotateX(vec3 p, float a) {
    float c=cos(a), s=sin(a);
    return vec3(p.x, c*p.y-s*p.z, s*p.y+c*p.z);
  }
  vec3 rotateY(vec3 p, float a) {
    float c=cos(a), s=sin(a);
    return vec3(c*p.x+s*p.z, p.y, c*p.z-s*p.x);
  }
  vec3 rotateZ(vec3 p, float a) {
    float c=cos(a), s=sin(a);
    return vec3(c*p.x-s*p.y, s*p.x+c*p.y, p.z);
  }
  void main() {
    vec3 center=rotateZ(instanceCenter,sin(phase*0.1)*0.05);
    center=rotateY(center,rotation.x+phase*0.5);
    center=rotateX(center,rotation.y+sin(phase*0.2)*0.12);
    if (orbitMode > 0.5) {
      // Rotate around the ring, then tilt its plane. Cards remain upright billboards.
      float angle=instanceCenter.x+orbitPhase+rotation.x;
      center=vec3(cos(angle)*2.0, -sin(angle)*orbitDepth, sin(angle)*0.65);
      center=rotateX(center,rotation.y);
      center=rotateZ(center,-orbitTilt);
    }
    float near=clamp((center.z+0.65)/1.3,0.0,1.0);
    float size=mix(1.0,0.12+pow(near,2.4)*1.12,depthStrength);
    brightness=mix(1.0,0.65+near*0.35,depthStrength);
    if (orbitMode > 0.5) {
      size=mix(1.0,mix(0.72,1.12,near),depthStrength);
      brightness=1.0;
    }
    center.xy*=sphereShape;
    vec4 viewCenter=modelViewMatrix*vec4(center*sphereSize*spacing,1.0);
    // Billboards face the camera. Their true z stays in the depth buffer;
    // a fixed tiny offset breaks exact ties without reordering the cards.
    viewCenter.z+=instanceId*0.000001;
    viewCenter.xy+=position.xy*instanceSize*imageSize*size*sphereSize;
    gl_Position=projectionMatrix*viewCenter;
    atlasUv=instanceAtlas+uv*atlasTileSize;
  }
`;
const fragmentShader = `
  uniform sampler2D atlas;
  varying vec2 atlasUv;
  varying float brightness;
  void main() {
    vec4 color=texture2D(atlas,atlasUv);
    if(color.a<0.5) discard;
    gl_FragColor=vec4(color.rgb*brightness,1.0);
    #include <colorspace_fragment>
  }
`;

export function createActivitySphere(canvas: HTMLCanvasElement, onReady: () => void, onError: (message: string) => void) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Preserve every source pixel on supported GPUs; keep a lossless fallback
  // within the 4096px texture limit of smaller devices.
  const nativeAtlas = renderer.capabilities.maxTextureSize >= Math.max(1088 * ATLAS_COLUMNS, 1668 * ATLAS_ROWS);
  const tileWidth = nativeAtlas ? 1080 : 640;
  const tileHeight = nativeAtlas ? 1660 : 984;
  const cellWidth = tileWidth + ATLAS_PADDING * 2;
  const cellHeight = tileHeight + ATLAS_PADDING * 2;
  const atlasWidth = cellWidth * ATLAS_COLUMNS;
  const atlasHeight = cellHeight * ATLAS_ROWS;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 30);
  const plane = new THREE.PlaneGeometry(1, 1);
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.index = plane.index;
  geometry.attributes.position = plane.attributes.position;
  geometry.attributes.uv = plane.attributes.uv;
  const centers = new Float32Array(MAX_CARDS * 3);
  const sizes = new Float32Array(MAX_CARDS * 2);
  const atlasOffsets = new Float32Array(MAX_CARDS * 2);
  const ids = new Float32Array(MAX_CARDS);
  const centerAttribute = new THREE.InstancedBufferAttribute(centers, 3).setUsage(THREE.DynamicDrawUsage);
  const sizeAttribute = new THREE.InstancedBufferAttribute(sizes, 2).setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("instanceCenter", centerAttribute);
  geometry.setAttribute("instanceSize", sizeAttribute);
  geometry.setAttribute("instanceAtlas", new THREE.InstancedBufferAttribute(atlasOffsets, 2));
  geometry.setAttribute("instanceId", new THREE.InstancedBufferAttribute(ids, 1));
  for (let i = 0; i < MAX_CARDS; i++) {
    const image = (i * 17) % atlasItems.length;
    atlasOffsets[i * 2] = ((image % ATLAS_COLUMNS) * cellWidth + ATLAS_PADDING) / atlasWidth;
    atlasOffsets[i * 2 + 1] = 1 - (Math.floor(image / ATLAS_COLUMNS) * cellHeight + ATLAS_PADDING + tileHeight) / atlasHeight;
    ids[i] = i;
  }
  let disposed = false;
  let loaded = false;
  const atlasPath = nativeAtlas ? "atlas-native.webp" : "atlas-compatible.webp";
  const texture = new THREE.TextureLoader().load(`/assets/activity-sphere/${atlasPath}?v=figma-141-37`, () => {
    if (disposed) { texture.dispose(); return; }
    loaded = true;
    canvas.dataset.ready = "true";
    onReady();
  }, undefined, () => { if (!disposed) onError("图片载入失败，请刷新重试"); });
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  const uniforms = {
    orbitMode: { value: 0 }, orbitPhase: { value: 0 }, orbitTilt: { value: -Math.PI / 10 },
    orbitDepth: { value: 0.33 },
    atlas: { value: texture }, phase: { value: 0 }, rotation: { value: new THREE.Vector2(0.35, -0.25) },
    sphereSize: { value: 1 }, spacing: { value: 1 }, imageSize: { value: 1 }, depthStrength: { value: 1 },
    sphereShape: { value: new THREE.Vector2(1, 1) },
    atlasTileSize: { value: new THREE.Vector2(tileWidth / atlasWidth, tileHeight / atlasHeight) },
  };
  const material = new THREE.ShaderMaterial({
    uniforms, vertexShader, fragmentShader,
    depthTest: true, depthWrite: true, transparent: false, side: THREE.DoubleSide,
  });
  const cloud = new THREE.Mesh(geometry, material);
  cloud.frustumCulled = false;
  scene.add(cloud);
  const parameters = { ...sphereDefaults };
  const orientation = { yaw: 0.35, pitch: -0.25 };
  const clock = { phase: 0 };
  const tween = gsap.to(clock, { phase: Math.PI * 20, duration: Math.PI * 20 / 0.8, ease: "none", repeat: -1 });
  const playback = { rate: 1 };
  const yawTo = gsap.quickTo(orientation, "yaw", { duration: 0.45, ease: "power3.out" });
  const pitchTo = gsap.quickTo(orientation, "pitch", { duration: 0.45, ease: "power3.out" });
  let targetYaw = orientation.yaw;
  let targetPitch = orientation.pitch;
  let playing = true;
  let dragging = false;
  let count = 0;
  let layout: ActivityLayout = "sphere";
  let dirty = true;
  let contextLost = false;
  let lastPhase = -1;
  let lastOrbitTime = 0;
  let orbitPhase = 0;
  let frames = 0;
  let fpsStart = performance.now();

  function updateDensity() {
    const nextCount = Math.max(12, Math.min(MAX_CARDS, Math.round(parameters.count)));
    if (nextCount === count) return;
    count = nextCount;
    for (let i = 0; i < count; i++) {
      const angle = i * Math.PI * (3 - Math.sqrt(5));
      const y = 1 - 2 * (i + 0.5) / count;
      const ring = Math.sqrt(1 - y * y);
      const x = Math.cos(angle) * ring;
      const z = Math.sin(angle) * ring;
      centers.set(layout === "orbit" ? [i / count * Math.PI * 2, 0, 0] : [x, y, z], i * 3);
      const baseHeight = layout === "orbit" ? 0.96 : 0.24;
      sizes.set([baseHeight * atlasItems[(i * 17) % activityImageCount].aspect, baseHeight], i * 2);
    }
    centerAttribute.needsUpdate = true;
    sizeAttribute.needsUpdate = true;
    geometry.instanceCount = count;
    canvas.dataset.cards = String(count);
  }
  updateDensity();

  function fitCamera() {
    const extent = layout === "orbit" ? Math.max(1.65, 2.6 / camera.aspect) : 1.65 / Math.min(1, camera.aspect);
    camera.position.z = extent / Math.tan(THREE.MathUtils.degToRad(19));
    camera.updateProjectionMatrix();
  }
  const resize = new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    fitCamera();
    dirty = true;
  });
  resize.observe(canvas);

  const tick = () => {
    if (disposed || !loaded || contextLost || document.hidden) return;
    if (!dirty && clock.phase === lastPhase && !gsap.isTweening(parameters) && !gsap.isTweening(orientation)) return;
    updateDensity();
    uniforms.phase.value = clock.phase;
    const orbitTime = tween.totalTime();
    orbitPhase = (orbitPhase + (orbitTime - lastOrbitTime) * Math.PI / 6 * parameters.direction) % (Math.PI * 2);
    lastOrbitTime = orbitTime;
    uniforms.orbitPhase.value = orbitPhase;
    uniforms.orbitTilt.value = THREE.MathUtils.degToRad(parameters.orbitTilt);
    uniforms.orbitDepth.value = parameters.orbitDepth;
    uniforms.rotation.value.set(orientation.yaw, orientation.pitch);
    uniforms.sphereSize.value = parameters.sphereSize;
    uniforms.sphereShape.value.set(parameters.sphereWidth, parameters.sphereHeight);
    uniforms.spacing.value = parameters.spacing;
    uniforms.imageSize.value = parameters.imageSize;
    uniforms.depthStrength.value = parameters.depth;
    renderer.render(scene, camera);
    lastPhase = clock.phase;
    dirty = false;
    frames++;
    const now = performance.now();
    if (now - fpsStart > 1000) {
      canvas.dataset.fps = String(Math.round(frames * 1000 / (now - fpsStart)));
      canvas.dataset.drawCalls = String(renderer.info.render.calls);
      canvas.dataset.triangles = String(renderer.info.render.triangles);
      fpsStart = now; frames = 0;
    }
  };
  gsap.ticker.add(tick);
  const syncPlayback = () => {
    if (document.hidden || contextLost) {
      tween.pause();
      gsap.killTweensOf(playback);
      return;
    }
    tween.resume();
    gsap.to(playback, {
      rate: playing && !dragging ? parameters.speed : 0,
      duration: 0.65, ease: "sine.inOut", overwrite: true,
      onUpdate: () => { tween.timeScale(playback.rate); dirty = true; },
    });
  };
  const onLost = (event: Event) => { event.preventDefault(); contextLost = true; syncPlayback(); onError("图形上下文已暂停，正在恢复…"); };
  const onRestored = () => { contextLost = false; dirty = true; syncPlayback(); onReady(); };
  const onVisibility = () => { dirty = true; frames = 0; fpsStart = performance.now(); syncPlayback(); };
  canvas.addEventListener("webglcontextlost", onLost);
  canvas.addEventListener("webglcontextrestored", onRestored);
  document.addEventListener("visibilitychange", onVisibility);

  return {
    setLayout(value: ActivityLayout, values: SphereParameters) {
      layout = value;
      gsap.killTweensOf(parameters);
      Object.assign(parameters, values);
      uniforms.orbitMode.value = value === "orbit" ? 1 : 0;
      canvas.dataset.layout = value;
      count = 0;
      updateDensity();
      fitCamera();
      this.reset();
    },
    setParameters(values: Partial<SphereParameters>) {
      const { speed, ...visual } = values;
      if (speed !== undefined) { parameters.speed = speed; syncPlayback(); }
      if (Object.keys(visual).length) gsap.to(parameters, { ...visual, duration: 0.35, ease: "power2.out", overwrite: "auto", onUpdate: () => { dirty = true; } });
    },
    setPlaying(value: boolean) { playing = value; dirty = true; syncPlayback(); },
    setDragging(value: boolean) { dragging = value; syncPlayback(); },
    rotate(dx: number, dy: number) { targetYaw += dx; targetPitch += dy; yawTo(targetYaw); pitchTo(targetPitch); dirty = true; },
    reset() {
      tween.pause().totalTime(0);
      orbitPhase = 0; lastOrbitTime = 0;
      targetYaw = layout === "orbit" ? 0 : 0.35; targetPitch = layout === "orbit" ? 0 : -0.25;
      yawTo(targetYaw); pitchTo(targetPitch);
      dirty = true;
      syncPlayback();
    },
    async exportPng(longEdge = 8192, trim = true) {
      if (!loaded || contextLost || disposed) throw new Error("图片尚未准备好");
      return exportSpherePng(geometry, material, camera, renderer.getSize(new THREE.Vector2()),
        atlasItems.map(item => `/assets/activity-sphere/${item.name}`), longEdge, trim);
    },
    dispose() {
      disposed = true;
      tween.kill(); yawTo.tween.kill(); pitchTo.tween.kill();
      gsap.killTweensOf(parameters);
      gsap.killTweensOf(playback);
      gsap.ticker.remove(tick);
      resize.disconnect();
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      document.removeEventListener("visibilitychange", onVisibility);
      geometry.dispose(); plane.dispose(); material.dispose(); texture.dispose(); renderer.dispose();
    },
  };
}
