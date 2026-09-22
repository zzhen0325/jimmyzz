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
import { createChromePlanet, createChromeRainCloud } from "./chrome-celestial";
import { mergeRigidMeshes } from "./merge-rigid-meshes";

export type FloatingMode = "orbit" | "wave" | "parallax" | "physics" | "physics-wave" | "planet-belt";

export type ChromeWorldOptions = { floatingMode?: FloatingMode; vortexTarget?: HTMLButtonElement; workProgress?: { readonly current: number }; paused?: boolean; debug?: boolean; onError?: (error: unknown) => void };
type Item = { object: THREE.Group; body: CANNON.Body; originalSize: THREE.Vector3; phase: number; billboard?: boolean };

// SOURCE: twomuch.studio module 3614 / 3645 / 5743, captured 2026-09-11.
// The scene is zero-gravity inside a 20-plane cylinder. Initial body overlap
// contributes to the entrance burst, alongside a radial launch velocity.
export const referencePhysics = {
  step: 1 / 60, maxSubSteps: 1, iterations: 5, stiffness: 1e6,
  friction: 0, angularDamping: .5, linearDamping: .01,
  releaseImpulse: 15, localForce: .02, wheelDivisor: 800,
  orbitDecay: .98, idlePower: .01, orbitRadians: 2 * Math.PI / 10,
};

