import * as THREE from "three";
import { gsap } from "@/lib/gsap";
import atlasItems from "../../public/assets/activity-sphere/atlas.json";

export type SphereParameters = {
  speed: number;
  imageSize: number;
  spacing: number;
  sphereSize: number;
  depth: number;
  count: number;
};
export const sphereDefaults: SphereParameters = {
  speed: 1, imageSize: 1, spacing: 1, sphereSize: 1, depth: 1, count: 294,
};

const MAX_CARDS = 1200;
const vertexShader = `
  attribute vec3 instanceCenter;
  attribute vec2 instanceSize;
  attribute vec2 instanceAtlas;
  attribute float instanceId;
  uniform float phase;
  uniform vec2 rotation;
  uniform float sphereSize;
  uniform float spacing;
  uniform float imageSize;
  uniform float depthStrength;
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
    float near=clamp((center.z+0.65)/1.3,0.0,1.0);
    float size=mix(1.0,0.12+pow(near,2.4)*1.12,depthStrength);
    brightness=mix(1.0,0.65+near*0.35,depthStrength);
    vec4 viewCenter=modelViewMatrix*vec4(center*sphereSize*spacing,1.0);
    // Billboards face the camera. Their true z stays in the depth buffer;
    // a fixed tiny offset breaks exact ties without reordering the cards.
    viewCenter.z+=instanceId*0.000001;
    viewCenter.xy+=position.xy*instanceSize*imageSize*size*sphereSize;
    gl_Position=projectionMatrix*viewCenter;
    atlasUv=instanceAtlas+uv*vec2(384.0/2716.0,384.0/2328.0);
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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
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
    atlasOffsets[i * 2] = ((image % 7) * 388 + 2) / 2716;
    atlasOffsets[i * 2 + 1] = 1 - (Math.floor(image / 7) * 388 + 386) / 2328;
    ids[i] = i;
  }
  let disposed = false;
  let loaded = false;
  const texture = new THREE.TextureLoader().load("/assets/activity-sphere/atlas.webp", () => {
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
    atlas: { value: texture }, phase: { value: 0 }, rotation: { value: new THREE.Vector2(0.35, -0.25) },
    sphereSize: { value: 1 }, spacing: { value: 1 }, imageSize: { value: 1 }, depthStrength: { value: 1 },
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
  let dirty = true;
  let contextLost = false;
  let lastPhase = -1;
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
      centers.set([x, y, z], i * 3);
      const baseHeight = 0.24;
      sizes.set([baseHeight * atlasItems[(i * 17) % 42].aspect, baseHeight], i * 2);
    }
    centerAttribute.needsUpdate = true;
    sizeAttribute.needsUpdate = true;
    geometry.instanceCount = count;
    canvas.dataset.cards = String(count);
  }
  updateDensity();

  const resize = new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.position.z = 1.65 / Math.tan(THREE.MathUtils.degToRad(19)) / Math.min(1, camera.aspect);
    camera.updateProjectionMatrix();
    dirty = true;
  });
  resize.observe(canvas);

  const tick = () => {
    if (disposed || !loaded || contextLost || document.hidden) return;
    if (!dirty && clock.phase === lastPhase && !gsap.isTweening(parameters) && !gsap.isTweening(orientation)) return;
    updateDensity();
    uniforms.phase.value = clock.phase;
    uniforms.rotation.value.set(orientation.yaw, orientation.pitch);
    uniforms.sphereSize.value = parameters.sphereSize;
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
    setParameters(values: Partial<SphereParameters>) {
      const { speed, ...visual } = values;
      if (speed !== undefined) { parameters.speed = speed; syncPlayback(); }
      if (Object.keys(visual).length) gsap.to(parameters, { ...visual, duration: 0.35, ease: "power2.out", overwrite: "auto", onUpdate: () => { dirty = true; } });
    },
    setPlaying(value: boolean) { playing = value; dirty = true; syncPlayback(); },
    setDragging(value: boolean) { dragging = value; syncPlayback(); },
    rotate(dx: number, dy: number) { targetYaw += dx; targetPitch += dy; yawTo(targetYaw); pitchTo(targetPitch); dirty = true; },
    reset() {
      tween.pause().time(0);
      targetYaw = 0.35; targetPitch = -0.25;
      yawTo(targetYaw); pitchTo(targetPitch);
      dirty = true;
      syncPlayback();
    },
    async exportPng() {
      if (!loaded || contextLost || disposed) throw new Error("图片尚未准备好");
      // Capture this exact view immediately, before the next animation tick.
      renderer.render(scene, camera);
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((value) => value ? resolve(value) : reject(new Error("导出失败")), "image/png");
      });
      return blob;
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
