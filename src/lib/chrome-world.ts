import type { ScenePlatform } from "./home-scene-platform";
import { homeAssetManager } from "./home-asset-manager";
import { createHomeRain, type HomeWeather } from "./home-rain";
import { createVortexEasterEgg } from "./vortex-easter-egg";
import { createPixelVortex } from "./pixel-vortex";
import * as THREE from "three";
import { home3DConfig as config, type FloatingModelConfig, type ModelMaterialConfig } from "./home-3d-config";
import * as CANNON from "cannon-es";
import { createLogoTriangle } from "./chrome-logo-geometry";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { HDRLoader } from "three/addons/loaders/HDRLoader.js";
import { EXRLoader } from "three/addons/loaders/EXRLoader.js";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import { createJimmyWordmarkGeometry } from "./jimmy-wordmark-geometry";
import { createChromePortalGun } from "./chrome-portal-gun";
import { mergeRigidMeshes } from "./merge-rigid-meshes";
import { createBakedPropMaterials } from "./baked-prop-materials";
import { createSmoothCubeProbe } from "./incremental-cube-probe";
import { createFloatingPlasterMaterials } from "./floating-plaster-materials";
import { applyVinylMaterial } from "./vinyl-material";
import { createFloatingGlass } from "./floating-glass";
import { createSkyClouds } from "./sky-clouds";
import { createGoodLuckCylinder, createEatSculpture } from "./home-reference-sculptures";
import { createHomeGlow } from "./home-glow";
import { createGlassComposite } from "./glass-composite";
import { createAdaptiveResolution, homeAntialiasSamples } from "./adaptive-resolution";

import { createFloatingFlow, isFlowMode, sampleFlow, type FlowMode } from "./floating-flow";
import { driftRotation, sampleFloatingDrift } from "./floating-drift";

export type FloatingMode = FlowMode | "gravity" | "diagonal-drift" | "orbit" | "wave" | "parallax" | "physics" | "physics-wave" | "planet-belt";
export type ExportLayout = { rotation: number; tilt: number; spacing: number; size: number; logoSize: number; depth: number; motion: "tilted-orbit" | FloatingMode; playing: boolean };
export { defaultExportLayout } from "./chrome-world-layout";

export type ChromeWorldOptions = { platform?: ScenePlatform; weather?: HomeWeather; floatingMode?: FloatingMode; vortexTarget?: HTMLButtonElement; workProgress?: { readonly current: number }; paused?: boolean; debug?: boolean; onError?: (error: unknown) => void };
type Item = { object: THREE.Group; body: CANNON.Body; originalSize: THREE.Vector3; phase: number; entranceScale?: number; entranceReleased?: boolean; billboard?: boolean; screen: { x: number; y: number; radius: number; fx: number; fy: number } };

// SOURCE: twomuch.studio module 3614 / 3645 / 5743, captured 2026-09-11.
// The scene is zero-gravity inside a 20-plane cylinder. A choreographed
// entrance hands each body to this simulation at its orbital release point.
export const referencePhysics = {
  step: 1 / 60, maxSubSteps: 6, iterations: 5, stiffness: 1e6,
  friction: 0, angularDamping: .5, linearDamping: .01,
  releaseImpulse: 15, localForce: .02, wheelDivisor: 800,
  orbitDecay: .98, idlePower: .01, orbitRadians: 2 * Math.PI / 10,
};

// Original free drift uses silhouette separation. Guided currents additionally
// enable real prop contacts; the animated logo blocks props in every physics mode.
const collisionGroup = { boundary: 1, prop: 2, pointer: 4, portalGun: 8, logo: 16 };

