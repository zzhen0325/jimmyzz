import { gsap } from "@/lib/gsap";
import {
  Color, Euler, Group, MathUtils, Mesh, PerspectiveCamera, PlaneGeometry,
  Quaternion, Raycaster, Scene, ShaderMaterial, Sphere, SRGBColorSpace,
  Texture, Vector2, Vector3, WebGLRenderer,
} from "three";

export type GalleryImage = {
  src: string;
  width: number;
  height: number;
  title: string;
  project: string;
};
export type CurveScene = {
  setAutomatic: (value: boolean) => void;
  setActive: (value: boolean) => void;
  nudge: (amount: number) => void;
  dispose: () => void;
};

// Measured against the active Sphere preset and public runtime, 2026-09-06.
// These are world-space values, not CSS percentages or pixel dimensions.
export const spherePreset = {
  count: 51, radius: 10, imageSize: 2.5, imageScale: 1.3,
  randomSizeMin: 0.85, randomSizeMax: 1.25,
  roundness: 0.17, borderPx: 3, borderWorldUnit: 0.03,
  imageHoverScale: 1.5, sphereScale: 0.55, sphereHoverScale: 1.1,
  rotation: { x: -108, y: -119, z: 0 }, speed: 0.5,
  depthFadeStrength: 0.75, depthFadeRange: 1,
  cameraFov: 45, cameraHalfHeight: 11.5,
} as const;

// Depth fade affects RGB only: a dim rear card must still occlude cards behind it.
const vertexShader = `
  varying vec2 cardUv;
  void main() {
    cardUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const fragmentShader = `
  uniform sampler2D imageMap;
  uniform vec2 crop;
  uniform vec3 tint;
  uniform vec3 background;
  uniform float useImage;
  uniform float fade;
  uniform float roundness;
  varying vec2 cardUv;
  void main() {
    vec2 q = abs(cardUv - 0.5) - vec2(0.5 - roundness * 0.5);
    float distanceToEdge = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - roundness * 0.5;
    float mask = 1.0 - smoothstep(0.0, 0.005, distanceToEdge);
    vec2 imageUv = clamp((cardUv - 0.5) * crop + 0.5, 0.001, 0.999);
    vec4 texel = texture2D(imageMap, imageUv);
    float alpha = mix(1.0, texel.a, useImage) * mask;
    if (alpha < 0.02) discard;
    vec3 rgb = mix(tint, texel.rgb, useImage);
    gl_FragColor = vec4(mix(rgb, background, fade), alpha);
    #include <colorspace_fragment>
  }