export function createChromeWorld(canvas: HTMLCanvasElement, options: ChromeWorldOptions = {}) {
  const host = canvas.parentElement!;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  // Keep lighting linear internally, then compress highlights before display encoding.
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = config.lighting.exposure;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
  const scene = new THREE.Scene();
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
  const items: Item[] = [];
  const walls: CANNON.Body[] = [];
  const resources = new Set<THREE.Texture>();
  const materials = new Set<THREE.Material>();
  const geometries = new Set<THREE.BufferGeometry>();
  const media = matchMedia("(prefers-reduced-motion: reduce)");
  let reduced = media.matches;
  let paused = !!options.paused;
  let disposed = false;
  let ready = false;
  let visible = true;
  let contextLost = false;
  let frame = 0;
  let previous = 0;
  let elapsed = 0;
  let vortexTime = 0;
  let vortexAnimation: ReturnType<typeof createPixelVortex> | undefined;
  let floatingMode: FloatingMode = options.floatingMode ?? "physics";
  const usesPhysics = () => floatingMode === "physics" || floatingMode === "physics-wave";
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
  let width = 1;
  let height = 1;
  let viewWidth = 6;
  let viewHeight = 3;
  let assetScale = 1;
  let logoScale = 1;
  const logoEntranceDuration = .95;
  // Independent from physics resets: resizing or returning home must not replay it.
  let logoEntranceTime = 0;
  const workProgress = () => options.workProgress?.current ?? 0;
  const spinAxis = new THREE.Vector3(0, 1, 0);
  const spin = new THREE.Quaternion();
  let contacts = 0;
  const bursts = 0;
  let activePointer: number | null = null;
  let pointerYaw = 0;
  let snapshotTime = 0;
  const pointer = new THREE.Vector2();
  const force = new CANNON.Vec3();
  const point = new CANNON.Vec3();
  const collisions = new Set<string>();

  const chrome = new THREE.MeshPhysicalMaterial(config.logo.material);
  materials.add(chrome);
  // Local reflection probe: only the logo receives this map. The other objects
  // retain the panorama, avoiding recursive render-target feedback.
  const reflectionTarget = new THREE.WebGLCubeRenderTarget(host.clientWidth < 700 ? 128 : 256, {
    type: THREE.HalfFloatType,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
  });
  const reflectionCamera = new THREE.CubeCamera(.05, 50, reflectionTarget);
  let reflectionTime = -Infinity;
  let reflectionFrames = 0;
  let reflectionDirty = true;
  let renderedWorkProgress = -1;
  scene.add(new THREE.AmbientLight(config.lighting.ambient.color, config.lighting.ambient.intensity));
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
  const logoBody=new CANNON.Body({type:CANNON.Body.STATIC,collisionFilterGroup:2});
  world.addBody(logoBody);

  const track=(object:THREE.Object3D)=>object.traverse(child=>{
    if(!(child instanceof THREE.Mesh))return;
    geometries.add(child.geometry);
    for(const material of Array.isArray(child.material)?child.material:[child.material]){
      materials.add(material);
      for(const value of Object.values(material))if(value instanceof THREE.Texture)resources.add(value);
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
    // Only the outer group moves. Reuse every internal local transform in all
    // six reflection views as well as the main view.
    normalized.traverse(child => { child.updateMatrix(); child.matrixAutoUpdate = false; });
    const group=new THREE.Group();group.name=object.name||`chrome-${index}`;group.add(normalized);scene.add(group);
    const originalSize=dimensions.multiplyScalar(normalization);
    const body=new CANNON.Body({mass:1,allowSleep:true,angularDamping:.5,linearDamping:.01,collisionFilterGroup:2});
    body.addEventListener('collide',(event:{body:CANNON.Body})=>{contacts++;collisions.add([body.id,event.body.id].sort((a,b)=>a-b).join(':'));});
    world.addBody(body);items.push({object:group,body,originalSize,phase:2*Math.PI/10*index,billboard});
  };
  const makeWalls=()=>{
    walls.forEach(body=>world.removeBody(body));walls.length=0;
    const plane=(position:number[],rotation:number[],type:typeof CANNON.Body.STATIC | typeof CANNON.Body.KINEMATIC)=>{const body=new CANNON.Body({type,collisionFilterGroup:2});body.addShape(new CANNON.Plane());body.position.set(position[0],position[1],position[2]);body.quaternion.setFromEuler(rotation[0],rotation[1],rotation[2]);world.addBody(body);walls.push(body);};
    for(let i=0;i<20;i++){const theta=Math.PI+2*Math.PI/20*i;plane([0,Math.cos(theta)*viewHeight/2,Math.sin(theta)*viewHeight/2],[theta+Math.PI/2,0,0],CANNON.Body.STATIC);}
    plane([-viewWidth/2,0,0],[0,Math.PI/2,0],CANNON.Body.KINEMATIC);plane([viewWidth/2,0,0],[0,-Math.PI/2,0],CANNON.Body.KINEMATIC);
  };
  const shapeBody=(body:CANNON.Body,size:THREE.Vector3,billboard=false)=>{
    while(body.shapes.length)body.removeShape(body.shapes[0]);
    // A sphere keeps the billboard collision footprint independent of camera orientation.
    body.addShape(billboard ? new CANNON.Sphere(Math.max(size.x,size.y)*.43) : new CANNON.Box(new CANNON.Vec3(size.x/2,size.y/2,Math.max(.025,size.z/2))));body.updateMassProperties();body.updateBoundingRadius();body.aabbNeedsUpdate=true;
  };
  const reset=()=>{
    easterEgg.cancel();
    lastVortexHover = null;
    reflectionDirty=true;
    beltAngle=0;beltSpeed=.10;orbit=0;power=.01;angle=0;elapsed=0;world.time=0;world.accumulator=0;world.stepnumber=0;contacts=0;collisions.clear();
    items.forEach((item,index)=>{
      item.body.position.set(0,0,Math.sin(index)*Math.PI/6);
      item.body.quaternion.set(0,0,0,1);item.body.velocity.setZero();item.body.angularVelocity.setZero();item.body.force.setZero();item.body.torque.setZero();item.body.wakeUp();
      if(!reduced && usesPhysics()){
        // Launch in evenly spread screen directions, with a little depth and tumble.
        const a=2*Math.PI*index/items.length + .35;
        const speed=2.4 + (index % 3)*.35;
        item.body.velocity.set(Math.cos(a)*speed,Math.sin(a)*speed,(index % 2 ? 1 : -1)*.45);
        item.body.angularVelocity.set(Math.sin(a)*2,Math.cos(a)*2,(index % 2 ? 1 : -1)*1.2);
      }
      if(reduced){const a=2*Math.PI*index/items.length;item.body.position.set(Math.cos(a)*viewWidth*.35,Math.sin(a)*viewHeight*.35,.2);}
      item.object.position.copy(item.body.position);item.object.quaternion.copy(item.body.quaternion);
    });
    if (!usesPhysics()) arrange(0, true);
    canvas.dataset.motionMode = floatingMode;
    canvas.dataset.phase=reduced?'static':floatingMode;
  };
  const resize=()=>{
    renderedWorkProgress = -1;
    easterEgg.cancel();
    const rect=host.getBoundingClientRect();width=rect.width;height=rect.height;
    camera.left=-width/2;camera.right=width/2;camera.top=height/2;camera.bottom=-height/2;camera.zoom=(width+height)/9;camera.updateProjectionMatrix();
    viewWidth=width/camera.zoom;viewHeight=height/camera.zoom;
    const oldScale=assetScale;assetScale=width<config.sizing.mobileBreakpoint?config.sizing.mobile:config.sizing.desktop;
    logoScale = Math.min(config.logo.scale,viewWidth*config.logo.maxViewportWidth/3.1);
    logo.scale.setScalar(logoScale);
    shapeBody(logoBody,new THREE.Vector3(3.1*logo.scale.x,1.05*logo.scale.y,.16));
    items.forEach(item=>{shapeBody(item.body,item.originalSize.clone().multiplyScalar(assetScale),item.billboard);item.object.scale.setScalar(assetScale);if(ready&&oldScale!==assetScale)item.body.position.scale(assetScale/oldScale,item.body.position);});
    makeWalls();renderer.setSize(width,height,false);
    // Viewport changes invalidate wall containment; restart the same entrance instead of
    // teleporting individual bodies into arrangement slots or leaving bodies outside walls.
    if(ready)reset();
  };
  const updatePointer=(event:PointerEvent)=>{const r=host.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width*2-1,-((event.clientY-r.top)/r.height*2-1));};
  const vortexBox = new THREE.Box3();
  const vortexMin = new THREE.Vector2(), vortexMax = new THREE.Vector2();
  const vortexCorner = new THREE.Vector3(), vortexPixel = new THREE.Vector2();
  const coarsePointer = matchMedia('(pointer: coarse)');
  const vortexBounds = () => {
    const mesh = items.find(item => item.object.name === "floating-green-portal-gun")?.object;
    if (!mesh || !ready || workProgress() > 0) return null;
    // setFromObject updates descendants itself; only prepare ancestors here.
    mesh.updateWorldMatrix(true, false); camera.updateMatrixWorld(true);
    const rect = canvas.getBoundingClientRect();
    const box = vortexBox.setFromObject(mesh);
    const min = vortexMin.set(Infinity, Infinity), max = vortexMax.set(-Infinity, -Infinity);
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
      const p = vortexCorner.set(x, y, z).project(camera);
      const pixel = vortexPixel.set((p.x + 1) * rect.width / 2, (1 - p.y) * rect.height / 2);
      min.min(pixel); max.max(pixel);
    }
    const padding = coarsePointer.matches ? 12 : 6;
    return { center: min.clone().add(max).multiplyScalar(.5), major: new THREE.Vector2(1, 0), minor: new THREE.Vector2(0, 1), majorLength: 1, minorLength: 1, rx: Math.max(22, (max.x - min.x) / 2 + padding), ry: Math.max(22, (max.y - min.y) / 2 + padding), rect };
  };
  const hitVortex = () => {
    const bounds = vortexBounds();
    if (!bounds) return false;
    const { center, major, minor, majorLength, minorLength, rx, ry, rect } = bounds;
    const offset = new THREE.Vector2((pointer.x + 1) * rect.width / 2, (1 - pointer.y) * rect.height / 2).sub(center);
    return Math.hypot(offset.dot(major) / majorLength / rx, offset.dot(minor) / minorLength / ry) <= 1;
  };
  const startVortex = () => {
    const vortex = items.find(item => item.object.name === "floating-pixel-vortex");
    const gun = items.find(item => item.object.name === "floating-green-portal-gun");
    if (!vortex || !gun || easterEgg.active || !ready || paused || workProgress() > 0) return;
    activePointer = null;
    easterEgg.start(vortex.object, gun.object, [{ object: logo, billboard: true }, ...items.filter(item => item !== vortex).map(({ object, billboard }) => ({ object, billboard }))], reduced, position => {
      vortex.body.position.set(position.x, position.y, position.z); vortex.body.velocity.setZero(); vortex.body.angularVelocity.setZero();
      vortex.body.aabbNeedsUpdate = true; vortex.body.wakeUp(); reflectionDirty = true;
    });
  };
  const vortexActivate = (event: Event) => {
    // A dedicated overlay owns this gesture before it can reach canvas physics.
    if (event instanceof PointerEvent && event.button !== 0) return;
    event.preventDefault(); event.stopPropagation();
    canvas.focus({ preventScroll: true });
    startVortex();
  };
  options.vortexTarget?.addEventListener('pointerdown', vortexActivate);
  options.vortexTarget?.addEventListener('click', vortexActivate);
  const updateVortexTarget = () => {
    const target = options.vortexTarget;
    if (!target) return;
    const bounds = !easterEgg.active && !paused ? vortexBounds() : null;
    target.style.display = bounds ? 'block' : 'none';
    if (!bounds) return;
    const { center, rx, ry, major } = bounds;
    target.style.width = `${rx * 2}px`;
    target.style.height = `${ry * 2}px`;
    target.style.transform = `translate(${center.x - rx}px, ${center.y - ry}px) rotate(${Math.atan2(major.y, major.x)}rad)`;
  };
  const pointerDown=(event:PointerEvent)=>{
    if(event.button!==0||activePointer!==null||!ready||paused||easterEgg.active||workProgress()>0)return;
    updatePointer(event);
    const recentHover = lastVortexHover && performance.now() - lastVortexHover.time < 250 && Math.hypot(event.clientX - lastVortexHover.x, event.clientY - lastVortexHover.y) < 22;
    if (hitVortex() || recentHover) {
      startVortex(); return;
    }
    if (reduced || (!usesPhysics() && floatingMode !== 'planet-belt')) return;
    activePointer=event.pointerId;
    canvas.setPointerCapture(event.pointerId);
    canvas.dataset.phase='spin';
  };
  const pointerMove=(event:PointerEvent)=>{
    updatePointer(event);
    if (!easterEgg.active) {
      const overVortex = ready && workProgress() === 0 && hitVortex();
      canvas.style.cursor = 'pointer';
      canvas.dataset.hoverLabel = overVortex ? 'click to shoot' : usesPhysics() ? 'hold to spin' : floatingMode === 'planet-belt' ? 'hold to accelerate' : 'move to explore';
      if (overVortex) lastVortexHover = { x: event.clientX, y: event.clientY, time: performance.now() };
    }
  };
  const pointerUp=(event:PointerEvent)=>{
    if(activePointer!==event.pointerId)return;
    pointerCancel();
  };
  const pointerCancel=()=>{
    beltKeys.clear();
    const pointerId=activePointer;activePointer=null;
    if(pointerId!==null&&canvas.hasPointerCapture(pointerId))canvas.releasePointerCapture(pointerId);
    canvas.dataset.phase=reduced?'static':floatingMode;
  };
  const pointerLeave=()=>{pointer.set(0,0);};
  canvas.addEventListener("pointerleave",pointerLeave);
  const pageVisibility=()=>{if(document.hidden)pointerCancel();};
  const key=(event:KeyboardEvent)=>{if(workProgress()>0)return;if(event.code==='Escape'){easterEgg.cancel();return;}if(easterEgg.active)return;if(event.code==='KeyV'){event.preventDefault();startVortex();return;}if(floatingMode === 'planet-belt' && (event.code === 'Space' || event.code === 'Enter')){event.preventDefault();if(!reduced && ready && !paused)beltKeys.add(event.code);return;}if(!usesPhysics())return;if(event.code==='Space'||event.code==='Enter'){event.preventDefault();if(!reduced)power=Math.min(power+.28,.5);}if(event.code==='ArrowUp'||event.code==='ArrowDown'){event.preventDefault();power=event.code==='ArrowUp'?.15:-.15;}};
  const keyUp = (event: KeyboardEvent) => { beltKeys.delete(event.code); };
  window.addEventListener('keyup', keyUp);
  const preference=()=>{reduced=media.matches;pointerCancel();if(ready)reset();};
  const lost=(event:Event)=>{event.preventDefault();easterEgg.cancel();contextLost=true;canvas.dataset.ready='false';};
  const restored=()=>{contextLost=false;reflectionDirty=true;};
  const observer=new ResizeObserver(resize);observer.observe(host);resize();
  const visibility=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;activePointer=null;if(!visible)easterEgg.cancel();});visibility.observe(host);
  canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointermove',pointerMove);canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('pointercancel',pointerCancel);
  window.addEventListener('blur',pointerCancel);document.addEventListener('visibilitychange',pageVisibility);
  canvas.addEventListener('lostpointercapture',pointerCancel);canvas.addEventListener('keydown',key);
  media.addEventListener('change',preference);
  canvas.addEventListener('webglcontextlost',lost);canvas.addEventListener('webglcontextrestored',restored);
  const cameraFrame=()=>{
    // Same orbit as source, shifted by PI to show the supplied plaques' front faces.
    angle=usesPhysics() ? 2*Math.PI/10*orbit : 0;
    camera.position.set(0,10*Math.sin(angle),10*Math.cos(angle));camera.rotation.set(-angle,0,0);
    logo.quaternion.copy(camera.quaternion);logoBody.quaternion.set(camera.quaternion.x,camera.quaternion.y,camera.quaternion.z,camera.quaternion.w);logoBody.aabbNeedsUpdate=true;
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
      let x: number, y: number, z: number;
      if (floatingMode === 'planet-belt') {
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
      item.object.position.lerp(targetPosition, blend);
      item.body.position.set(item.object.position.x, item.object.position.y, item.object.position.z);
      const sway = floatingMode === 'parallax' ? smoothPointer.x * .06 : Math.sin(t * .72 - x) * .06;
      if (floatingMode === 'planet-belt') {
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
  const step=(delta:number)=>{
    elapsed+=delta;
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
    // Reference orbit is per-frame; normalize to 60Hz so high-refresh displays match it.
    const frameRatio=delta*60;
    if(workProgress()>0&&activePointer!==null)pointerCancel();
    const holding=activePointer!==null&&!easterEgg.active&&!reduced;
    if(holding)power=.29;
    orbit+=(workProgress()>0 ? .01 + Math.pow(workProgress(), 2)*.65 : power)*frameRatio;
    // Retain the held speed on release, then ease back to the idle orbit.
    if(!holding)power=referencePhysics.idlePower+(power-referencePhysics.idlePower)*Math.pow(referencePhysics.orbitDecay,frameRatio);
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
    world.step(1/60,delta,1);
    for(const {body,object} of items){object.position.copy(body.position);object.quaternion.copy(body.quaternion);}
    if(elapsed>1.5&&activePointer===null)canvas.dataset.phase='orbit';
  };
  // One progress value is shared with the DOM takeover. Camera-relative coordinates
  // keep the logo centered while the surrounding objects accelerate in world space.
  const composeWork = () => {
    const p = workProgress();
    logo.visible = true;
    // Returning to the hero keeps the live physics state instead of replaying the entrance.
    // Acceleration belongs to the shared timeline; local phases only remap its progress.
    const travel = THREE.MathUtils.clamp((p - .2) / .8, 0, 1);
    const turn = reduced ? 0 : THREE.MathUtils.clamp((p - .08) / .82, 0, 1) * Math.PI * 2;
    pointerYaw = THREE.MathUtils.lerp(pointerYaw, reduced ? 0 : pointer.x * .45, .08);
    logo.quaternion.copy(camera.quaternion).multiply(spin.setFromAxisAngle(spinAxis, turn + pointerYaw * (1 - p)));
    canvas.dataset.pointerYaw = String(pointerYaw);
    logo.position.set(0, (height / 2 - 44) / camera.zoom * travel, 0).applyQuaternion(camera.quaternion);
    const entranceProgress = reduced ? 1 : Math.min(1, logoEntranceTime / logoEntranceDuration);
    const entranceScale = .18 + .82 * (1 - Math.pow(1 - entranceProgress, 4));
    logo.scale.setScalar(THREE.MathUtils.lerp(logoScale * entranceScale, 72 / (3.1 * camera.zoom), travel));
    const vanish = THREE.MathUtils.clamp((p - .16) / .54, 0, 1);
    for (const { object, body, phase, billboard } of items) {
      object.visible = p < .7 && object.name !== "floating-pixel-vortex";
      object.scale.setScalar(assetScale * (usesPhysics() ? 1 : floatingMode === "planet-belt" ? width < 700 ? .40 : 1 : width < 700 ? .58 : .60) * (1 - vanish));
      object.quaternion.copy(billboard ? camera.quaternion : body.quaternion);
      if (p > 0 && !reduced && !billboard) {
        object.rotateY(p * p * (22 + phase));
        object.rotateX(p * p * 12);
      }
    }
    canvas.dataset.workProgress = p.toFixed(4);
    canvas.dataset.logoTurn = String(turn);
    canvas.dataset.logoTop = String(height / 2 - (height / 2 - 44) * travel);
    canvas.dataset.visibleItems = String(p < .7 ? items.length : 0);
  };
  const render=(time:number)=>{
    frame=requestAnimationFrame(render);
    const delta=Math.min((time-previous)/1000,1/30);previous=time;
    if(disposed||!visible||document.hidden||contextLost)return;
    // Start when the loading overlay releases the scene, not while assets load.
    if (ready && !paused) {
      logoEntranceTime = reduced || workProgress() > 0
        ? logoEntranceDuration
        : Math.min(logoEntranceDuration, logoEntranceTime + delta);
    }
    if (easterEgg.active && workProgress() > 0) easterEgg.cancel();
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
    // At full takeover only the stationary header logo remains. Keep the live
    // state above in sync, but reuse its pixels until scroll/resize/context changes.
    if (ready && workProgress() === 1 && renderedWorkProgress === 1 && !reflectionDirty) return;
    scene.updateMatrixWorld();
    // Capture after physics and camera updates. Hide the receiver during capture
    // and keep the panorama behind the real geometry, restoring the black page afterward.
    const reflectionInterval = width < 700 ? 1000 / 12 : 1000 / 20;
    if (ready && (reflectionDirty || (!paused && !reduced && workProgress()<1 && time-reflectionTime >= reflectionInterval))) {
      const background = scene.background;
      const backgroundIntensity = scene.backgroundIntensity;
      const logoVisible = logo.visible;
      logo.visible = false;
      scene.background = scene.environment;
      scene.backgroundIntensity = config.lighting.reflectionBackgroundIntensity;
      reflectionCamera.position.set(0, 0, .28).applyQuaternion(logo.quaternion).add(logo.position);
      try {
        reflectionCamera.update(renderer, scene);
      } finally {
        logo.visible = logoVisible;
        scene.background = background;
        scene.backgroundIntensity = backgroundIntensity;
      }
      if (chrome.envMap !== reflectionTarget.texture) {
        chrome.envMap = reflectionTarget.texture;
        chrome.needsUpdate = true;
      }
      reflectionTime = time; reflectionDirty = false; reflectionFrames++;
      canvas.dataset.reflections = String(reflectionFrames);
    }
    updateVortexTarget();
    renderer.render(scene,camera);
    renderedWorkProgress = ready ? workProgress() : -1;
    if(ready){canvas.dataset.ready='true';if(time-snapshotTime>150){canvas.dataset.contacts=String(contacts);canvas.dataset.angle=String(angle);canvas.dataset.steps=String(world.stepnumber);snapshotTime=time;}}
  };
  frame=requestAnimationFrame(render);
  const loader=new GLTFLoader();
  const filenames=config.plaques.items.map(item => item.file);
  const loadedObjects:THREE.Object3D[]=[];
  const characterModels = Promise.all(config.characters.items.map(({file}) =>
    loader.loadAsync(`/assets/models/emotions/${file}.glb`).then(gltf => {
      gltf.scene.name = `emotion-${file}`;
      track(gltf.scene);
      if (disposed) { geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); }
      return gltf.scene;
    })
  ));
  const skaterTexture = new THREE.TextureLoader().loadAsync(config.skater.image).then(texture => {
    resources.add(texture);
    if (disposed) texture.dispose();
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  });
  const cutoutTextures = Promise.all(config.cutouts.map(({ file }) =>
    new THREE.TextureLoader().loadAsync(`/assets/images/floating/${file}.webp`).then(texture => {
      resources.add(texture);
      if (disposed) texture.dispose();
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    })
  ));
  const portalGunModel = createChromePortalGun().then(model => {
    track(model);
    if (disposed) {
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(material => material.dispose());
    }
    return model;
  });
  const loaded = Promise.all([skaterTexture, characterModels, cutoutTextures, portalGunModel, Promise.all([
    (/\.exr$/i.test(config.lighting.environment) ? new EXRLoader() : /\.hdr$/i.test(config.lighting.environment) ? new HDRLoader() : new THREE.TextureLoader()).loadAsync(config.lighting.environment).then(texture=>{resources.add(texture);if(disposed)texture.dispose();return texture;}),
    ...filenames.map(file=>loader.loadAsync(`/assets/models/plaques/${file}.glb`).then(gltf=>{gltf.scene.name=file;track(gltf.scene);loadedObjects.push(gltf.scene);if(disposed){track(gltf.scene);geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}return gltf.scene;})),
  ])]).then(([cutout, characters, floatingTextures, portalGun, [environment,...models]])=>{
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
    }
    add(portalGun,config.portalGun.size,5);
    const wordmark = new THREE.Mesh(createJimmyWordmarkGeometry(), new THREE.MeshPhysicalMaterial(config.wordmark.material));
    wordmark.name = "floating-jimmy-wordmark";
    add(wordmark, config.wordmark.size, 6);
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
      add(model, setting.size, 7 + index);
    });
    add(createChromePlanet(), config.celestial.planet.size, 7 + characters.length);
    add(createChromeRainCloud(), config.celestial.cloud.size, 8 + characters.length);
    const image = cutout.image as { width: number; height: number };
    const skater = new THREE.Mesh(
      new THREE.PlaneGeometry(image.width / image.height, 1),
      // A flat cutout has no back/front layers to sort; one double-sided pass
      // produces the same pixels in the camera and reflection probe.
      new THREE.MeshBasicMaterial({ ...config.skater.material, map: cutout, forceSinglePass: true }),
    );
    skater.name = "skater-billboard";
    add(skater, config.skater.size, 9 + characters.length, true);
    floatingTextures.forEach((texture, index) => {
      const setting = config.cutouts[index];
      const image = texture.image as { width: number; height: number };
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(image.width / image.height, 1),
        new THREE.MeshBasicMaterial({ ...config.skater.material, map: texture, forceSinglePass: true }),
      );
      mesh.name = `floating-cutout-${setting.file}`;
      add(mesh, setting.size, 10 + characters.length + index, true);
    });
    vortexAnimation = createPixelVortex(config.vortex);
    add(vortexAnimation.mesh, config.vortex.size, 10 + characters.length + floatingTextures.length, true);
    vortexAnimation.mesh.parent!.parent!.visible = false;
    // A hidden effect must not collide with the floating toys.
    const portalBody = items[items.length - 1].body;
    portalBody.collisionFilterMask = 0;
    portalBody.collisionResponse = false;
    canvas.dataset.billboards = String(2 + floatingTextures.length);
    canvas.dataset.cutouts = String(floatingTextures.length);
    canvas.dataset.characters = String(characters.length);
    resize();reset();ready=true;canvas.dataset.plaques=String(models.length);canvas.dataset.environment=config.lighting.environment;
    canvas.dataset.phase=reduced?'static':'entrance';
  }).catch(error=>{if(!disposed){canvas.dataset.assetError='true';options.onError?.(error);}});
  const debug={snapshot:()=>({ready,paused,reduced,reflectionFrames,elapsed,angle,power,beltAngle,beltSpeed,steps:world.stepnumber,contacts,collisionPairs:[...collisions],bursts,view:{width:viewWidth,height:viewHeight},camera:camera.position.toArray(),logoQuaternion:logo.quaternion.toArray(),cameraQuaternion:camera.quaternion.toArray(),bodies:items.map(({body,object,billboard})=>({name:object.name,billboard:!!billboard,visualQuaternion:object.quaternion.toArray(),position:body.position.toArray(),velocity:body.velocity.toArray(),quaternion:body.quaternion.toArray(),mass:body.mass}))}),replay:reset};
  const debugCanvas=canvas as HTMLCanvasElement & {__chromeDebug?:typeof debug};
  if(options.debug)debugCanvas.__chromeDebug=debug;
  return {
    loaded,
    setFloatingMode(value: FloatingMode) {
      if (value === floatingMode) return;
      const wasPhysics = usesPhysics();
      pointerCancel(); easterEgg.cancel(); floatingMode = value;
      const keepPhysics = wasPhysics && usesPhysics();
      if (!keepPhysics) { orbit = 0; elapsed = 0; beltAngle = 0; beltSpeed = .10; }
      reflectionDirty = true;
      canvas.dataset.motionMode = value;
      if (ready && ((!keepPhysics && usesPhysics()) || reduced)) reset();
    },
    setPaused(value:boolean){paused=value;if(value)activePointer=null;},
    replay(){if(ready)reset();},
    dispose(){
      disposed=true;window.removeEventListener('keyup',keyUp);canvas.removeEventListener("pointerleave",pointerLeave);pointerCancel();easterEgg.cancel();cancelAnimationFrame(frame);
      window.removeEventListener('blur',pointerCancel);document.removeEventListener('visibilitychange',pageVisibility);
      options.vortexTarget?.removeEventListener('pointerdown', vortexActivate);
      options.vortexTarget?.removeEventListener('click', vortexActivate);
      if (options.vortexTarget) options.vortexTarget.style.display = 'none';observer.disconnect();visibility.disconnect();
      canvas.removeEventListener('pointerdown',pointerDown);canvas.removeEventListener('pointermove',pointerMove);canvas.removeEventListener('pointerup',pointerUp);canvas.removeEventListener('pointercancel',pointerCancel);canvas.removeEventListener('lostpointercapture',pointerCancel);canvas.removeEventListener('keydown',key);media.removeEventListener('change',preference);canvas.removeEventListener('webglcontextlost',lost);canvas.removeEventListener('webglcontextrestored',restored);
      scene.clear();[...world.bodies].forEach(body=>world.removeBody(body));resources.forEach(texture=>texture.dispose());geometries.forEach(geometry=>geometry.dispose());materials.forEach(material=>material.dispose());reflectionTarget.dispose();renderer.dispose();delete debugCanvas.__chromeDebug;delete canvas.dataset.ready;
    },
  };
}