export function createChromeWorld(canvas: HTMLCanvasElement, options: ChromeWorldOptions = {}) {
  const window = options.platform?.window ?? globalThis.window;
  const document = options.platform?.document ?? globalThis.document;
  const matchMedia = options.platform?.matchMedia ?? globalThis.matchMedia.bind(globalThis);
  const ResizeObserver = options.platform?.ResizeObserver ?? globalThis.ResizeObserver;
  const IntersectionObserver = options.platform?.IntersectionObserver ?? globalThis.IntersectionObserver;
  const startupTime = performance.now();
  const yieldStartup = () => new Promise<void>(resolve => setTimeout(resolve, 0));
  const host = canvas.parentElement!;
  const initialViewport = host.getBoundingClientRect();
  // Default-framebuffer MSAA is immutable; avoid the extra multisampled buffer
  // on large displays at startup. The scene target's MSAA adapts on every resize.
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: homeAntialiasSamples(initialViewport.width, initialViewport.height, window.devicePixelRatio) === 4, alpha: true });
  const resolution = createAdaptiveResolution(config.resolution);
  let nativeDpr = window.devicePixelRatio;
  resolution.setDevicePixelRatio(nativeDpr);
  // Keep lighting linear internally, then compress highlights before display encoding.
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = config.lighting.exposure;
  const glassComposite = createGlassComposite(renderer);
  const glow = createHomeGlow(renderer, config.glow);
  const scene = new THREE.Scene();
  const sky = createSkyClouds(config.sky);
  const rain = createHomeRain();
  let weather: HomeWeather = options.weather ?? "sunny";
  let rainAmount = weather === "rainy" ? 1 : 0;
  const skyScene = new THREE.Scene();
  skyScene.add(sky.group);
  const skyReady = sky.ready.catch(error => { if (!disposed) options.onError?.(error); });
  // Physics and the portal effect finish before rendering. All six probe faces
  // and the main camera can share one world-matrix update for that frame.
  scene.matrixWorldAutoUpdate = false;
  scene.backgroundIntensity = 1;
  const camera = new THREE.OrthographicCamera(-3, 3, 1.5, -1.5, .1, 1000);
  const easterEgg = createVortexEasterEgg(canvas, camera);
  let lastVortexHover: { x: number; y: number; time: number } | null = null;
  const world = new CANNON.World({ gravity: new CANNON.Vec3(), allowSleep: false });
  (world.solver as CANNON.GSSolver).iterations = referencePhysics.iterations;
  (world.solver as CANNON.GSSolver).tolerance = .001;
  world.defaultContactMaterial.friction = referencePhysics.friction;
  world.defaultContactMaterial.contactEquationStiffness = referencePhysics.stiffness;
  // A narrow column through camera depth gives the cursor a physical footprint
  // at every prop depth without a long-range repulsion field.
  const pointerBody = new CANNON.Body({
    type: CANNON.Body.KINEMATIC,
    collisionFilterGroup: collisionGroup.pointer,
    collisionFilterMask: 0,
  });
  const pointerTarget = new CANNON.Vec3();
  const pointerCollisionStrength = .5;
  const pointerSpinImpulse = new CANNON.Vec3();
  world.addBody(pointerBody);
  world.addEventListener('preStep', () => {
    if (!pointerBody.collisionFilterMask) return;
    // The solver has applied contact impulses and damping at this point.
    // Halve only the cursor contribution, preserving existing drift and contacts.
    for (const contact of world.contacts) {
      const pointerIsA = contact.bi === pointerBody;
      if (!pointerIsA && contact.bj !== pointerBody) continue;
      const body = pointerIsA ? contact.bj : contact.bi;
      if (!contact.enabled || body.type !== CANNON.Body.DYNAMIC) continue;
      const jacobian = pointerIsA ? contact.jacobianElementB : contact.jacobianElementA;
      const correction = contact.multiplier * referencePhysics.step * (pointerCollisionStrength - 1);
      body.velocity.addScaledVector(correction * body.invMass * Math.pow(1 - body.linearDamping, referencePhysics.step), jacobian.spatial, body.velocity);
      body.invInertiaWorld.vmult(jacobian.rotational, pointerSpinImpulse);
      body.angularVelocity.addScaledVector(correction * Math.pow(1 - body.angularDamping, referencePhysics.step), pointerSpinImpulse, body.angularVelocity);
    }
    pointerTarget.vsub(pointerBody.position, pointerBody.velocity);
    pointerBody.velocity.scale(1 / referencePhysics.step, pointerBody.velocity);
    const speed = pointerBody.velocity.length();
    if (speed > 8) pointerBody.velocity.scale(8 / speed, pointerBody.velocity);
  });
  const items: Item[] = [];
  const walls: CANNON.Body[] = [];
  const resources = new Set<THREE.Texture>();
  const materials = new Set<THREE.Material>();
  const geometries = new Set<THREE.BufferGeometry>();
  const media = matchMedia("(prefers-reduced-motion: reduce)");
  let reduced = media.matches;
  let paused = !!options.paused;
  let disposed = false;
  let suspended = false;
  let bakedMaterials: ReturnType<typeof createBakedPropMaterials> | undefined;
  const plasterMaterials = createFloatingPlasterMaterials(config.plaster);
  let ready = false;
  let visible = true;
  let contextLost = false;
  let frame = 0;
  let previous = 0;
  let elapsed = 0;
  let portalGunAnimation: Awaited<ReturnType<typeof createChromePortalGun>> | undefined;
  let entranceActive = false;
  const entrance = { stagger: config.entrance.stagger, launch: config.entrance.launch, orbit: config.entrance.duration, releaseDrag: .45, coast: .18, dragRamp: .65, settle: 2.4 };
  const lastReleaseTime = () => entrance.launch + entrance.orbit + Math.max(0, items.length - 2) * entrance.stagger;
  const entrancePosition = new THREE.Vector3();
  const entranceVelocity = new THREE.Vector3();
  const entranceFlowPosition = new THREE.Vector3();
  const entrancePreviousPosition = new THREE.Vector3();
  let vortexTime = 0;
  let vortexAnimation: ReturnType<typeof createPixelVortex> | undefined;
  let floatingMode: FloatingMode = options.floatingMode ?? "physics";
  const usesPhysics = () => floatingMode === "gravity" || isFlowMode(floatingMode) || floatingMode === "physics" || floatingMode === "physics-wave";
  // A release temporarily changes the forces, never the selected animation.
  let burstGravityAge: number | null = null;
  let burstFloor: CANNON.Body | null = null;
  const burstMotion = { ramp: .35, fall: 1.8, recover: 4.5 };
  const flow = createFloatingFlow();
  const flowAcceleration = new THREE.Vector3();
  let flowBlend = 0;
  let flowSpeed = 1;
  const propMask = () => collisionGroup.boundary | collisionGroup.pointer | collisionGroup.logo | ((isFlowMode(floatingMode) || floatingMode === "gravity") ? collisionGroup.prop | collisionGroup.portalGun : 0);
  let beltAngle = 0;
  let beltSpeed = .10;
  const beltKeys = new Set<string>();
  const beltSeed = (index: number, salt: number) => {
    const value = Math.sin((index + 1) * 127.1 + salt * 311.7) * 43758.5453;
    return value - Math.floor(value);
  };
  const waveForce = new CANNON.Vec3();
  const smoothPointer = new THREE.Vector2();
  const targetPosition = new THREE.Vector3();
  const targetRotation = new THREE.Quaternion();
  const targetEuler = new THREE.Euler();
  let orbit = 0;
  let power = referencePhysics.idlePower;
  let angle = 0;
  let pointerRect = host.getBoundingClientRect();
  let pointerRectDirty = false;
  const invalidatePointerRect = () => { pointerRectDirty = true; };
  let width = 1;
  let height = 1;
  let viewWidth = 6;
  let viewHeight = 3;
  let boundsScale = 1;
  let motionWidth = viewWidth;
  let motionHeight = viewHeight;
  let assetScale = 1;
  let logoScale = 1;
  let exportLayout: ExportLayout | null = null;
  let exportTime = 0;
  const logoEntranceDuration = .95;
  // Independent from physics resets: resizing or returning home must not replay it.
  let logoEntranceTime = 0;
  const workProgress = () => options.workProgress?.current ?? 0;
  const spinAxis = new THREE.Vector3(0, 1, 0);
  const spin = new THREE.Quaternion();
  let contacts = 0;
  let bursts = 0;
  let activePointer: number | null = null;
  let pointerYaw = 0;
  let pointerInside = false;
  let pointerIsTouch = false;
  let lastBurstTime = -Infinity;
  let magnetBlend = 0;
  const magneticPointer = new THREE.Vector2();
  let snapshotTime = 0;
  const pointer = new THREE.Vector2();
  const force = new CANNON.Vec3();
  const point = new CANNON.Vec3();
  const collisions = new Set<string>();

  const chrome = new THREE.MeshPhysicalMaterial(config.logo.material);
  // Keep the studio lights on the logo: the local probe contains reflected
  // geometry and panorama, but cannot replace direct area-light highlights.
  materials.add(chrome);
  // Local reflection probe: only the logo receives this map. The other objects
  // retain the panorama, avoiding recursive render-target feedback.
  // Give the polished logo enough reflection detail before PMREM filtering.
  // Capture still advances one face per frame to spread the increased work.
  const reflectionTarget = new THREE.WebGLCubeRenderTarget(host.clientWidth < 700 ? 128 : 256, {
    type: THREE.HalfFloatType,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
  });
  const reflectionCamera = new THREE.CubeCamera(.05, 50, reflectionTarget);
  const reflectionProbe = createSmoothCubeProbe(reflectionCamera, chrome);
  let reflectionFrames = 0;
  let reflectionDirty = true;
  let renderedWorkProgress = -1;
  const ambient = new THREE.AmbientLight(config.lighting.ambient.color, config.lighting.ambient.intensity);
  scene.add(ambient);
  const lights = new THREE.Group();
  for (const position of [[15,-15,6],[-15,15,-6],[15,-6,15],[-15,6,-15]]) {
    // Zero-intensity lights still add BRDF work to every physical-material pixel.
    if (config.lighting.directional.intensity === 0) continue;
    const light = new THREE.DirectionalLight(config.lighting.directional.color, config.lighting.directional.intensity);
    light.position.fromArray(position); lights.add(light);
  }
  scene.add(lights);
  // Broad studio sources give curved surfaces a continuous highlight rolloff.
  RectAreaLightUniformsLib.init();
  const studio = new THREE.Group();
  for (const { color, intensity, width, height, position } of config.lighting.studio) {
    const light = new THREE.RectAreaLight(color, intensity, width, height);
    light.position.fromArray(position); light.lookAt(0, 0, 0); studio.add(light);
  }
  scene.add(studio);
  const weatherLights = [ambient, ...lights.children, ...studio.children].map(object => {
    const light = object as THREE.Light;
    return { light, color: light.color.clone(), intensity: light.intensity,
      width: light instanceof THREE.RectAreaLight ? light.width : 0,
      height: light instanceof THREE.RectAreaLight ? light.height : 0 };
  });
  const overcastLight = new THREE.Color("#b9cce3");
  const sunnyChromeColor = chrome.color.clone();
  const overcastChromeColor = sunnyChromeColor.clone().multiply(new THREE.Color("#d0ddeb"));
  let lightingAmount = 0;
  const updateWeatherLighting = (amount: number) => {
    lightingAmount = amount;
    for (const entry of weatherLights) {
      const { light, color, intensity } = entry;
      light.color.copy(color).lerp(overcastLight, amount * .65);
      // Overcast light is broad and diffuse, with much less directional contrast.
      light.intensity = intensity * THREE.MathUtils.lerp(1, light === ambient ? 1.5 : .38, amount);
      if (light instanceof THREE.RectAreaLight) {
        light.width = entry.width * THREE.MathUtils.lerp(1, 1.6, amount);
        light.height = entry.height * THREE.MathUtils.lerp(1, 1.6, amount);
      }
    }
    scene.environmentIntensity = config.lighting.environmentIntensity * THREE.MathUtils.lerp(1, .48, amount);
    renderer.toneMappingExposure = config.lighting.exposure * THREE.MathUtils.lerp(1, .82, amount);
    chrome.color.copy(sunnyChromeColor).lerp(overcastChromeColor, amount);
    bakedMaterials?.setWeather(amount);
    plasterMaterials.setWeather(amount);
  };
  const logoAnchor = new THREE.Vector3();
  const logoReturnOffset = new THREE.Vector3();
  let logoReturn: { offset: THREE.Vector3; velocity: THREE.Vector3; age: number } | null = null;
  // An analytic critically damped spring preserves the portal's exit velocity,
  // allows an overshoot, and settles without frame-rate-dependent integration.
  const advanceLogoReturn = (delta: number) => {
    if (!logoReturn) return;
    logoReturn.age += delta;
    const { offset, velocity, age } = logoReturn;
    const frequency = 2.8;
    const decay = Math.exp(-frequency * age);
    logoReturnOffset.copy(offset).multiplyScalar(1 + frequency * age)
      .addScaledVector(velocity, age).multiplyScalar(decay);
    if (age > 6) { logoReturn = null; logoReturnOffset.set(0, 0, 0); }
  };
  const logo = new THREE.Group(); logo.name = "fixed-silver-ZZ"; scene.add(logo);
  // User-directed silver adaptation. A real curved surface reflects the panorama;
  // this replaces the old sinusoidal fragment-normal trick and fabricated softboxes.
  // Exact path vertices from public/assets/logo.svg (600 × 200).
  // Convert SVG's downward Y axis to scene coordinates, keeping the existing
  // width, center, curved silver surface, and all interaction transforms.
  const triangles = [
    [[0, 0], [300, 0], [0, 100]],
    [[600.001, 200], [299.998, 200], [599.998, 100]],
    [[300, 0], [600, 0], [300, 100]],
    [[299.997, 200], [0, 200], [300, 100]],
  ].map((vertices) => vertices.map(([x, y]) => [Math.min(600, x) / 10, 25 - y / 10]));
  for (const vertices of triangles) {
    const geometry = createLogoTriangle(vertices);
    geometries.add(geometry);
    logo.add(new THREE.Mesh(geometry, chrome));
  }

  // Four separate prisms preserve the negative space between the logo triangles.
  const logoBody = new CANNON.Body({ type: CANNON.Body.KINEMATIC,
    collisionFilterGroup: collisionGroup.logo,
    collisionFilterMask: collisionGroup.prop | collisionGroup.portalGun });
  const logoShapes = triangles.map(vertices => {
    const points = vertices.map(([x, y]) => [(x - 30) * .05, (y - 15) * .05]);
    const [a, b, c] = points;
    if ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) < 0) [points[1], points[2]] = [points[2], points[1]];
    const offset = new CANNON.Vec3(points.reduce((sum, p) => sum + p[0], 0) / 3, points.reduce((sum, p) => sum + p[1], 0) / 3, .0075);
    const vertices3d = [-.185, .2].flatMap(z => points.map(([x, y]) => new CANNON.Vec3(x - offset.x, y - offset.y, z - offset.z)));
    const shape = new CANNON.ConvexPolyhedron({ vertices: vertices3d,
      faces: [[2, 1, 0], [3, 4, 5], [0, 1, 4, 3], [1, 2, 5, 4], [2, 0, 3, 5]] });
    logoBody.addShape(shape, offset);
    return { shape, offset, vertices: vertices3d.map(vertex => vertex.clone()) };
  });
  world.addBody(logoBody);
  let colliderScale = -1;
  const stepPhysics = (delta: number) => {
    updateLogoPose();
    logoBody.collisionFilterMask = easterEgg.active || workProgress() >= 1
      ? 0 : collisionGroup.prop | collisionGroup.portalGun;
    if (colliderScale !== logo.scale.x) {
      colliderScale = logo.scale.x;
      for (const [shapeIndex, { shape, offset, vertices }] of logoShapes.entries()) {
        offset.scale(colliderScale, logoBody.shapeOffsets[shapeIndex]);
        vertices.forEach((vertex, index) => vertex.scale(colliderScale, shape.vertices[index]));
        shape.computeNormals();
        shape.computeEdges();
        shape.updateBoundingSphereRadius();
        shape.worldVerticesNeedsUpdate = true;
        shape.worldFaceNormalsNeedsUpdate = true;
      }
      logoBody.updateBoundingRadius();
    }
    logoBody.position.set(logo.position.x, logo.position.y, logo.position.z);
    logoBody.quaternion.set(logo.quaternion.x, logo.quaternion.y, logo.quaternion.z, logo.quaternion.w);
    logoBody.aabbNeedsUpdate = true;
    world.step(referencePhysics.step, delta, referencePhysics.maxSubSteps);
  };

  const track=(object:THREE.Object3D)=>object.traverse(child=>{
    if(!(child instanceof THREE.Mesh))return;
    geometries.add(child.geometry);
    for(const material of Array.isArray(child.material)?child.material:[child.material]){
      materials.add(material);
      for(const value of Object.values(material))if(value instanceof THREE.Texture)resources.add(value);
      if (material.userData.heightMap instanceof THREE.Texture) resources.add(material.userData.heightMap);
    }
  });
  const applyMaterial = (source: THREE.Material, setting: ModelMaterialConfig) => {
    if (!(source instanceof THREE.MeshStandardMaterial)) return source;
    // Promote standard glTF materials so clearcoat is adjustable too; retain all baked maps.
    const material = source instanceof THREE.MeshPhysicalMaterial ? source : new THREE.MeshPhysicalMaterial();
    if (material !== source) THREE.MeshStandardMaterial.prototype.copy.call(material, source);
    const { normalStrength, ...parameters } = setting;
    material.setValues(parameters);
    if (normalStrength !== undefined) material.normalScale.setScalar(normalStrength);
    material.needsUpdate = true;
    materials.add(material);
    return material;
  };
  const add=(object:THREE.Object3D,size:number,index:number,billboard=false)=>{
    track(object);
    const bounds=new THREE.Box3().setFromObject(object),dimensions=bounds.getSize(new THREE.Vector3()),mid=bounds.getCenter(new THREE.Vector3());
    // Measure the original hierarchy first: batching must not change sizing or physics.
    mergeRigidMeshes(object);
    track(object);
    const normalization=size/Math.max(dimensions.x,dimensions.y,dimensions.z);
    const normalized=new THREE.Group();normalized.add(object);object.position.sub(mid);normalized.scale.setScalar(normalization);
    // Reuse internal transforms in reflection views; animated parts explicitly
    // update their local matrices before rendering.
    normalized.traverse(child => { child.updateMatrix(); child.matrixAutoUpdate = false; });
    const group=new THREE.Group();group.name=object.name||`chrome-${index}`;group.add(normalized);scene.add(group);
    const originalSize=dimensions.multiplyScalar(normalization);
    const body=new CANNON.Body({mass:1,allowSleep:true,angularDamping:.5,linearDamping:.01,collisionFilterGroup:object.name === "floating-green-portal-gun" ? collisionGroup.portalGun : collisionGroup.prop,collisionFilterMask:collisionGroup.boundary});
    body.addEventListener('collide',(event:{body:CANNON.Body})=>{contacts++;collisions.add([body.id,event.body.id].sort((a,b)=>a-b).join(':'));});
    world.addBody(body);items.push({object:group,body,originalSize,phase:2*Math.PI/10*index,billboard,screen:{x:0,y:0,radius:0,fx:0,fy:0}});
  };
  const makeWalls=()=>{
    walls.forEach(body=>world.removeBody(body));walls.length=0;
    const plane=(position:number[],rotation:number[],type:typeof CANNON.Body.STATIC | typeof CANNON.Body.KINEMATIC)=>{const body=new CANNON.Body({type,collisionFilterGroup:collisionGroup.boundary,collisionFilterMask:collisionGroup.prop | collisionGroup.portalGun});body.addShape(new CANNON.Plane());body.position.set(position[0],position[1],position[2]);body.quaternion.setFromEuler(rotation[0],rotation[1],rotation[2]);world.addBody(body);walls.push(body);};
    if (floatingMode === "gravity") {
      // The stage can exceed a short viewport; use its visible bottom edge.
      const visibleHeight = Math.min(height, window.visualViewport?.height ?? window.innerHeight);
      const floorY = (height / 2 - visibleHeight) / camera.zoom;
      plane([0, floorY, 0], [-Math.PI / 2, 0, 0], CANNON.Body.STATIC);
      plane([0, viewHeight / 2, 0], [Math.PI / 2, 0, 0], CANNON.Body.STATIC);
      plane([-viewWidth / 2, 0, 0], [0, Math.PI / 2, 0], CANNON.Body.STATIC);
      plane([viewWidth / 2, 0, 0], [0, -Math.PI / 2, 0], CANNON.Body.STATIC);
      plane([0, 0, -motionHeight / 2], [0, 0, 0], CANNON.Body.STATIC);
      plane([0, 0, motionHeight / 2], [0, Math.PI, 0], CANNON.Body.STATIC);
      return;
    }
    for(let i=0;i<20;i++){const theta=Math.PI+2*Math.PI/20*i;plane([0,Math.cos(theta)*motionHeight/2,Math.sin(theta)*motionHeight/2],[theta+Math.PI/2,0,0],CANNON.Body.STATIC);}
    plane([-motionWidth/2,0,0],[0,Math.PI/2,0],CANNON.Body.KINEMATIC);plane([motionWidth/2,0,0],[0,-Math.PI/2,0],CANNON.Body.KINEMATIC);
  };
  const shapeBody=(body:CANNON.Body,size:THREE.Vector3,billboard=false)=>{
    while(body.shapes.length)body.removeShape(body.shapes[0]);
    // A sphere keeps the billboard collision footprint independent of camera orientation.
    body.fixedRotation = billboard && floatingMode === "gravity";
    body.addShape(billboard && floatingMode !== "gravity" ? new CANNON.Sphere(Math.max(size.x,size.y)*.43) : new CANNON.Box(new CANNON.Vec3(size.x/2,size.y/2,Math.max(.025,size.z/2))));body.updateMassProperties();body.updateBoundingRadius();body.aabbNeedsUpdate=true;
  };
  const finishBurstGravity = () => {
    if (burstGravityAge === null) return;
    burstGravityAge = null;
    if (burstFloor) world.removeBody(burstFloor);
    burstFloor = null;
    world.gravity.set(0, floatingMode === "gravity" ? -9.8 : 0, 0);
    world.defaultContactMaterial.friction = floatingMode === "gravity" ? .55 : referencePhysics.friction;
    world.defaultContactMaterial.restitution = isFlowMode(floatingMode) ? .42 : 0;
    for (const { body } of items) {
      body.linearDamping = floatingMode === "gravity" ? .18 : referencePhysics.linearDamping;
    }
    delete canvas.dataset.burstGravity;
  };
  const startBurstGravity = () => {
    if (floatingMode === "gravity" || entranceActive) return;
    burstGravityAge = 0;
    if (!burstFloor) {
      burstFloor = new CANNON.Body({ type: CANNON.Body.STATIC,
        collisionFilterGroup: collisionGroup.boundary,
        collisionFilterMask: collisionGroup.prop | collisionGroup.portalGun });
      burstFloor.addShape(new CANNON.Plane());
      world.addBody(burstFloor);
    }
    const visibleHeight = Math.min(height, window.visualViewport?.height ?? window.innerHeight);
    targetPosition.set(0, (height / 2 - visibleHeight) / camera.zoom, 0).applyQuaternion(camera.quaternion);
    burstFloor.position.set(targetPosition.x, targetPosition.y, targetPosition.z);
    targetRotation.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)).premultiply(camera.quaternion);
    burstFloor.quaternion.set(targetRotation.x, targetRotation.y, targetRotation.z, targetRotation.w);
    burstFloor.aabbNeedsUpdate = true;
  };
  const reset=()=>{
    finishBurstGravity();
    easterEgg.cancel();
    scene.environmentRotation.set(0, 0, 0);
    scene.backgroundRotation.set(0, 0, 0);
    pointerBody.collisionFilterMask = 0;
    pointerBody.velocity.setZero();
    lastVortexHover = null;
    reflectionDirty=true;
    flowBlend=isFlowMode(floatingMode)?1:0;flowSpeed=1;lastBurstTime=-Infinity;magnetBlend=0;
    beltAngle=0;beltSpeed=.10;orbit=0;power=.01;angle=0;elapsed=0;world.time=0;world.accumulator=0;world.stepnumber=0;contacts=0;collisions.clear();
    entranceActive = !reduced && usesPhysics() && floatingMode !== "gravity";
    world.gravity.set(0, floatingMode === "gravity" ? -9.8 : 0, 0);
    world.defaultContactMaterial.friction = floatingMode === "gravity" ? .55 : referencePhysics.friction;
    world.defaultContactMaterial.restitution = entranceActive ? .8 : 0;
    (world.solver as CANNON.GSSolver).iterations = floatingMode === "gravity" ? 12 : referencePhysics.iterations;
    items.forEach((item,index)=>{
      item.entranceScale = entranceActive ? 0 : 1;
      item.entranceReleased = false;
      const portal = item.object.name === 'floating-pixel-vortex';
      item.body.type = entranceActive && !portal ? CANNON.Body.KINEMATIC : CANNON.Body.DYNAMIC;
      item.body.collisionFilterMask = entranceActive || portal ? 0 : propMask();
      item.body.linearDamping = floatingMode === "gravity" ? .18 : referencePhysics.linearDamping;
      item.body.angularDamping = isFlowMode(floatingMode) ? .16 : referencePhysics.angularDamping;
      item.body.updateMassProperties();
      item.body.position.set(0,0,Math.sin(index)*Math.PI/6);
      item.body.quaternion.set(0,0,0,1);item.body.velocity.setZero();item.body.angularVelocity.setZero();item.body.force.setZero();item.body.torque.setZero();item.body.wakeUp();
      if(!reduced && usesPhysics() && !(floatingMode === "gravity" && item.billboard)){
        // Tumble continues unchanged when the orbital entrance releases the bodies.
        const a=2*Math.PI*index/items.length + .35;
        item.body.angularVelocity.set(Math.sin(a)*.35,Math.cos(a)*.35,(index % 2 ? 1 : -1)*.2);
      }
      if(reduced || floatingMode === "gravity"){const a=2*Math.PI*index/items.length;item.body.position.set(Math.cos(a)*viewWidth*.35,Math.sin(a)*viewHeight*.35,.2);}
      item.object.position.copy(item.body.position);item.object.quaternion.copy(item.body.quaternion);
    });
    if (!usesPhysics()) arrange(0, true);
    canvas.dataset.motionMode = floatingMode;
    canvas.dataset.phase=reduced?'static':floatingMode;
  };
  const resizeRenderBuffers = () => {
    const samples = homeAntialiasSamples(width, height, nativeDpr);
    renderer.setDrawingBufferSize(width, height, resolution.pixelRatio);
    glassComposite.resize(width, height, resolution.pixelRatio, samples);
    glow.resize(width, height, resolution.pixelRatio, samples);
    canvas.dataset.pixelRatio = String(resolution.pixelRatio);
    canvas.dataset.msaaSamples = String(Math.min(samples, renderer.capabilities.maxSamples));
    renderedWorkProgress = -1;
  };
  const resize=()=>{
    if (suspended || !host.isConnected || !host.clientWidth || !host.clientHeight) return;
    renderedWorkProgress = -1;
    easterEgg.cancel();
    const rect=host.getBoundingClientRect();pointerRect=rect;pointerRectDirty=false;width=rect.width;height=rect.height;
    camera.left=-width/2;camera.right=width/2;camera.top=height/2;camera.bottom=-height/2;camera.zoom=(width+height)/9;camera.updateProjectionMatrix();
    viewWidth=width/camera.zoom;viewHeight=height/camera.zoom;
    while (pointerBody.shapes.length) pointerBody.removeShape(pointerBody.shapes[0]);
    const pointerShapeRotation = new CANNON.Quaternion();
    pointerShapeRotation.setFromEuler(Math.PI / 2, 0, 0);
    pointerBody.addShape(new CANNON.Cylinder(10 / camera.zoom, 10 / camera.zoom, 40, 12), new CANNON.Vec3(), pointerShapeRotation);
    pointerBody.collisionFilterMask = 0;
    const compact = width < config.sizing.mobileBreakpoint;
    // Expand the simulation, keeping the camera and the visible prop sizes unchanged.
    boundsScale = Math.max(1, compact ? config.floatingBounds.mobile : config.floatingBounds.desktop);
    motionWidth = viewWidth * boundsScale;
    motionHeight = viewHeight * boundsScale;
    // Keep desktop props proportional to screen width, independent of viewport height.
    const referenceViewWidth = 9 * config.sizing.referenceAspect / (1 + config.sizing.referenceAspect);
    const oldScale = assetScale;
    assetScale = compact ? config.sizing.mobile : config.sizing.desktop * viewWidth / referenceViewWidth;
    logoScale = Math.min(config.logo.scale, viewWidth * (compact ? config.logo.mobileViewportWidth : config.logo.maxViewportWidth) / 3.1, viewHeight * config.logo.maxViewportHeight / 1.05);
    logo.scale.setScalar(logoScale);
    items.forEach(item=>{shapeBody(item.body,item.originalSize.clone().multiplyScalar(assetScale),item.billboard);item.object.scale.setScalar(assetScale);if(ready&&oldScale!==assetScale)item.body.position.scale(assetScale/oldScale,item.body.position);});
    nativeDpr = window.devicePixelRatio;
    resolution.setDevicePixelRatio(nativeDpr);
    makeWalls();resizeRenderBuffers();
    // Viewport changes invalidate wall containment; restart the same entrance instead of
    // teleporting individual bodies into arrangement slots or leaving bodies outside walls.
    if(ready)reset();
  };
  const updatePointer=(event:PointerEvent)=>{pointerInside=true;pointerIsTouch=event.pointerType==='touch';if(pointerRectDirty){pointerRect=host.getBoundingClientRect();pointerRectDirty=false;}const r=pointerRect;pointer.set((event.clientX-r.left)/r.width*2-1,-((event.clientY-r.top)/r.height*2-1));};
  const vortexBox = new THREE.Box3();
  const localOrigin = new THREE.Vector3();
  const vortexMin = new THREE.Vector2(), vortexMax = new THREE.Vector2();
  const vortexCorner = new THREE.Vector3(), vortexPixel = new THREE.Vector2();
  const coarsePointer = matchMedia('(pointer: coarse)');
  const vortexBounds = () => {
    const item = items.find(item => item.object.name === "floating-green-portal-gun");
    if (!item || !ready || workProgress() > 0) return null;
    // Rigid props already have a centred local bounding box. Transform its
    // eight corners instead of traversing the model on every frame/mouse event.
    const rect = pointerRect;
    const box = vortexBox.setFromCenterAndSize(localOrigin, item.originalSize).applyMatrix4(item.object.matrixWorld);
    const min = vortexMin.set(Infinity, Infinity), max = vortexMax.set(-Infinity, -Infinity);
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
      const p = vortexCorner.set(x, y, z).project(camera);
      const pixel = vortexPixel.set((p.x + 1) * rect.width / 2, (1 - p.y) * rect.height / 2);
      min.min(pixel); max.max(pixel);
    }
    const padding = coarsePointer.matches ? 12 : 6;
    return { center: min.clone().add(max).multiplyScalar(.5), major: new THREE.Vector2(1, 0), minor: new THREE.Vector2(0, 1), majorLength: 1, minorLength: 1, rx: Math.max(22, (max.x - min.x) / 2 + padding), ry: Math.max(22, (max.y - min.y) / 2 + padding), rect };
  };
  const hitVortex = (bounds = vortexBounds()) => {
    if (!bounds) return false;
    const { center, major, minor, majorLength, minorLength, rx, ry, rect } = bounds;
    const offset = new THREE.Vector2((pointer.x + 1) * rect.width / 2, (1 - pointer.y) * rect.height / 2).sub(center);
    return Math.hypot(offset.dot(major) / majorLength / rx, offset.dot(minor) / minorLength / ry) <= 1;
  };
  const startVortex = () => {
    const vortex = items.find(item => item.object.name === "floating-pixel-vortex");
    const gun = items.find(item => item.object.name === "floating-green-portal-gun");
    if (!vortex || !gun || easterEgg.active || entranceActive || !ready || paused || workProgress() > 0) return;
    finishBurstGravity();
    activePointer = null;
    easterEgg.start(vortex.object, gun.object, [{ object: logo, billboard: true,
      onRelease: (position: THREE.Vector3, velocity: THREE.Vector3) => {
        logoReturn = { offset: position.clone().sub(logoAnchor), velocity: velocity.clone(), age: 0 };
        logoReturnOffset.copy(logoReturn.offset);
      },
    }, ...items.filter(item => item !== vortex).map(({ object, billboard, body }) => ({
      object, billboard,
      onRelease: usesPhysics() ? (position: THREE.Vector3, velocity: THREE.Vector3) => {
        body.position.set(position.x, position.y, position.z);
        body.previousPosition.copy(body.position); body.interpolatedPosition.copy(body.position);
        body.velocity.set(velocity.x, velocity.y, velocity.z);
        body.aabbNeedsUpdate = true; body.wakeUp();
      } : undefined,
    }))], reduced, position => {
      vortex.body.position.set(position.x, position.y, position.z); vortex.body.velocity.setZero(); vortex.body.angularVelocity.setZero();
      vortex.body.aabbNeedsUpdate = true; vortex.body.wakeUp(); reflectionDirty = true;
    });
  };
  const vortexActivate = (event: Event) => {
    // A dedicated overlay owns this gesture before it can reach canvas physics.
    // Touch must finish as a tap before activation; a swipe belongs to the page.
    if ("pointerType" in event && ((event as PointerEvent).button !== 0 || (event.type === 'pointerdown' && (event as PointerEvent).pointerType === 'touch'))) return;
    event.preventDefault(); event.stopPropagation();
    canvas.focus({ preventScroll: true });
    startVortex();
  };
  options.vortexTarget?.addEventListener('pointerdown', vortexActivate);
  options.vortexTarget?.addEventListener('click', vortexActivate);
  const updateVortexTarget = () => {
    const target = options.vortexTarget;
    const bounds = !easterEgg.active && !paused ? vortexBounds() : null;
    // The gun moves even when the pointer does not. Keep the canvas fallback
    // label in sync with the same bounds used by the moving overlay.
    const label = pointerInside && !pointerIsTouch && hitVortex(bounds) ? 'Open The Portal' : '';
    if (canvas.dataset.hoverLabel !== label) canvas.dataset.hoverLabel = label;
    if (!target) return;
    target.style.display = bounds ? 'block' : 'none';
    if (!bounds) return;
    const { center, rx, ry, major } = bounds;
    target.style.transform = `translate3d(${center.x - rx}px, ${center.y - ry}px, 0) rotate(${Math.atan2(major.y, major.x)}rad) scale(${rx * 2}, ${ry * 2})`;
  };
  const pointerDown=(event:PointerEvent)=>{
    if(event.button!==0||activePointer!==null||!ready||paused||easterEgg.active||workProgress()>0)return;
    updatePointer(event);
    const recentHover = lastVortexHover && performance.now() - lastVortexHover.time < 250 && Math.hypot(event.clientX - lastVortexHover.x, event.clientY - lastVortexHover.y) < 22;
    if (hitVortex() || recentHover) {
      if (event.pointerType !== 'touch') startVortex();
      return;
    }
    if (reduced || (!usesPhysics() && floatingMode !== 'planet-belt')) return;
    activePointer=event.pointerId;
    canvas.setPointerCapture(event.pointerId);
    canvas.dataset.phase='attract';
    if (usesPhysics()) canvas.dataset.hoverLabel='';
  };
  const pointerMove=(event:PointerEvent)=>{
    updatePointer(event);
    if (!easterEgg.active) {
      const overVortex = ready && workProgress() === 0 && hitVortex();
      const label = overVortex ? 'Open The Portal' : '';
      if (canvas.dataset.hoverLabel !== label) canvas.dataset.hoverLabel = label;
      if (overVortex) lastVortexHover = { x: event.clientX, y: event.clientY, time: performance.now() };
    }
  };
  const pointerUp=(event:PointerEvent)=>{
    if(activePointer!==event.pointerId)return;
    // Release is an impulse, not a position tween: collisions and spin remain live.
    if (usesPhysics() && !reduced && !paused && !easterEgg.active && workProgress() === 0) {
      const upY = Math.cos(angle), upZ = -Math.sin(angle);
      const centerX = magneticPointer.x * viewWidth / 2;
      const centerY = magneticPointer.y * viewHeight / 2;
      const radius = Math.min(viewWidth, viewHeight) * config.magnet.attractRadius;
      for (const { body, phase } of items) {
        if (!body.collisionResponse || body.type !== CANNON.Body.DYNAMIC) continue;
        const dx = body.position.x - centerX;
        const dy = body.position.y * upY + body.position.z * upZ - centerY;
        const distance = Math.hypot(dx, dy);
        if (distance >= radius) continue;
        const nx = distance > .02 ? dx / distance : Math.cos(phase);
        const ny = distance > .02 ? dy / distance : Math.sin(phase);
        const outwardSpeed = body.velocity.x * nx + (body.velocity.y * upY + body.velocity.z * upZ) * ny;
        const falloff = 1 - THREE.MathUtils.smoothstep(distance, 0, radius);
        // Cancel incoming radial momentum before adding the outward kick.
        const kick = Math.max(0, config.magnet.burstSpeed * falloff - outwardSpeed);
        force.set(nx * kick * body.mass, ny * upY * kick * body.mass, ny * upZ * kick * body.mass);
        point.set(Math.sin(phase) * .015, Math.cos(phase) * .015, .01);
        body.applyImpulse(force, point);
        body.wakeUp();
      }
      bursts++;
      lastBurstTime = elapsed;
      magnetBlend = 0;
      startBurstGravity();
    }
    if (pointerIsTouch) pointerInside = false;
    pointerCancel();
  };
  const touchClick=(event:PointerEvent)=>{
    if(event.pointerType!=='touch'||workProgress()>0)return;
    updatePointer(event);
    if(hitVortex())startVortex();
  };
  const pointerCancel=()=>{
    beltKeys.clear();
    const pointerId=activePointer;activePointer=null;
    if(pointerId!==null&&canvas.hasPointerCapture(pointerId))canvas.releasePointerCapture(pointerId);
    canvas.dataset.phase=reduced?'static':floatingMode;
    if (usesPhysics()) canvas.dataset.hoverLabel='';
  };
  const pointerLeave=()=>{pointerInside=false;if(activePointer===null)pointer.set(0,0);};
  const cancelMagnet=()=>{finishBurstGravity();pointerInside=false;lastBurstTime=-Infinity;magnetBlend=0;pointerCancel();};
  canvas.addEventListener("pointerleave",pointerLeave);
  const pageVisibility=()=>{resolution.reset();if(document.hidden)cancelMagnet();};
  const key=(event:KeyboardEvent)=>{if(exportLayout || workProgress()>0)return;if(event.code==='Escape'){easterEgg.cancel();return;}if(easterEgg.active)return;if(event.code==='KeyV'){event.preventDefault();startVortex();return;}if((floatingMode === 'planet-belt' || isFlowMode(floatingMode)) && (event.code === 'Space' || event.code === 'Enter')){event.preventDefault();if(!reduced && ready && !paused)beltKeys.add(event.code);return;}if(!usesPhysics())return;if(event.code==='Space'||event.code==='Enter'){event.preventDefault();if(!reduced)power=Math.min(power+.28,.5);}if(event.code==='ArrowUp'||event.code==='ArrowDown'){event.preventDefault();power=event.code==='ArrowUp'?.15:-.15;}};
  const keyUp = (event: KeyboardEvent) => { beltKeys.delete(event.code); };
  window.addEventListener('keyup', keyUp);
  const preference=()=>{reduced=media.matches;pointerCancel();if(ready)reset();};
  const lost=(event:Event)=>{event.preventDefault();easterEgg.cancel();contextLost=true;canvas.dataset.ready='false';};
  const restored=()=>{bakedMaterials?.refresh();contextLost=false;reflectionDirty=true;resolution.reset();resizeRenderBuffers();};
  const resizeIfNeeded = () => {
    const rect = host.getBoundingClientRect();
    if (rect.width !== width || rect.height !== height) resize();
  };
  const observer=new ResizeObserver(resizeIfNeeded);observer.observe(host);resize();
  const updateViewportFloor = () => { if (floatingMode === "gravity") makeWalls(); };
  window.visualViewport?.addEventListener("resize", updateViewportFloor);
  const visibility=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;activePointer=null;if(!visible)easterEgg.cancel();});visibility.observe(host);
  canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointermove',pointerMove);canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('pointercancel',cancelMagnet);canvas.addEventListener('click',touchClick);
  window.addEventListener('scroll',invalidatePointerRect,{passive:true});
  window.addEventListener('blur',cancelMagnet);document.addEventListener('visibilitychange',pageVisibility);
  canvas.addEventListener('lostpointercapture',pointerCancel);canvas.addEventListener('keydown',key);
  media.addEventListener('change',preference);
  canvas.addEventListener('webglcontextlost',lost);canvas.addEventListener('webglcontextrestored',restored);
  const cameraFrame=()=>{
    // Same orbit as source, shifted by PI to show the supplied plaques' front faces.
    angle=usesPhysics() && floatingMode !== "gravity" ? 2*Math.PI/10*orbit : 0;
    camera.position.set(0,10*Math.sin(angle),10*Math.cos(angle));camera.rotation.set(-angle,0,0);
    logo.quaternion.copy(camera.quaternion);
    lights.rotation.set(0,-angle,-angle);
    studio.quaternion.copy(camera.quaternion);
  };
  // Shared clock and deterministic slots keep the composition readable. The hidden
  // portal is excluded from slot counts; it keeps its own effect-controlled position.
  const arrange = (delta: number, snap = false) => {
    const count = items.length - 1;
    const t = reduced ? 0 : elapsed;
    const blend = snap || reduced ? 1 : 1 - Math.exp(-delta * 5);
    if (reduced) smoothPointer.set(0, 0); else smoothPointer.lerp(pointer, blend);
    const compact = width < 700;
    const columns = compact ? 4 : 5;
    const rows = Math.ceil(count / columns);
    items.forEach((item, index) => {
      if (item.object.name === 'floating-pixel-vortex') return;
      const layer = index % 3;
      let recycled = false;
      let x: number, y: number, z: number;
      if (floatingMode === 'diagonal-drift') {
        const previousCycle = sampleFloatingDrift(index, Math.max(0, t - delta), viewWidth, viewHeight, targetPosition);
        recycled = sampleFloatingDrift(index, t, viewWidth, viewHeight, targetPosition) !== previousCycle;
        x = targetPosition.x; y = targetPosition.y; z = targetPosition.z;
      } else if (floatingMode === 'planet-belt') {
        // Stable per-object seeds make a broad, irregular band without per-frame
        // randomness or teleporting. Local drift stays bounded around each orbit.
        const seed = beltSeed(index, 1);
        const driftPhase = beltSeed(index, 2) * Math.PI * 2;
        const driftTime = t * (.24 + beltSeed(index, 3) * .18);
        const theta = (index + (seed - .5) * .65) / count * Math.PI * 2
          + (reduced ? 0 : beltAngle) + Math.sin(driftTime + driftPhase) * .055;
        const radius = .77 + beltSeed(index, 4) * .32 + Math.sin(driftTime * .8 + driftPhase) * .055;
        const along = Math.cos(theta) * radius;
        const across = Math.sin(theta) * radius;
        const thickness = (beltSeed(index, 5) - .5) * .07
          + Math.sin(driftTime * 1.3 + driftPhase) * .018;
        x = (along * (compact ? .33 : .37) - across * .10 - thickness * .5) * viewWidth;
        y = (along * .25 + across * .17 + thickness) * viewHeight;
        // Flip front/back while preserving the reference's screen-space tilt.
        z = (-across * .38 + Math.cos(driftTime + driftPhase) * .045) * Math.min(viewWidth, viewHeight);
      } else if (floatingMode === 'orbit') {
        const ring = index % 2;
        const ringCount = Math.ceil((count - ring) / 2);
        const theta = Math.floor(index / 2) / ringCount * Math.PI * 2 + ring * .24 + t * (ring ? .085 : .065);
        const radius = ring ? .40 : .29;
        x = Math.cos(theta) * viewWidth * radius;
        y = Math.sin(theta) * viewHeight * radius;
        z = -.6 + Math.sin(theta) * .18;
      } else {
        const row = Math.floor(index / columns);
        const col = index % columns;
        const rowCount = Math.min(columns, count - row * columns);
        x = (col - (rowCount - 1) / 2) * viewWidth * (compact ? .22 : .18);
        // An empty central band leaves the ZZ silhouette unobstructed.
        const side = row < rows / 2 ? 1 : -1;
        const rank = side === 1 ? row : rows - 1 - row;
        y = side * viewHeight * (.38 - rank * (compact ? .115 : .17));
        z = -.5 - layer * .15;
        if (floatingMode === 'wave') {
          const wave = t * .72 - x / viewWidth * Math.PI * 2;
          y += Math.sin(wave) * viewHeight * .025;
        } else {
          x += smoothPointer.x * (.025 + layer * .02) * viewWidth;
          y += smoothPointer.y * (.015 + layer * .012) * viewHeight;
        }
      }
      targetPosition.set(x, y, z);
      item.object.position.lerp(targetPosition, recycled ? 1 : blend);
      item.body.position.set(item.object.position.x, item.object.position.y, item.object.position.z);
      const sway = floatingMode === 'parallax' ? smoothPointer.x * .06 : Math.sin(t * .72 - x) * .06;
      if (floatingMode === 'diagonal-drift') {
        const rotation = driftRotation(index, t);
        targetEuler.set(rotation * .65, rotation, rotation * .45);
      } else if (floatingMode === 'planet-belt') {
        const phase = beltSeed(index, 6) * Math.PI * 2;
        targetEuler.set(Math.sin(t * .23 + phase) * .25, Math.cos(t * .19 + phase) * .35,
          (beltSeed(index, 7) - .5) * .65 + Math.sin(t * .28 + phase) * .15);
      } else targetEuler.set(.06, sway, (index % 3 - 1) * .10 + sway * .5);
      targetRotation.setFromEuler(targetEuler);
      item.object.quaternion.slerp(targetRotation, blend);
      item.body.quaternion.set(item.object.quaternion.x, item.object.quaternion.y, item.object.quaternion.z, item.object.quaternion.w);
      item.body.velocity.setZero(); item.body.angularVelocity.setZero();
      item.body.aabbNeedsUpdate = true;
    });
    canvas.dataset.phase = reduced ? 'static' : floatingMode;
    canvas.dataset.motionMode = floatingMode;
  };
  // Join the destination current during the existing orbital entrance. There is
  // no free-flight/recapture segment after release.
  const sampleEntrancePosition = (index: number, age: number, out: THREE.Vector3) => {
    const count = items.length - 1;
    const start = -index / count * Math.PI * 2 + .35;
    const launch = THREE.MathUtils.smootherstep(age, 0, entrance.launch);
    const progress = THREE.MathUtils.clamp((age - entrance.launch) / entrance.orbit, 0, 1);
    const tail = config.entrance.endSpeed;
    const integral = tail + (1 - tail) / 3;
    const eased = (tail * progress + (1 - tail) * (1 - (1 - progress) ** 3) / 3) / integral;
    const turns = Math.PI * 2 * config.entrance.turns;
    const launchAngle = Math.min(0, age - entrance.launch) * turns / entrance.orbit / integral;
    const theta = start + eased * turns + launchAngle;
    const radius = .88 + beltSeed(index, 4) * .20;
    const along = Math.cos(theta) * radius;
    const across = Math.sin(theta) * radius;
    out.set(
      (along * .35 - across * .08) * viewWidth,
      (along * .19 + across * .24) * viewHeight,
      -across * viewHeight * .20,
    ).multiplyScalar(launch);
    if (isFlowMode(floatingMode)) {
      sampleFlow(floatingMode, theta, index % 3, age + index * entrance.stagger,
        viewWidth, viewHeight, entranceFlowPosition);
      out.lerp(entranceFlowPosition, THREE.MathUtils.smootherstep(progress, .35, 1));
    }
  };
  const sampleEntrance = (index: number, age: number, out: THREE.Vector3, velocity: THREE.Vector3) => {
    sampleEntrancePosition(index, age, out);
    // Differentiate the complete moving path, including its in-orbit morph.
    // A backward derivative also handles the release endpoint without clamping
    // away the tangent speed.
    sampleEntrancePosition(index, age - .001, entrancePreviousPosition);
    velocity.subVectors(out, entrancePreviousPosition).multiplyScalar(1000);
  };
  const updateReleaseDrag = () => {
    if (isFlowMode(floatingMode)) {
      world.defaultContactMaterial.restitution = .42;
      for (const { body, entranceReleased } of items) {
        if (entranceReleased) body.linearDamping = referencePhysics.linearDamping;
      }
      return;
    }
    // A zero-restitution boundary absorbs the entire normal velocity on impact.
    // Keep the toss elastic, then ease back to the original idle contacts.
    const idleRestitution = isFlowMode(floatingMode) ? .42 : 0;
    world.defaultContactMaterial.restitution = idleRestitution + (.8 - idleRestitution)
      * (1 - THREE.MathUtils.smootherstep(elapsed, lastReleaseTime() + .5, lastReleaseTime() + entrance.settle));
    items.forEach((item, index) => {
      if (!item.entranceReleased) return;
      const flightAge = elapsed - index * entrance.stagger - entrance.launch - entrance.orbit;
      const onset = THREE.MathUtils.smootherstep(flightAge, entrance.coast, entrance.coast + entrance.dragRamp);
      const drag = entrance.releaseDrag * onset
        * (1 - THREE.MathUtils.smootherstep(flightAge, entrance.coast + entrance.dragRamp, entrance.settle));
      item.body.linearDamping = 1 - (1 - referencePhysics.linearDamping * onset) * Math.exp(-drag);
    });
  };
  const applyMagnet = (delta: number) => {
    const attracting = activePointer !== null;
    const enabled = !reduced && !paused && !easterEgg.active && workProgress() === 0
      && (pointerInside || activePointer !== null || (pointerIsTouch && attracting));
    const colliding = enabled && !attracting && !pointerIsTouch;
    if (colliding) {
      const screenY = pointer.y * viewHeight / 2;
      pointerTarget.set(pointer.x * viewWidth / 2, screenY * Math.cos(angle), -screenY * Math.sin(angle));
      if (!pointerBody.collisionFilterMask) pointerBody.position.copy(pointerTarget);
      pointerBody.quaternion.set(camera.quaternion.x, camera.quaternion.y, camera.quaternion.z, camera.quaternion.w);
      pointerBody.aabbNeedsUpdate = true;
      pointerBody.collisionFilterMask = collisionGroup.prop;
    } else {
      pointerBody.collisionFilterMask = 0;
      pointerBody.velocity.setZero();
    }
    canvas.dataset.pointerCollision = colliding ? 'on' : 'off';
    const target = enabled && attracting ? 1 : 0;
    magnetBlend = THREE.MathUtils.damp(magnetBlend, target, 10, delta);
    magneticPointer.lerp(pointer, 1 - Math.exp(-delta * 18));
    canvas.dataset.magnet = enabled && attracting ? 'attract' : 'off';
    if (!enabled || !attracting || magnetBlend < .01) return;
    const upY = Math.cos(angle), upZ = -Math.sin(angle);
    const targetX = magneticPointer.x * viewWidth / 2;
    const targetY = magneticPointer.y * viewHeight / 2;
    const radius = Math.min(viewWidth, viewHeight) * config.magnet.attractRadius;
    for (const { body, phase } of items) {
      if (!body.collisionResponse || body.type !== CANNON.Body.DYNAMIC) continue;
      let dx = targetX - body.position.x;
      let dy = targetY - (body.position.y * upY + body.position.z * upZ);
      const distance = Math.hypot(dx, dy);
      if (distance >= radius) continue;
      if (distance < .001) { dx = Math.cos(phase) * .001; dy = Math.sin(phase) * .001; }
      const falloff = 1 - THREE.MathUtils.smoothstep(distance, 0, radius);
      const strength = config.magnet.attractStrength;
      // Screen-plane force preserves each body's depth. Attraction weakens at
      // the cursor so bodies can collide and tumble instead of snapping together.
      const magnitude = strength * magnetBlend * falloff * Math.min(1, distance / .28);
      const inverseDistance = 1 / Math.max(.001, distance);
      force.set(dx * inverseDistance * magnitude, dy * inverseDistance * upY * magnitude, dy * inverseDistance * upZ * magnitude);
      body.applyForce(force);
      body.wakeUp();
    }
  };
  const applyFlowForces = () => {
    if (!isFlowMode(floatingMode)) return;
    flow.update(floatingMode, elapsed, viewWidth, viewHeight);
    const recovery = THREE.MathUtils.smoothstep(elapsed - lastBurstTime, 0, config.magnet.burstRecovery);
    const strength = flowBlend * (1 - workProgress()) * (.18 + .82 * recovery);
    items.forEach(({ body }, index) => {
      if (!body.collisionResponse || body.type !== CANNON.Body.DYNAMIC) return;
      body.collisionFilterMask = propMask();
      body.angularDamping = .16;
      flow.acceleration(body.position, body.velocity, index % 3,
        Math.min(viewWidth, viewHeight) * .20 * flowSpeed * (.9 + beltSeed(index, 9) * .2), flowAcceleration);
      force.set(flowAcceleration.x * strength, flowAcceleration.y * strength, flowAcceleration.z * strength);
      body.applyForce(force);
      // Tiny off-centre force sustains tumbling; contact impulses remain free
      // to change its axis. Never overwrite a live body's quaternion.
      force.set(.012 * Math.sin(elapsed * .4 + index), .008, .012 * Math.cos(elapsed * .31 + index));
      point.set(.17, -.13, .11);
      body.applyLocalForce(force, point);
      body.wakeUp();
    });
  };
  const stepEntrance = (delta: number) => {
    cameraFrame();
    updateReleaseDrag();
    applyMagnet(delta);
    applyFlowForces();
    // Each released body immediately joins the live current while the rest enter.
    stepPhysics(delta);
    items.forEach((item, index) => {
      if (item.object.name === 'floating-pixel-vortex') return;
      if (item.entranceReleased) {
        item.object.position.copy(item.body.position);
        return;
      }
      const age = elapsed - index * entrance.stagger;
      const releaseAt = entrance.launch + entrance.orbit;
      item.entranceScale = THREE.MathUtils.smootherstep(age, 0, entrance.launch);
      sampleEntrance(index, Math.min(age, releaseAt), entrancePosition, entranceVelocity);
      const tumble = Math.max(0, Math.min(age, releaseAt));
      item.body.quaternion.setFromEuler(
        item.body.angularVelocity.x * tumble,
        item.body.angularVelocity.y * tumble,
        item.body.angularVelocity.z * tumble,
      );
      if (age >= releaseAt) {
        item.entranceReleased = true;
        item.body.type = CANNON.Body.DYNAMIC;
        item.body.collisionFilterMask = propMask();
        item.body.updateMassProperties();
        const overshoot = age - releaseAt;
        // Advance any fraction of the release frame at the exact orbital
        // tangent speed. Drag starts later; it must not scale the handoff.
        entrancePosition.addScaledVector(entranceVelocity, overshoot);
        item.body.velocity.set(entranceVelocity.x, entranceVelocity.y, entranceVelocity.z);
        item.body.linearDamping = isFlowMode(floatingMode) ? referencePhysics.linearDamping : 0;
        item.body.wakeUp();
      }
      item.body.position.set(entrancePosition.x, entrancePosition.y, entrancePosition.z);
      item.body.aabbNeedsUpdate = true;
      item.object.position.copy(item.body.position);
    });
    const lastAge = elapsed - Math.max(0, items.length - 2) * entrance.stagger;
    entranceActive = lastAge < entrance.launch + entrance.orbit;
    canvas.dataset.phase = elapsed < entrance.launch ? 'entrance-launch'
      : elapsed < entrance.launch + entrance.orbit ? 'entrance-orbit' : 'entrance-release';
    if (!entranceActive) canvas.dataset.phase = isFlowMode(floatingMode) ? floatingMode : 'orbit';
  };
  const spreadFloatingItems = () => {
    // Depth-separated bodies can still overlap in the camera. A soft screen-space
    // pressure spreads those silhouettes without snapping bodies to fixed slots.
    const strength = THREE.MathUtils.smootherstep(elapsed, lastReleaseTime(), lastReleaseTime() + entrance.settle)
      * (1 - workProgress()) * (activePointer === null ? 1 : .2);
    if (strength <= 0 || easterEgg.active || isFlowMode(floatingMode)) return;
    const upY = Math.cos(angle), upZ = -Math.sin(angle);
    const count = items.length - 1;
    const spacing = Math.sqrt(viewWidth * viewHeight / count) * .82;
    const gap = Math.min(viewWidth, viewHeight) * .035;
    // Share the walls' expanded bounds; soften the return over the extra travel room.
    const edgeStrength = 1.8 / boundsScale;
    for (const item of items) {
      if (!item.body.collisionResponse) continue;
      const { body, screen, originalSize } = item;
      screen.x = body.position.x;
      screen.y = body.position.y * upY + body.position.z * upZ;
      screen.radius = Math.max(originalSize.x, originalSize.y, originalSize.z) * assetScale * .46;
      const limitX = Math.max(motionWidth * .18, motionWidth * .48 - screen.radius);
      const limitY = Math.max(motionHeight * .18, motionHeight * .46 - screen.radius);
      const edgeX = screen.x - THREE.MathUtils.clamp(screen.x, -limitX, limitX);
      const edgeY = screen.y - THREE.MathUtils.clamp(screen.y, -limitY, limitY);
      screen.fx = -screen.x * .045 - edgeX * edgeStrength - body.velocity.x * .22;
      screen.fy = -screen.y * .045 - edgeY * edgeStrength - (body.velocity.y * upY + body.velocity.z * upZ) * .22;

    }
    for (let i = 0; i < items.length; i++) {
      if (!items[i].body.collisionResponse) continue;
      const a = items[i].screen;
      for (let j = i + 1; j < items.length; j++) {
        if (!items[j].body.collisionResponse) continue;
        const b = items[j].screen;
        let dx = a.x - b.x, dy = a.y - b.y;
        let distance = Math.hypot(dx, dy);
        const separation = Math.max(spacing, a.radius + b.radius + gap);
        if (distance >= separation) continue;
        if (distance < .001) {
          const theta = (i + j * .618) * 2.399963;
          dx = Math.cos(theta) * .001; dy = Math.sin(theta) * .001; distance = .001;
        }
        const pressure = Math.min(.9, (separation - distance) * 1.4) / distance;
        a.fx += dx * pressure; a.fy += dy * pressure;
        b.fx -= dx * pressure; b.fy -= dy * pressure;
      }
    }
    for (const { body, screen } of items) {
      if (!body.collisionResponse) continue;
      force.set(screen.fx * strength, screen.fy * upY * strength, screen.fy * upZ * strength);
      body.applyForce(force);
    }
  };
  const step=(delta:number)=>{
    elapsed+=delta;
    if (entranceActive) { stepEntrance(delta); return; }
    if (burstGravityAge !== null && workProgress() > 0) finishBurstGravity();
    if (burstGravityAge !== null) {
      // Keep the camera, positions, spin and explosion velocity continuous.
      // Only gravity and the original guiding force crossfade over time.
      if (activePointer === null) burstGravityAge += delta;
      const recovery = THREE.MathUtils.smootherstep(burstGravityAge, burstMotion.fall, burstMotion.fall + burstMotion.recover);
      const gravity = THREE.MathUtils.smootherstep(burstGravityAge, 0, burstMotion.ramp) * (1 - recovery);
      world.gravity.set(0, -9.8 * Math.cos(angle) * gravity, 9.8 * Math.sin(angle) * gravity);
      world.defaultContactMaterial.friction = .55 * (1 - recovery);
      world.defaultContactMaterial.restitution = .12 + (isFlowMode(floatingMode) ? .30 : -.12) * recovery;
      for (const { body } of items) body.linearDamping = THREE.MathUtils.lerp(.18, referencePhysics.linearDamping, recovery);
      if (isFlowMode(floatingMode)) {
        flowBlend = recovery;
        applyFlowForces();
      } else {
        // Free drift has no path to pull it off the floor: restore buoyancy gently.
        const lift = Math.sin(Math.PI * recovery) * 2.2;
        for (const { body } of items) {
          if (!body.collisionResponse) continue;
          force.set(.02 * Math.sin(elapsed / 10) * recovery, lift * Math.cos(angle), -lift * Math.sin(angle));
          body.applyForce(force);
        }
      }
      applyMagnet(delta);
      stepPhysics(delta);
      for (const { body, object } of items) { object.position.copy(body.position); object.quaternion.copy(body.quaternion); }
      canvas.dataset.burstGravity = gravity.toFixed(3);
      canvas.dataset.phase = recovery > 0 ? "burst-recover" : "burst-gravity";
      if (recovery === 1) finishBurstGravity();
      return;
    }
    if (!usesPhysics()) {
      if (floatingMode === 'planet-belt') {
        const holding = (activePointer !== null || beltKeys.size > 0) && !easterEgg.active && workProgress() === 0;
        const targetSpeed = holding ? .95 : .10;
        const response = holding ? 6 : .85;
        const decay = Math.exp(-delta * response);
        beltAngle -= targetSpeed * delta + (beltSpeed - targetSpeed) * (1 - decay) / response;
        beltSpeed = targetSpeed + (beltSpeed - targetSpeed) * decay;
        canvas.dataset.beltSpeed = beltSpeed.toFixed(3);
      }
      cameraFrame(); arrange(delta); return;
    }
    if (floatingMode === "gravity") {
      cameraFrame();
      applyMagnet(delta);
      stepPhysics(delta);
      for (const { body, object } of items) { object.position.copy(body.position); object.quaternion.copy(body.quaternion); }
      canvas.dataset.phase = "gravity";
      return;
    }
    if (isFlowMode(floatingMode)) {
      const holding = beltKeys.size > 0 && !easterEgg.active && workProgress() === 0;
      flowBlend = Math.min(1, flowBlend + delta / 2.4);
      flowSpeed = THREE.MathUtils.damp(flowSpeed, holding ? 2.4 : 1, holding ? 3 : .85, delta);
      // Stop the old global camera roll gradually: front/back motion now comes
      // from actual three-dimensional currents. Scrolling still turns the scene.
      orbit = THREE.MathUtils.damp(orbit, Math.round(orbit / 10) * 10, 1.8, delta);
      if (workProgress() > 0) orbit += (.01 + workProgress() ** 2 * .65) * delta * 60;
      cameraFrame();
      updateReleaseDrag();
      applyFlowForces();
      applyMagnet(delta);
      stepPhysics(delta);
      for (const { body, object } of items) { object.position.copy(body.position); object.quaternion.copy(body.quaternion); }
      canvas.dataset.phase = floatingMode;
      return;
    }
    // Reference orbit is per-frame; normalize to 60Hz so high-refresh displays match it.
    const frameRatio=delta*60;
    if(workProgress()>0&&activePointer!==null)pointerCancel();
    const idleEntrance = THREE.MathUtils.smootherstep(elapsed, lastReleaseTime(), lastReleaseTime() + .65);
    orbit+=(workProgress()>0 ? .01 + Math.pow(workProgress(), 2)*.65 : power * idleEntrance)*frameRatio;
    // Keyboard acceleration eases back to idle; mouse presses apply magnetic force.
    power=referencePhysics.idlePower+(power-referencePhysics.idlePower)*Math.pow(referencePhysics.orbitDecay,frameRatio);
    cameraFrame();
    force.set(.02*Math.sin(elapsed/10),0,.02*Math.cos(elapsed/10));point.set(Math.cos(elapsed/15+50),Math.sin(elapsed/10+100),Math.cos(elapsed/20+150));
    for(const {body} of items){
      body.applyLocalForce(force,point);
      if (floatingMode === "physics-wave" && body.collisionResponse) {
        // A shared travelling current acts on the real bodies, so collisions and
        // portal hit targets stay aligned. Camera-up keeps the wave vertical on screen.
        const frequency = .8;
        const phase = elapsed * frequency - body.position.x / viewWidth * Math.PI * 2;
        const entrance = THREE.MathUtils.smoothstep(elapsed, 1.5, 3.5);
        const strength = entrance * (1 - workProgress());
        const desiredVelocity = Math.cos(phase) * viewHeight * .045 * frequency;
        const upY = Math.cos(angle), upZ = -Math.sin(angle);
        const verticalVelocity = body.velocity.y * upY + body.velocity.z * upZ;
        const current = (desiredVelocity - verticalVelocity) * .65 * strength;
        waveForce.set(0, upY * current, upZ * current);
        body.applyForce(waveForce);
      }
    }
    spreadFloatingItems();
    applyMagnet(delta);
    updateReleaseDrag();
    stepPhysics(delta);
    for(const {body,object} of items){object.position.copy(body.position);object.quaternion.copy(body.quaternion);}
    if(elapsed>1.5&&activePointer===null)canvas.dataset.phase='orbit';
  };
  // One progress value is shared with the DOM takeover. Camera-relative coordinates
  // keep the logo centered while the surrounding objects accelerate in world space.
  const updateLogoPose = () => {
    const p = workProgress();
    logo.visible = true;
    // Returning to the hero keeps the live physics state instead of replaying the entrance.
    // Acceleration belongs to the shared timeline; local phases only remap its progress.
    const travel = THREE.MathUtils.clamp((p - .2) / .8, 0, 1);
    const turn = reduced ? 0 : THREE.MathUtils.clamp((p - .08) / .82, 0, 1) * Math.PI * 2;
    logo.quaternion.copy(camera.quaternion).multiply(spin.setFromAxisAngle(spinAxis, turn + pointerYaw * (1 - p)));
    canvas.dataset.pointerYaw = String(pointerYaw);
    const introY = width < config.sizing.mobileBreakpoint ? 0 : height * (.5 - config.logo.centerY) / camera.zoom;
    const logoY = THREE.MathUtils.lerp(introY, (height / 2 - 44) / camera.zoom, travel);
    logoAnchor.set(0, logoY, 0).applyQuaternion(camera.quaternion);
    logo.position.copy(logoAnchor).addScaledVector(logoReturnOffset, reduced ? 0 : 1 - travel);
    const entranceProgress = reduced ? 1 : Math.min(1, logoEntranceTime / logoEntranceDuration);
    const entranceScale = .18 + .82 * (1 - Math.pow(1 - entranceProgress, 4));
    logo.scale.setScalar(THREE.MathUtils.lerp(logoScale * entranceScale, 72 / (3.1 * camera.zoom), travel));
    return { p, turn, logoY };
  };
  const composeWork = () => {
    const { p, turn, logoY } = updateLogoPose();
    const vanish = THREE.MathUtils.clamp((p - .16) / .54, 0, 1);
    const depthRange = Math.min(viewWidth, viewHeight) * config.depthSizing.range;
    const cameraDistance = camera.position.length();
    for (const { object, body, phase, billboard, entranceScale = 1 } of items) {
      const itemEntranceScale = entranceActive ? entranceScale : 1;
      // Signed depth relative to the logo plane, along the current camera axis.
      // This also follows the rotating camera in the original free-drift mode.
      const cameraDepth = object.position.dot(camera.position) / cameraDistance;
      const depthScale = floatingMode === "gravity" ? 1 : THREE.MathUtils.lerp(1, config.depthSizing.farScale,
        THREE.MathUtils.smoothstep(-cameraDepth, 0, depthRange));
      object.visible = p < .7 && itemEntranceScale > 0 && object.name !== "floating-pixel-vortex";
      object.scale.setScalar(assetScale * depthScale * itemEntranceScale * (usesPhysics() ? 1 : floatingMode === "diagonal-drift" ? width < 700 ? .65 : .85 : floatingMode === "planet-belt" ? width < 700 ? .40 : 1 : width < 700 ? .58 : .60) * (1 - vanish));
      object.quaternion.copy(billboard ? camera.quaternion : body.quaternion);
      if (p > 0 && !reduced && !billboard) {
        object.rotateY(p * p * (22 + phase));
        object.rotateX(p * p * 12);
      }
    }
    canvas.dataset.workProgress = p.toFixed(4);
    canvas.dataset.logoTurn = String(turn);
    canvas.dataset.logoTop = String(height / 2 - logoY * camera.zoom);
    canvas.dataset.visibleItems = String(p < .7 ? items.length : 0);
  };
  const updateReflection = () => {
      const background = scene.background;
      const backgroundIntensity = scene.backgroundIntensity;
      const logoVisible = logo.visible;
      logo.visible = false;
      scene.background = scene.environment;
      scene.backgroundIntensity = config.lighting.reflectionBackgroundIntensity * THREE.MathUtils.lerp(1, .48, lightingAmount);
      reflectionCamera.position.set(0, 0, .28).applyQuaternion(logo.quaternion).add(logo.position);
      let complete = false;
      try {
        complete = reflectionProbe.update(renderer, scene, reflectionDirty);
      } finally {
        logo.visible = logoVisible;
        scene.background = background;
        scene.backgroundIntensity = backgroundIntensity;
      }
      reflectionDirty = false;
      if (complete) {
        reflectionFrames++;
        canvas.dataset.reflections = String(reflectionFrames);
      }
  };
  const composeExport = () => {
    if (!exportLayout) return;
    const { rotation, tilt, spacing, size, motion, logoSize, depth } = exportLayout;
    const visibleItems = items.filter(item => item.object.name !== "floating-pixel-vortex");
    const slant = THREE.MathUtils.degToRad(tilt);
    logo.quaternion.copy(camera.quaternion);
    logo.scale.setScalar(logoScale * logoSize);
    const inverseCamera = camera.quaternion.clone().invert();
    visibleItems.forEach(({ object, billboard, body }, index) => {
      const phase = index / visibleItems.length * Math.PI * 2;
      const theta = phase + exportTime * .18 + THREE.MathUtils.degToRad(rotation) - .7;
      if (isFlowMode(motion)) {
        sampleFlow(motion, theta, index % 3, exportTime, viewWidth, viewHeight, object.position);
      } else if (motion === "diagonal-drift") {
        sampleFloatingDrift(index, exportTime + rotation / 6, viewWidth, viewHeight, object.position);
      } else if (motion === "physics") {
        object.position.copy(body.position).applyQuaternion(inverseCamera);
        object.position.applyAxisAngle(spinAxis, THREE.MathUtils.degToRad(rotation));
      } else {
        const ring = motion === "orbit" ? (index % 2 ? .8 : 1) : 1;
        const wave = motion === "wave" ? Math.sin(theta * 3 + exportTime) * .05 : 0;
        object.position.set(Math.cos(theta) * viewWidth * .36 * ring,
          (Math.sin(theta) * .32 * ring + wave) * viewHeight,
          Math.sin(theta) * Math.min(viewWidth, viewHeight) * .48);
      }
      object.position.x *= spacing;
      object.position.y *= spacing;
      const x = object.position.x, y = object.position.y;
      object.position.x = x * Math.cos(slant) - y * Math.sin(slant);
      object.position.y = x * Math.sin(slant) + y * Math.cos(slant);
      object.visible = true;
      object.scale.setScalar(assetScale * size);
      object.quaternion.copy(camera.quaternion);
      if (!billboard) { object.rotateX(.15); object.rotateY(Math.sin(index + exportTime * .3) * .25); object.rotateZ(index % 2 ? .12 : -.12); }
    });
    // All motion types share the same depth range, independently of XY spacing.
    // Shallow source paths (especially drift) must still respond visibly to this control.
    let minDepth = Infinity, maxDepth = -Infinity;
    for (const { object } of visibleItems) {
      minDepth = Math.min(minDepth, object.position.z);
      maxDepth = Math.max(maxDepth, object.position.z);
    }
    const centerDepth = (minDepth + maxDepth) / 2;
    const halfDepth = (maxDepth - minDepth) / 2;
    const extent = Math.min(viewWidth, viewHeight) * .48 * depth;
    visibleItems.forEach(({ object }, index) => {
      const normalizedDepth = halfDepth > .0001
        ? (object.position.z - centerDepth) / halfDepth
        : Math.sin(index / visibleItems.length * Math.PI * 2);
      object.position.z = normalizedDepth * extent;
      object.position.applyQuaternion(camera.quaternion);
    });
    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    if (options.vortexTarget) options.vortexTarget.style.display = "none";
    canvas.dataset.phase = "export";
  };
  const renderScene = () => {
    glow.render(() => glassComposite.render(scene, camera), () => renderer.render(skyScene, camera));
    rain.render(renderer);
  };
  const render=(time:number)=>{
    if (disposed || suspended) return;
    frame=requestAnimationFrame(render);
    const frameMs = time - previous;
    // One wall-time clock spans launch, orbit, release and drift. Fixed physics
    // substeps preserve collision stability without slowing down at the handoff.
    const delta=Math.min(frameMs/1000,referencePhysics.step * referencePhysics.maxSubSteps);previous=time;
    if(disposed||!visible||document.hidden||contextLost||!ready){resolution.reset();return;}
    // A monitor/DPR change need not resize the CSS viewport. Update buffers only,
    // never restart physics, the entrance, or pointer coordinates for resolution.
    if (nativeDpr !== window.devicePixelRatio) {
      nativeDpr = window.devicePixelRatio;
      resolution.setDevicePixelRatio(nativeDpr);
      resizeRenderBuffers();
    }
    const ratio = resolution.sample(time, ready && !paused && !reduced && workProgress() === 0);
    if (ratio !== renderer.getPixelRatio()) resizeRenderBuffers();
    if (ready && exportLayout && workProgress() === 0) {
      if (exportLayout.playing) {
        exportTime += delta;
        if (exportLayout.motion === "physics") {
          const savedMode = floatingMode; floatingMode = "physics"; step(delta); floatingMode = savedMode;
        }
      }
      cameraFrame(); composeWork(); composeExport();
      if (reflectionDirty || exportLayout.playing) updateReflection();
      sky.update(camera, viewWidth, viewHeight, 0, 0, rainAmount);
      sky.prepare(renderer); renderScene();
      return;
    }
    // Once the hero becomes the stationary header logo, skip scene updates as
    // well as drawing. Scroll, resize and context restoration invalidate this.
    if (ready && workProgress() === 1 && renderedWorkProgress === 1 && !reflectionDirty) return;
    if(pointerRectDirty){pointerRect=host.getBoundingClientRect();pointerRectDirty=false;}
    // Start when the loading overlay releases the scene, not while assets load.
    if (ready && !paused) {
      logoEntranceTime = reduced || workProgress() > 0
        ? logoEntranceDuration
        : Math.min(logoEntranceDuration, logoEntranceTime + delta);
    }
    if (ready && !paused && !reduced && workProgress() < 1) {
      const rotation = (scene.environmentRotation.y + config.lighting.environmentRotationSpeed * delta) % (Math.PI * 2);
      scene.environmentRotation.y = rotation;
      // The logo probe and other materials must see the same environment direction.
      scene.backgroundRotation.y = rotation;
    }
    if (!paused) advanceLogoReturn(delta);
    if (easterEgg.active && workProgress() > 0) easterEgg.cancel();
    pointerYaw = THREE.MathUtils.lerp(pointerYaw, reduced ? 0 : pointer.x * .675, .12);
    if (!easterEgg.active) {
      if(ready&&!paused&&!reduced&&workProgress()<1)step(delta);else cameraFrame();
      composeWork();
    } else if (!paused) {
      if (!reduced) step(delta); else cameraFrame();
      // Keep the same live baseline during the effect and after it. In particular,
      // the logo must retain its pointer yaw instead of snapping back on handoff.
      composeWork();
      easterEgg.update(delta);
    }
    if (!paused && !reduced) vortexTime += delta * (easterEgg.active ? 2.5 : 1);
    const portalScale = vortexAnimation?.mesh.parent?.parent?.scale.x ?? assetScale;
    vortexAnimation?.update(reduced ? 0 : vortexTime, easterEgg.active ? THREE.MathUtils.clamp((portalScale / assetScale - .16) / 2.34, 0, 1) : 1);
    if (ready && !paused && !reduced && workProgress() < 1) portalGunAnimation?.update(delta);
    scene.updateMatrixWorld();
    camera.updateMatrixWorld();
    rainAmount = reduced ? (weather === "rainy" ? 1 : 0) : THREE.MathUtils.damp(rainAmount, weather === "rainy" ? 1 : 0, 3, delta);
    if (ready) updateWeatherLighting(rainAmount * (1 - workProgress()));
    sky.update(camera, viewWidth, viewHeight, paused || reduced ? 0 : delta, workProgress(), rainAmount);
    rain.update(paused || reduced ? 0 : delta, rainAmount * (1 - workProgress()) * (ready && !paused ? 1 : 0), host.clientWidth, host.clientHeight);
    canvas.dataset.weather = weather;
    canvas.dataset.clouds = "shadertoy-4tdSWr";
    // Capture one face per display frame and blend completed reflections between
    // captures. Initial/invalidation captures stay atomic, including static views.
    if (ready && (reflectionDirty || (!paused && !reduced && workProgress()<1))) {
      updateReflection();
    }
    updateVortexTarget();
    sky.prepare(renderer);
    if (ready) renderScene(); else renderer.render(scene, camera);
    renderedWorkProgress = ready ? workProgress() : -1;
    if(ready){canvas.dataset.ready='true';if(time-snapshotTime>150){canvas.dataset.contacts=String(contacts);canvas.dataset.angle=String(angle);canvas.dataset.steps=String(world.stepnumber);snapshotTime=time;}}
  };
  frame=requestAnimationFrame(render);
  const loader=new GLTFLoader(homeAssetManager);
  const loadTexture = async (url: string) => {
    if (!options.platform) return new THREE.TextureLoader(homeAssetManager).loadAsync(url);
    const bitmap = await new THREE.ImageBitmapLoader(homeAssetManager)
      .setOptions({ imageOrientation: "flipY", premultiplyAlpha: "none" }).loadAsync(url);
    const texture = new THREE.Texture(bitmap);
    texture.flipY = false;
    texture.needsUpdate = true;
    texture.addEventListener("dispose", () => bitmap.close());
    return texture;
  };
  const modelFiles = new THREE.FileLoader(homeAssetManager).setResponseType("arraybuffer");
  let parseQueue: Promise<unknown> = Promise.resolve();
  const loadModel = async (path: string) => {
    // Network caching is independent from expensive parsing. Parse one model at a
    // time inside the worker, including while the visitor is below the hero.
    const bytes = await modelFiles.loadAsync(path);
    const parsed = parseQueue.then(async () => {
      await yieldStartup();
      if (disposed) throw new Error("Home scene disposed before model parsing");
      return loader.parseAsync(bytes as ArrayBuffer, THREE.LoaderUtils.extractUrlBase(homeAssetManager.resolveURL(path)));
    });
    parseQueue = parsed.catch(() => {});
    return parsed;
  };
  const filenames=config.plaques.items.map(item => item.file);
  const loadedObjects:THREE.Object3D[]=[];
  const characterModels = Promise.all(config.characters.items.map(({file}) =>
    loadModel(`/assets/models/home-optimized/emotions/${file}.glb`).then(gltf => {
      gltf.scene.name = `emotion-${file}`;
      track(gltf.scene);
      if (disposed) { geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); }
      return gltf.scene;
    })
  ));
  const skaterTexture = config.skater.visible ? loadTexture(config.skater.image).then(texture => {
    resources.add(texture);
    if (disposed) texture.dispose();
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }) : Promise.resolve(null);
  const cutoutTextures = Promise.all(config.cutouts.map(({ file }) =>
    loadTexture(`/assets/images/floating/${file}.png`).then(texture => {
      resources.add(texture);
      if (disposed) texture.dispose();
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    })
  ));
  const portalGunModel = createChromePortalGun().then(animation => {
    portalGunAnimation = animation;
    const model = animation.scene;
    track(model);
    if (disposed) {
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(material => material.dispose());
    }
    return model;
  });
  const sculptedModels = Promise.all(config.sculptedProps.map(({ file, path, ...setting }) =>
    loadModel(path).then(({ scene: model }) => {
      model.name = `floating-sculpted-${file}`;
      track(model);
      const parameters = "material" in setting ? setting.material : undefined;
      if (parameters) {
        const overrides = new Map<THREE.Material, THREE.Material>();
        const convert = (source: THREE.Material) => {
          if (!(source instanceof THREE.MeshStandardMaterial)) return source;
          if (!overrides.has(source)) overrides.set(source, applyMaterial(source, parameters));
          return overrides.get(source)!;
        };
        model.traverse(child => {
          if (!(child instanceof THREE.Mesh)) return;
          child.material = Array.isArray(child.material) ? child.material.map(convert) : convert(child.material);
        });
      }
      if (file === "vinyl") {
        applyVinylMaterial(model, config.vinyl);
        track(model);
      }
      if (disposed) {
        geometries.forEach(geometry => geometry.dispose());
        materials.forEach(material => material.dispose());
        resources.forEach(texture => texture.dispose());
      }
      return model;
    })
  ));
  const celestialModels = Promise.all((["planet", "cloud"] as const).map(kind =>
    loadModel(config.celestial[kind].path).then(({ scene: model }) => {
      model.name = kind === "planet" ? "floating-metal-saturn" : "floating-chrome-rain-cloud";
      track(model);
      model.traverse(child => {
        if (!(child instanceof THREE.Mesh)) return;
        const parameters = kind === "planet" && child.name === "planet-ring"
          ? config.celestial.planet.ringMaterial : config.celestial[kind].material;
        child.material = Array.isArray(child.material)
          ? child.material.map(material => applyMaterial(material, parameters))
          : applyMaterial(child.material, parameters);
      });
      if (disposed) {
        geometries.forEach(geometry => geometry.dispose());
        materials.forEach(material => material.dispose());
      }
      return model;
    })
  ));
  const loaded = Promise.all([skaterTexture, characterModels, cutoutTextures, portalGunModel, sculptedModels, celestialModels, Promise.all([
    (/\.exr$/i.test(config.lighting.environment) ? new EXRLoader(homeAssetManager) : /\.hdr$/i.test(config.lighting.environment) ? new HDRLoader(homeAssetManager) : { loadAsync: loadTexture }).loadAsync(config.lighting.environment).then(texture=>{resources.add(texture);if(disposed)texture.dispose();return texture;}),
    ...filenames.map(file=>loadModel(`/assets/models/home-optimized/plaques/${file}.glb`).then(gltf=>{gltf.scene.name=file;track(gltf.scene);loadedObjects.push(gltf.scene);if(disposed){track(gltf.scene);geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}return gltf.scene;})),
  ])]).then(async ([cutout, characters, floatingTextures, portalGun, sculptures, celestial, [environment,...models]])=>{
    await skyReady;
    await yieldStartup();
    if(disposed)return;
    const env=environment as THREE.Texture;env.mapping=THREE.EquirectangularReflectionMapping;
    // Decode display-encoded images; HDR/EXR loaders already provide linear data.
    if (/\.(jpe?g|png|webp)$/i.test(config.lighting.environment)) env.colorSpace = THREE.SRGBColorSpace;
    scene.environment=env;
    scene.environmentIntensity=config.lighting.environmentIntensity;
    for(const [index,model] of models.entries()) {
      const setting = config.plaques.items[index];
      const overrides = new Map<THREE.Material, THREE.Material>();
      (model as THREE.Object3D).traverse(child => {
        if (!(child instanceof THREE.Mesh)) return;
        const apply = (material: THREE.Material) => {
          if (overrides.has(material)) return overrides.get(material)!;
          const result = applyMaterial(material, {
            ...config.plaques.material,
            ...(material.name.startsWith("Resin") ? { color: setting.color, ...setting.material } : setting.letteringMaterial),
          });
          overrides.set(material, result);
          return result;
        };
        child.material = Array.isArray(child.material) ? child.material.map(apply) : apply(child.material);
      });
      add(model as THREE.Object3D,config.plaques.items[index].size,index);
      await yieldStartup();
      if (disposed) return;
    }
    await yieldStartup();
    if (disposed) return;
    add(portalGun,config.portalGun.size,items.length);
    const wordmark = new THREE.Mesh(createJimmyWordmarkGeometry(), new THREE.MeshPhysicalMaterial(config.wordmark.material));
    wordmark.name = "floating-jimmy-wordmark";
    add(wordmark, config.wordmark.size, items.length);
    characters.forEach((model, index) => {
      const setting: FloatingModelConfig = config.characters.items[index];
      model.scale.fromArray(setting.axisScale);
      model.traverse(child => {
        if (!(child instanceof THREE.Mesh)) return;
        const apply = (material: THREE.Material) => {
          const parameters = setting.materials[material.name];
          return parameters ? applyMaterial(material, parameters) : material;
        };
        child.material = Array.isArray(child.material) ? child.material.map(apply) : apply(child.material);
      });
      add(model, setting.size, items.length);
    });
    add(celestial[0], config.celestial.planet.size, items.length);
    add(celestial[1], config.celestial.cloud.size, items.length);
    if (cutout) {
      const image = cutout.image as { width: number; height: number };
      const skater = new THREE.Mesh(
        new THREE.PlaneGeometry(image.width / image.height, 1),
        // A flat cutout has no back/front layers to sort; one double-sided pass
        // produces the same pixels in the camera and reflection probe.
        new THREE.MeshBasicMaterial({ ...config.skater.material, map: cutout, forceSinglePass: true }),
      );
      skater.name = "skater-billboard";
      add(skater, config.skater.size, items.length, true);
    }
    floatingTextures.forEach((texture, index) => {
      const setting = config.cutouts[index];
      const image = texture.image as { width: number; height: number };
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(image.width / image.height, 1),
        new THREE.MeshBasicMaterial({ ...config.skater.material, map: texture, forceSinglePass: true }),
      );
      mesh.name = `floating-cutout-${setting.file}`;
      add(mesh, setting.size, items.length, true);
    });
    sculptures.forEach((model, index) => add(model, config.sculptedProps[index].size, items.length));
    await yieldStartup();
    if (disposed) return;
    add(createGoodLuckCylinder(config.referenceSculptures.goodLuck), config.referenceSculptures.goodLuck.size, items.length);
    await yieldStartup();
    if (disposed) return;
    add(createEatSculpture(config.referenceSculptures.eat.inflation), config.referenceSculptures.eat.size, items.length);
    canvas.dataset.sculptedProps = String(sculptures.length + 2);
    config.glass.items.forEach(setting => {
      add(createFloatingGlass(setting, config.glass.finish, glassComposite.uniforms), setting.size, items.length);
      glassComposite.register(items[items.length - 1].object);
    });
    canvas.dataset.glassProps = String(config.glass.items.length);
    vortexAnimation = createPixelVortex(config.vortex);
    add(vortexAnimation.mesh, config.vortex.size, items.length, true);
    vortexAnimation.mesh.parent!.parent!.visible = false;
    // A hidden effect must not collide with the floating toys.
    const portalBody = items[items.length - 1].body;
    portalBody.collisionFilterMask = 0;
    portalBody.collisionResponse = false;
    canvas.dataset.billboards = String((cutout ? 1 : 0) + floatingTextures.length);
    canvas.dataset.cutouts = String(floatingTextures.length);
    canvas.dataset.characters = String(characters.length);
    bakedMaterials = createBakedPropMaterials(renderer, scene);
    // Retain the plaques' embossed highlights and all metallic reflections.
    for (const item of items.slice(models.length)) {
      if (item.object.name === "floating-sculpted-vinyl" || item.object.name.startsWith("floating-glass-")) continue;
      bakedMaterials!.apply(item.object);
      await yieldStartup();
      if (disposed) return;
    }
    items.forEach((item, index) => {
      // Only plaques use plaster; floating props retain their materials at every depth.
      if (index >= models.length) return;
      plasterMaterials.apply(item.object, true);
    });
    await yieldStartup();
    if (disposed) return;
    resize();reset();
    // Prepare programs before the first visible frame rather than during entrance motion.
    await renderer.compileAsync(scene, camera);
    if (disposed) return;
    await yieldStartup();
    if (disposed) return;
    reset();
    ready=true;
    previous=performance.now();
    canvas.dataset.startupMs=String(Math.round(previous-startupTime));
    canvas.dataset.plaques=String(models.length);canvas.dataset.environment=config.lighting.environment;
    canvas.dataset.phase=reduced?'static':'entrance';
  }).catch(error=>{if(!disposed){canvas.dataset.assetError='true';options.onError?.(error);}});
  const exportFigmaLayers = () => {
    if (!ready) throw new Error("Scene is not ready");
    paused = true; reduced = true; reset(); cameraFrame();
    const positions: Record<string,[number,number]> = {
      'floating-green-portal-gun':[998,635], 'floating-jimmy-wordmark':[820,710],
      'floating-metal-saturn':[630,778], 'floating-chrome-rain-cloud':[449,775],
      'floating-cutout-blue-organic-table':[275,768], 'floating-cutout-blue-pierced-star':[176,700],
      'floating-cutout-yellow-smiley-loop':[257,563], 'floating-cutout-flat-apple':[271,450],
      'floating-cutout-cape-horse':[425,326], 'floating-cutout-cupid':[634,253],
      'floating-cutout-flying-pig':[843,170], 'floating-cutout-goldfish-silver-headphones':[1034,193],
      'floating-cutout-jimmyzz-vintage-car':[1134,267], 'floating-sculpted-sculpted-branches':[1230,356],
      'floating-sculpted-crimson-cell':[1218,457], 'floating-sculpted-arrow':[1097,595],
      'floating-sculpted-c-mark':[911,718], 'floating-sculpted-good-luck':[691,769],
      'floating-sculpted-eat':[480,790], 'floating-glass-lime-triangle':[319,770]
    };
    items.forEach((item,index)=>{
      const point=positions[item.object.name];if(!point)return;
      item.object.position.set((point[0]/1420-.5)*viewWidth,(.5-point[1]/992)*viewHeight,.2);
      item.body.position.set(item.object.position.x, item.object.position.y, item.object.position.z);
      const a=2*Math.PI*index/items.length+.35;
      if(!item.billboard)item.body.quaternion.setFromEuler(Math.sin(a)*.35*1.3,Math.cos(a)*.35*1.3,(index%2?1:-1)*.2*1.3);
    });
    composeWork();
    scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
    sky.update(camera, viewWidth, viewHeight, 0, 0, 0);
    sky.prepare(renderer);
    const nodes = [...items.map(item => item.object), ...logo.children];
    const saved = nodes.map(node => node.visible);
    const results: {name:string;x:number;y:number;width:number;height:number;data:string}[] = [];
    const grab = (name:string, full=false) => {
      const tmp=document.createElement('canvas'); tmp.width=canvas.width; tmp.height=canvas.height;
      const ctx=tmp.getContext('2d')!; ctx.drawImage(canvas,0,0);
      let x0=tmp.width,y0=tmp.height,x1=0,y1=0;
      if(full){x0=0;y0=0;x1=tmp.width-1;y1=tmp.height-1;}
      else {const d=ctx.getImageData(0,0,tmp.width,tmp.height).data;
        for(let y=0;y<tmp.height;y++)for(let x=0;x<tmp.width;x++)if(d[(y*tmp.width+x)*4+3]>0){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}}
      if(x1<x0||y1<y0)return;
      const crop=document.createElement('canvas');crop.width=x1-x0+1;crop.height=y1-y0+1;
      crop.getContext('2d')!.drawImage(tmp,x0,y0,crop.width,crop.height,0,0,crop.width,crop.height);
      const ratio=width/canvas.width;
      results.push({name,x:x0*ratio,y:y0*ratio,width:crop.width*ratio,height:crop.height*ratio,data:crop.toDataURL('image/png')});
    };
    nodes.forEach(node=>node.visible=false);
    renderer.setRenderTarget(null);renderer.autoClear=true;renderer.setClearColor(0,0);renderer.clear();renderer.render(skyScene,camera);grab('00 · 天空与云层',true);
    nodes.forEach((node,index)=>{ if(!saved[index])return; node.visible=true;scene.updateMatrixWorld(true);
      renderer.setRenderTarget(null);renderer.autoClear=true;renderer.setClearColor(0,0);renderer.clear();
      glassComposite.render(scene,camera);grab(index<items.length?node.name:'ZZ · 金属片 '+(index-items.length+1));node.visible=false; });
    nodes.forEach((node,index)=>node.visible=saved[index]);
    glassComposite.render(scene,camera,skyScene);
    return results;
  };
  const debug={exportFigmaLayers,snapshot:()=>({exportMode:exportLayout ? {...exportLayout,time:exportTime} : null,glow:glow.snapshot(),glass:glassComposite.snapshot(),sky:sky.snapshot(),lighting:{amount:lightingAmount,environmentIntensity:scene.environmentIntensity,exposure:renderer.toneMappingExposure,ambientIntensity:ambient.intensity,studio:studio.children.map(light=>({intensity:(light as THREE.Light).intensity,color:(light as THREE.Light).color.getHexString()}))},ready,paused,reduced,reflectionFrames,elapsed,angle,power,beltAngle,beltSpeed,steps:world.stepnumber,contacts,collisionPairs:[...collisions],bursts,view:{width:viewWidth,height:viewHeight},bounds:{scale:boundsScale,width:motionWidth,height:motionHeight},assetScale,camera:camera.position.toArray(),logoBody:{id:logoBody.id,shapes:logoBody.shapes.length,collisionFilterMask:logoBody.collisionFilterMask,position:logoBody.position.toArray(),scale:colliderScale},logoQuaternion:logo.quaternion.toArray(),cameraQuaternion:camera.quaternion.toArray(),bodies:items.map(({body,object,billboard,entranceReleased})=>({id:body.id,name:object.name,collisionFilterMask:body.collisionFilterMask,entranceReleased:!!entranceReleased,bodyType:body.type,billboard:!!billboard,visualQuaternion:object.quaternion.toArray(),visualPosition:object.position.toArray(),position:body.position.toArray(),velocity:body.velocity.toArray(),quaternion:body.quaternion.toArray(),mass:body.mass}))}),replay:reset};
  const debugCanvas=canvas as HTMLCanvasElement & {__chromeDebug?:typeof debug};
  if(options.debug)debugCanvas.__chromeDebug=debug;
  return {
    loaded: Promise.all([loaded, skyReady]),
    setFloatingMode(value: FloatingMode) {
      if (value === floatingMode) return;
      const wasGravity = floatingMode === "gravity";
      const wasPhysics = usesPhysics();
      cancelMagnet(); easterEgg.cancel(); floatingMode = value;
      flowBlend = entranceActive && isFlowMode(value) ? 1 : 0;
      items.forEach(({ body }) => {
        if (body.collisionResponse && body.type === CANNON.Body.DYNAMIC) body.collisionFilterMask = propMask();
        body.angularDamping = isFlowMode(value) ? .16 : referencePhysics.angularDamping;
        body.wakeUp();
      });
      const gravityChanged = wasGravity || value === "gravity";
      if (gravityChanged) {
        makeWalls();
        items.forEach(item => shapeBody(item.body, item.originalSize.clone().multiplyScalar(assetScale), item.billboard));
      }
      const keepPhysics = wasPhysics && usesPhysics() && !gravityChanged;
      if (!usesPhysics()) {
        entranceActive = false;
        items.forEach(item => {
          item.body.type = CANNON.Body.DYNAMIC;
          item.body.collisionFilterMask = item.object.name === 'floating-pixel-vortex' ? 0 : propMask();
          item.body.updateMassProperties();
        });
      }
      if (!keepPhysics) { orbit = 0; elapsed = 0; beltAngle = 0; beltSpeed = .10; }
      reflectionDirty = true;
      canvas.dataset.motionMode = value;
      if (ready && (gravityChanged || (!keepPhysics && usesPhysics()) || reduced)) reset();
    },
    setWeather(value: HomeWeather) { weather = value; reflectionDirty = true; },
    setSuspended(value: boolean) {
      if (suspended === value || disposed) return;
      suspended = value;
      if (value) {
        cancelAnimationFrame(frame);
        cancelMagnet();
        easterEgg.cancel();
        observer.disconnect();
        visibility.disconnect();
        if (options.vortexTarget) options.vortexTarget.style.display = "none";
      } else {
        previous = performance.now();
        pointerRectDirty = true;
        renderedWorkProgress = -1;
        visible = true;
        resizeIfNeeded();
        observer.observe(host);
        visibility.observe(host);
        frame = requestAnimationFrame(render);
      }
    },
    setPaused(value:boolean){paused=value;if(value)cancelMagnet();},
    setExportLayout(value: ExportLayout | null) {
      if (value && !exportLayout) { finishBurstGravity(); pointerCancel(); easterEgg.cancel(); exportTime = 0; }
      exportLayout = value ? {
        motion: value.motion, playing: value.playing,
        depth: THREE.MathUtils.clamp(value.depth, 0, 2.5),
        logoSize: THREE.MathUtils.clamp(value.logoSize, .3, 1.2),
        rotation: Number.isFinite(value.rotation) ? value.rotation : 0,
        tilt: THREE.MathUtils.clamp(value.tilt, -70, 70),
        spacing: THREE.MathUtils.clamp(value.spacing, .6, 1.4),
        size: THREE.MathUtils.clamp(value.size, .3, 1.8),
      } : null;
      if (!exportLayout) {
        items.forEach(({ object, body }) => { object.position.copy(body.position); object.quaternion.copy(body.quaternion); });
      }
      if (ready) { cameraFrame(); composeWork(); composeExport(); }
      reflectionDirty = true;
    },
    exportFrame(): Promise<Blob> {
      if (!ready || disposed || contextLost) return Promise.reject(new Error("场景尚未准备好，请稍后重试。"));
      const context = renderer.getContext();
      const maxSize = Math.min(renderer.capabilities.maxTextureSize, context.getParameter(context.MAX_RENDERBUFFER_SIZE));
      const ratio = Math.min(4, maxSize / width, maxSize / height, Math.sqrt(32_000_000 / (width * height)));
      const target = renderer.getRenderTarget();
      try {
        // Re-render the current pose without advancing time or resetting the orbit.
        renderer.setRenderTarget(null);
        renderer.setDrawingBufferSize(width, height, ratio);
        glassComposite.resize(width, height, ratio, 4);
        glow.resize(width, height, ratio, 4);
        sky.prepare(renderer);
        renderScene();
        // Snapshot before restoring the live buffers; PNG encoding is asynchronous.
        return new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("高清图片生成失败，请重试。")), "image/png");
        });
      } finally {
        resizeRenderBuffers();
        renderer.setRenderTarget(target);
      }
    },
    replay(){if(ready)reset();},
    dispose(){
      window.visualViewport?.removeEventListener("resize", updateViewportFloor);
      disposed=true;window.removeEventListener('keyup',keyUp);canvas.removeEventListener("pointerleave",pointerLeave);pointerCancel();easterEgg.cancel();cancelAnimationFrame(frame);
      window.removeEventListener('scroll',invalidatePointerRect);
      window.removeEventListener('blur',cancelMagnet);document.removeEventListener('visibilitychange',pageVisibility);
      options.vortexTarget?.removeEventListener('pointerdown', vortexActivate);
      options.vortexTarget?.removeEventListener('click', vortexActivate);
      if (options.vortexTarget) options.vortexTarget.style.display = 'none';observer.disconnect();visibility.disconnect();
      canvas.removeEventListener('pointerdown',pointerDown);canvas.removeEventListener('pointermove',pointerMove);canvas.removeEventListener('pointerup',pointerUp);canvas.removeEventListener('pointercancel',cancelMagnet);canvas.removeEventListener('click',touchClick);canvas.removeEventListener('lostpointercapture',pointerCancel);canvas.removeEventListener('keydown',key);media.removeEventListener('change',preference);canvas.removeEventListener('webglcontextlost',lost);canvas.removeEventListener('webglcontextrestored',restored);
      bakedMaterials?.dispose();
      plasterMaterials.dispose();
      reflectionProbe.dispose();
      glassComposite.dispose();
      glow.dispose();
      sky.dispose();
      rain.dispose();
      scene.clear();[...world.bodies].forEach(body=>world.removeBody(body));resources.forEach(texture=>texture.dispose());geometries.forEach(geometry=>geometry.dispose());materials.forEach(material=>material.dispose());reflectionTarget.dispose();renderer.dispose();delete debugCanvas.__chromeDebug;delete canvas.dataset.ready;
    },
  };
}