`;

// The reference derives its border from the dominant image color, then shifts
// HSL lightness by 0.1. Quantization avoids isolated highlight pixels dominating.
function borderColor(image: HTMLImageElement) {
  const sampler = document.createElement("canvas");
  sampler.width = 48;
  sampler.height = Math.max(1, Math.round(48 * image.naturalHeight / image.naturalWidth));
  const context = sampler.getContext("2d")!;
  context.drawImage(image, 0, 0, sampler.width, sampler.height);
  const pixels = context.getImageData(0, 0, sampler.width, sampler.height).data;
  const buckets = new Map<number, { count: number; r: number; g: number; b: number }>();
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 128) continue;
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    const key = (r >> 5) * 64 + (g >> 5) * 8 + (b >> 5);
    const bucket = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
    bucket.count++; bucket.r += r; bucket.g += g; bucket.b += b;
    buckets.set(key, bucket);
  }
  const dominant = [...buckets.values()].sort((a, b) => b.count - a.count)[0];
  const color = new Color(0x888888);
  if (dominant) color.setRGB(dominant.r / dominant.count / 255, dominant.g / dominant.count / 255, dominant.b / dominant.count / 255, SRGBColorSpace);
  const hsl = color.getHSL({ h: 0, s: 0, l: 0 }, SRGBColorSpace);
  return color.setHSL(hsl.h, hsl.s, MathUtils.clamp(hsl.l + (hsl.l > 0.5 ? -0.1 : 0.1), 0.08, 0.92), SRGBColorSpace);
}

export async function createCurveScene(host: HTMLElement, images: GalleryImage[], onSelect: (index: number) => void): Promise<CurveScene> {
  if (!images.length) throw new Error("The gallery needs images");
  const loaded = await Promise.all(images.map(async asset => {
    const image = new Image();
    image.src = asset.src;
    await image.decode();
    return image;
  }));
  const renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = SRGBColorSpace;
  const canvas = renderer.domElement;
  canvas.className = "curve-sphere-canvas";
  canvas.tabIndex = 0;
  canvas.setAttribute("role", "button");
  canvas.setAttribute("aria-label", "球体作品画廊；拖动旋转，方向键漫游，回车查看前方作品。也可切换平铺浏览。");
  host.append(canvas);
  const world = new Scene();
  const sphere = new Group();
  world.add(sphere);
  const camera = new PerspectiveCamera(spherePreset.cameraFov, 1, 0.1, 1000);
  const cameraDistance = spherePreset.cameraHalfHeight / Math.tan(MathUtils.degToRad(spherePreset.cameraFov / 2));
  camera.position.z = cameraDistance;
  const geometry = new PlaneGeometry(1, 1);
  const textures = loaded.map(image => {
    const texture = new Texture(image);
    texture.colorSpace = SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  });
  const colors = loaded.map(borderColor);
  const background = new Color("#090909");
  const makeMaterial = (index: number, border: boolean) => {
    const aspect = images[index].width / images[index].height;
    return new ShaderMaterial({
      vertexShader, fragmentShader, transparent: true, depthWrite: false, depthTest: true,
      uniforms: {
        imageMap: { value: textures[index] },
        crop: { value: new Vector2(Math.min(1, 1 / aspect), Math.min(1, aspect)) },
        tint: { value: colors[index] }, background: { value: background },
        useImage: { value: border ? 0 : 1 }, fade: { value: 0 },
        roundness: { value: spherePreset.roundness },
      },
    });
  };
  const cards = Array.from({ length: spherePreset.count }, (_, index) => {
    const imageIndex = index % images.length;
    const latitude = 1 - 2 * index / (spherePreset.count - 1);
    const ringRadius = Math.sqrt(Math.max(0, 1 - latitude * latitude));
    const longitude = index * Math.PI * (3 - Math.sqrt(5));
    const group = new Group();
    group.position.set(Math.cos(longitude) * ringRadius, latitude, Math.sin(longitude) * ringRadius).multiplyScalar(spherePreset.radius);
    const baseScale = MathUtils.lerp(spherePreset.randomSizeMin, spherePreset.randomSizeMax, Math.random());
    group.scale.setScalar(baseScale);
    const image = new Mesh(geometry, makeMaterial(imageIndex, false));
    const border = new Mesh(geometry, makeMaterial(imageIndex, true));
    const side = spherePreset.imageSize * spherePreset.imageScale;
    image.scale.set(side, side, 1);
    const borderWidth = spherePreset.borderPx * spherePreset.borderWorldUnit / baseScale;
    border.scale.set(side + 2 * borderWidth, side + 2 * borderWidth, 1);
    border.position.z = -0.01;
    image.userData.cardIndex = index;
    group.add(border, image);
    sphere.add(group);
    return { group, image, border, baseScale, imageIndex, worldPosition: new Vector3() };
  });
  const meshTargets = cards.map(card => card.image);
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const hitSphere = new Sphere();
  const spinAxis = new Vector3(1, 0, 0);
  const spinRotation = new Quaternion();
  const viewRotation = new Quaternion();
  const billboard = new Quaternion();
  const viewEuler = new Euler(0, 0, 0, "XYZ");
  const state = { angle: 0, pitch: spherePreset.rotation.x as number, yaw: spherePreset.rotation.y as number, sphereHover: 1 };
  let width = 0, height = 0;
  let active = true, automatic = true, disposed = false, pointerInside = false;
  let contextLost = false;
  let dragging = false, dragged = false, pointerX = 0, pointerY = 0;
  let hovered = -1;
  const nudgeTo = gsap.quickTo(state, "angle", { duration: 0.6, ease: "power3.out" });
  let nudging = false;
  const nudge = (amount: number) => {
    nudging = true;
    nudgeTo(state.angle + amount * Math.PI * 2);
    nudgeTo.tween.eventCallback("onComplete", () => { nudging = false; });
  };
  const resize = () => {
    width = host.clientWidth;
    height = host.clientHeight;
    renderer.setSize(width, height);
    camera.aspect = width / Math.max(height, 1);
    // Preserve the source's camera on desktop; fit the entire sphere on phones.
    camera.position.z = cameraDistance * Math.max(1, 0.7 / camera.aspect);
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  const render = (_time: number, delta: number) => {
    if (disposed || !active || contextLost || document.hidden) return;
    const dt = Math.min(delta / 1000, 0.05);
    const damping = 1 - Math.pow(0.0025, dt);
    if (automatic && !dragging && !nudging) state.angle += spherePreset.speed * dt;
    viewEuler.set(MathUtils.degToRad(state.pitch), MathUtils.degToRad(state.yaw), MathUtils.degToRad(spherePreset.rotation.z));
    viewRotation.setFromEuler(viewEuler);
    spinRotation.setFromAxisAngle(spinAxis, state.angle);
    sphere.quaternion.copy(viewRotation).multiply(spinRotation);
    sphere.scale.setScalar(spherePreset.sphereScale * state.sphereHover);
    billboard.copy(sphere.quaternion).invert().multiply(camera.quaternion);
    cards.forEach(card => card.group.quaternion.copy(billboard));
    world.updateMatrixWorld(true);
    camera.updateMatrixWorld();
    hovered = -1;
    let overSphere = false;
    if (pointerInside && !dragging) {
      raycaster.setFromCamera(pointer, camera);
      hitSphere.radius = (spherePreset.radius + 1.5 * spherePreset.imageScale) * spherePreset.sphereScale * state.sphereHover;
      overSphere = raycaster.ray.intersectsSphere(hitSphere);
      const hit = raycaster.intersectObjects(meshTargets, false)[0];
      if (hit) hovered = hit.object.userData.cardIndex;
    }
    state.sphereHover = MathUtils.lerp(state.sphereHover, overSphere ? spherePreset.sphereHoverScale : 1, damping);
    cards.forEach((card, index) => {
      const target = card.baseScale * (index === hovered ? spherePreset.imageHoverScale : 1);
      card.group.scale.setScalar(MathUtils.lerp(card.group.scale.x, target, damping));
      card.group.getWorldPosition(card.worldPosition);
      // Smoothstep starts at the center plane. The entire front hemisphere stays
      // fully colored; rear depth is measured in world units (range = 10).
      const fade = MathUtils.smoothstep(-card.worldPosition.z, 0, spherePreset.radius * spherePreset.depthFadeRange) * spherePreset.depthFadeStrength;
      card.image.material.uniforms.fade.value = fade;
      card.border.material.uniforms.fade.value = fade;
    });
    canvas.style.cursor = dragging ? "grabbing" : hovered >= 0 ? "zoom-in" : "grab";
    renderer.render(world, camera);
  };
  const move = (event: PointerEvent) => {
    const bounds = host.getBoundingClientRect();
    pointer.set((event.clientX - bounds.left) / width * 2 - 1, 1 - (event.clientY - bounds.top) / height * 2);
    pointerInside = true;
    if (dragging) {
      const dx = event.clientX - pointerX, dy = event.clientY - pointerY;
      if (Math.abs(dx) + Math.abs(dy) > 2) dragged = true;
      state.yaw += MathUtils.radToDeg(dx * 0.006);
      state.pitch += MathUtils.radToDeg(dy * 0.006);
    }
    pointerX = event.clientX; pointerY = event.clientY;
  };
  const down = (event: PointerEvent) => {
    if (event.button !== 0) return;
    move(event);
    dragged = false; dragging = true;
    canvas.setPointerCapture(event.pointerId);
  };
  const up = (event: PointerEvent) => {
    dragging = false;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  };
  const leave = () => { pointerInside = false; };
  const click = () => {
    if (dragged) return;
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(meshTargets, false)[0];
    if (hit) onSelect(cards[hit.object.userData.cardIndex].imageIndex);
  };
  const key = (event: KeyboardEvent) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault(); nudge(event.key === "ArrowLeft" ? -0.025 : 0.025);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const front = cards.reduce((a, b) => a.worldPosition.z > b.worldPosition.z ? a : b);
      onSelect(front.imageIndex);
    }
  };
  const lostContext = (event: Event) => { event.preventDefault(); contextLost = true; };
  const restoredContext = () => { contextLost = false; };
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", up);
  canvas.addEventListener("pointerleave", leave);
  canvas.addEventListener("click", click);
  canvas.addEventListener("keydown", key);
  canvas.addEventListener("webglcontextlost", lostContext);
  canvas.addEventListener("webglcontextrestored", restoredContext);
  gsap.ticker.add(render);
  render(0, 16);
  return {
    setAutomatic(value) { automatic = value; },
    setActive(value) { active = value; },
    nudge,
    dispose() {
      if (disposed) return;
      disposed = true;
      gsap.ticker.remove(render);
      nudgeTo.tween.kill();
      observer.disconnect();
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("pointerleave", leave);
      canvas.removeEventListener("click", click);
      canvas.removeEventListener("keydown", key);
      canvas.removeEventListener("webglcontextlost", lostContext);
      canvas.removeEventListener("webglcontextrestored", restoredContext);
      cards.forEach(card => { card.image.material.dispose(); card.border.material.dispose(); });
      geometry.dispose(); textures.forEach(texture => texture.dispose());
      renderer.dispose(); canvas.remove();
    },
  };
}
