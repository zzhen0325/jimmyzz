import * as THREE from "three";
import { home3DConfig as config } from "./home-3d-config";
import * as CANNON from "cannon-es";
import { createLogoTriangle } from "./chrome-logo-geometry";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { createChromeGamepad } from "./chrome-gamepad";

export type ChromeWorldOptions = { workProgress?: { readonly current: number }; paused?: boolean; debug?: boolean; onError?: (error: unknown) => void };
type Item = { object: THREE.Group; body: CANNON.Body; originalSize: THREE.Vector3; phase: number; material?: THREE.MeshStandardMaterial };

// SOURCE: twomuch.studio module 3614 / 3645 / 5743, captured 2026-09-11.
// The scene is zero-gravity inside a 20-plane cylinder. Initial body overlap
// produces the entrance burst. No attraction, arranged slots, or synthetic orbit paths.
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
  scene.backgroundIntensity = 1;
  const camera = new THREE.OrthographicCamera(-3, 3, 1.5, -1.5, .1, 1000);
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
  let orbit = 0;
  let power = referencePhysics.idlePower;
  let angle = 0;
  let width = 1;
  let height = 1;
  let viewWidth = 6;
  let viewHeight = 3;
  let assetScale = 1;
  let logoScale = 1;
  let lastWorkProgress = 0;
  const workProgress = () => options.workProgress?.current ?? 0;
  const spinAxis = new THREE.Vector3(0, 1, 0);
  const spin = new THREE.Quaternion();
  let contacts = 0;
  let bursts = 0;
  let activePointer: number | null = null;
  let pointerStartY = 0;
  let lastWheelTime = -Infinity;
  let snapshotTime = 0;
  const pointer = new THREE.Vector2();
  const force = new CANNON.Vec3();
  const point = new CANNON.Vec3();
  const impulse = new CANNON.Vec3();
  const center = new CANNON.Vec3();
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
  scene.add(new THREE.AmbientLight(config.lighting.ambient.color, config.lighting.ambient.intensity));
  const lights = new THREE.Group();
  for (const position of [[15,-15,6],[-15,15,-6],[15,-6,15],[-15,6,-15]]) {
    const light = new THREE.DirectionalLight(config.lighting.directional.color, config.lighting.directional.intensity);
    light.position.fromArray(position); lights.add(light);
  }
  scene.add(lights);
  // Original camera-relative key, fill and rim lights.
  const studio = new THREE.Group();
  for (const { color, intensity, position } of config.lighting.studio) {
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.fromArray(position); studio.add(light);
  }
  scene.add(studio);
  const logo = new THREE.Group(); logo.name = "fixed-silver-ZZ"; scene.add(logo);
  // User-directed silver adaptation. A real curved surface reflects the panorama;
  // this replaces the old sinusoidal fragment-normal trick and fabricated softboxes.
  const triangles = [ [[0,30],[30,30],[0,15]], [[30,30],[60,30],[30,15]], [[0,0],[30,0],[30,15]], [[30,0],[60,0],[60,15]] ];
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
  const add=(object:THREE.Object3D,size:number,index:number,cycle?:THREE.MeshStandardMaterial)=>{
    track(object);
    const bounds=new THREE.Box3().setFromObject(object),dimensions=bounds.getSize(new THREE.Vector3()),mid=bounds.getCenter(new THREE.Vector3());
    const normalization=size/Math.max(dimensions.x,dimensions.y,dimensions.z);
    const normalized=new THREE.Group();normalized.add(object);object.position.sub(mid);normalized.scale.setScalar(normalization);
    const group=new THREE.Group();group.name=object.name||`chrome-${index}`;group.add(normalized);scene.add(group);
    const originalSize=dimensions.multiplyScalar(normalization);
    const body=new CANNON.Body({mass:1,allowSleep:true,angularDamping:.5,linearDamping:.01,collisionFilterGroup:2});
    body.addEventListener('collide',(event:{body:CANNON.Body})=>{contacts++;collisions.add([body.id,event.body.id].sort((a,b)=>a-b).join(':'));});
    world.addBody(body);items.push({object:group,body,originalSize,phase:2*Math.PI/10*index,material:cycle});
  };
  const makeWalls=()=>{
    walls.forEach(body=>world.removeBody(body));walls.length=0;
    const plane=(position:number[],rotation:number[],type:typeof CANNON.Body.STATIC | typeof CANNON.Body.KINEMATIC)=>{const body=new CANNON.Body({type,collisionFilterGroup:2});body.addShape(new CANNON.Plane());body.position.set(position[0],position[1],position[2]);body.quaternion.setFromEuler(rotation[0],rotation[1],rotation[2]);world.addBody(body);walls.push(body);};
    for(let i=0;i<20;i++){const theta=Math.PI+2*Math.PI/20*i;plane([0,Math.cos(theta)*viewHeight/2,Math.sin(theta)*viewHeight/2],[theta+Math.PI/2,0,0],CANNON.Body.STATIC);}
    plane([-viewWidth/2,0,0],[0,Math.PI/2,0],CANNON.Body.KINEMATIC);plane([viewWidth/2,0,0],[0,-Math.PI/2,0],CANNON.Body.KINEMATIC);
  };
  const shapeBody=(body:CANNON.Body,size:THREE.Vector3)=>{
    while(body.shapes.length)body.removeShape(body.shapes[0]);
    body.addShape(new CANNON.Box(new CANNON.Vec3(size.x/2,size.y/2,Math.max(.025,size.z/2))));body.updateMassProperties();body.updateBoundingRadius();body.aabbNeedsUpdate=true;
  };
  const reset=()=>{
    reflectionDirty=true;
    orbit=0;power=.01;angle=0;elapsed=0;world.time=0;world.accumulator=0;world.stepnumber=0;contacts=0;collisions.clear();
    items.forEach((item,index)=>{
      item.body.position.set(0,0,Math.sin(index)*Math.PI/6);
      item.body.quaternion.set(0,0,0,1);item.body.velocity.setZero();item.body.angularVelocity.setZero();item.body.force.setZero();item.body.torque.setZero();item.body.wakeUp();
      if(reduced){const a=2*Math.PI*index/items.length;item.body.position.set(Math.cos(a)*viewWidth*.35,Math.sin(a)*viewHeight*.35,.2);}
      item.object.position.copy(item.body.position);item.object.quaternion.copy(item.body.quaternion);
    });
    canvas.dataset.phase=reduced?'static':'entrance';
  };
  const resize=()=>{
    const rect=host.getBoundingClientRect();width=rect.width;height=rect.height;
    camera.left=-width/2;camera.right=width/2;camera.top=height/2;camera.bottom=-height/2;camera.zoom=(width+height)/9;camera.updateProjectionMatrix();
    viewWidth=width/camera.zoom;viewHeight=height/camera.zoom;
    const oldScale=assetScale;assetScale=width<config.sizing.mobileBreakpoint?config.sizing.mobile:config.sizing.desktop;
    logoScale = Math.min(config.logo.scale,viewWidth*config.logo.maxViewportWidth/3.1);
    logo.scale.setScalar(logoScale);
    shapeBody(logoBody,new THREE.Vector3(3.1*logo.scale.x,1.55*logo.scale.y,.16));
    items.forEach(item=>{shapeBody(item.body,item.originalSize.clone().multiplyScalar(assetScale));item.object.scale.setScalar(assetScale);if(ready&&oldScale!==assetScale)item.body.position.scale(assetScale/oldScale,item.body.position);});
    makeWalls();renderer.setSize(width,height,false);
    // Viewport changes invalidate wall containment; restart the same entrance instead of
    // teleporting individual bodies into arrangement slots or leaving bodies outside walls.
    if(ready)reset();
  };
  const release=()=>{
    if(!ready||paused||reduced||workProgress()>0)return;
    for(const {body} of items){impulse.set((2*Math.random()-1)*15,(2*Math.random()-1)*15,(2*Math.random()-1)*15);body.wakeUp();body.applyLocalImpulse(impulse,center);}
    bursts++;canvas.dataset.bursts=String(bursts);canvas.dataset.phase='release';
  };
  const updatePointer=(event:PointerEvent)=>{const r=host.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width*2-1,-((event.clientY-r.top)/r.height*2-1));};
  const pointerDown=(event:PointerEvent)=>{
    if(event.button!==0||!ready||paused||reduced||workProgress()>0)return;
    updatePointer(event);activePointer=event.pointerId;pointerStartY=event.clientY;canvas.setPointerCapture(event.pointerId);canvas.dataset.phase='hold';
  };
  const pointerMove=(event:PointerEvent)=>{updatePointer(event);if(activePointer===event.pointerId){const divisor=event.pointerType==='touch'?10:1000;power=THREE.MathUtils.clamp((event.clientY-pointerStartY)/divisor,-.3,.3);}};
  const pointerUp=(event:PointerEvent)=>{if(activePointer!==event.pointerId)return;activePointer=null;if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);release();};
  const pointerCancel=()=>{activePointer=null;};
  const wheel=(event:WheelEvent)=>{
    if(reduced||event.ctrlKey||workProgress()>=1)return;
    event.preventDefault();event.stopPropagation();if(paused)return;
    const now=performance.now();if(now-lastWheelTime<30)return;lastWheelTime=now;
    const units=event.deltaMode===1?40:event.deltaMode===2?height:1;
    const dominant=Math.abs(event.deltaY)>=Math.abs(event.deltaX)?event.deltaY:event.deltaX*.75;
    const next=-dominant*units/800;
    power=next<=0?Math.max(Math.min(next,power),-.5):Math.min(Math.max(next,power),.5);
  };
  const key=(event:KeyboardEvent)=>{if(workProgress()>0)return;if(event.code==='Space'||event.code==='Enter'){event.preventDefault();release();}if(event.code==='ArrowUp'||event.code==='ArrowDown'){event.preventDefault();power=event.code==='ArrowUp'?.15:-.15;}};
  const preference=()=>{reduced=media.matches;activePointer=null;if(ready)reset();};
  const lost=(event:Event)=>{event.preventDefault();contextLost=true;canvas.dataset.ready='false';};
  const restored=()=>{contextLost=false;reflectionDirty=true;};
  const observer=new ResizeObserver(resize);observer.observe(host);resize();
  const visibility=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;activePointer=null;});visibility.observe(host);
  canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointermove',pointerMove);canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('pointercancel',pointerCancel);
  canvas.addEventListener('lostpointercapture',pointerCancel);canvas.addEventListener('keydown',key);
  host.addEventListener('wheel',wheel,{passive:false});media.addEventListener('change',preference);
  canvas.addEventListener('webglcontextlost',lost);canvas.addEventListener('webglcontextrestored',restored);
  const cameraFrame=()=>{
    // Same orbit as source, shifted by PI to show the supplied plaques' front faces.
    angle=2*Math.PI/10*orbit;
    camera.position.set(0,10*Math.sin(angle),10*Math.cos(angle));camera.rotation.set(-angle,0,0);
    logo.quaternion.copy(camera.quaternion);logoBody.quaternion.set(camera.quaternion.x,camera.quaternion.y,camera.quaternion.z,camera.quaternion.w);logoBody.aabbNeedsUpdate=true;
    lights.rotation.set(0,-angle,-angle);
    studio.quaternion.copy(camera.quaternion);
  };
  const step=(delta:number)=>{
    elapsed+=delta;
    // Reference orbit is per-frame; normalize to 60Hz so high-refresh displays match it.
    const frameRatio=delta*60;orbit+=(workProgress()>0 ? .01 + Math.pow(workProgress(), 2)*.65 : power)*frameRatio;
    if(Math.abs(power)>.01)power*=Math.pow(.98,frameRatio);
    cameraFrame();
    force.set(.02*Math.sin(elapsed/10),0,.02*Math.cos(elapsed/10));point.set(Math.cos(elapsed/15+50),Math.sin(elapsed/10+100),Math.cos(elapsed/20+150));
    for(const {body,material,phase} of items){
      body.applyLocalForce(force,point);
      if(activePointer!==null){impulse.set(pointer.x*frameRatio,Math.cos(camera.rotation.x)*pointer.y*frameRatio,Math.sin(camera.rotation.x)*pointer.y*frameRatio);body.wakeUp();body.applyImpulse(impulse,center);}
      if(material){
        const animation = config.materialAnimation;
        const v = Math.pow((1 + Math.sin(animation.speed * elapsed + phase)) / 2, animation.power);
        material.envMapIntensity = THREE.MathUtils.lerp(animation.envMapIntensity[0], animation.envMapIntensity[1], v);
        material.metalness = THREE.MathUtils.lerp(animation.metalness[0], animation.metalness[1], v);
        material.roughness = THREE.MathUtils.lerp(animation.roughness[0], animation.roughness[1], v);
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
    if (lastWorkProgress > 0 && p === 0) reset();
    lastWorkProgress = p;
    // Acceleration belongs to the shared timeline; local phases only remap its progress.
    const travel = THREE.MathUtils.clamp((p - .2) / .8, 0, 1);
    const turn = reduced ? 0 : THREE.MathUtils.clamp((p - .08) / .82, 0, 1) * Math.PI * 2;
    logo.quaternion.copy(camera.quaternion).multiply(spin.setFromAxisAngle(spinAxis, turn));
    logo.position.set(0, (height / 2 - 44) / camera.zoom * travel, 0).applyQuaternion(camera.quaternion);
    logo.scale.setScalar(THREE.MathUtils.lerp(logoScale, 72 / (3.1 * camera.zoom), travel));
    const vanish = THREE.MathUtils.clamp((p - .16) / .54, 0, 1);
    for (const { object, body, phase } of items) {
      object.visible = p < .7;
      object.scale.setScalar(assetScale * (1 - vanish));
      object.quaternion.copy(body.quaternion);
      if (p > 0 && !reduced) {
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
    if(ready&&!paused&&!reduced&&workProgress()<1)step(delta);else cameraFrame();
    composeWork();
    // Capture after physics and camera updates. Hide the receiver during capture
    // and keep the panorama behind the real geometry, restoring the black page afterward.
    const reflectionInterval = width < 700 ? 1000 / 12 : 1000 / 20;
    if (ready && (reflectionDirty || (!paused && !reduced && workProgress()<1 && time-reflectionTime >= reflectionInterval))) {
      const background = scene.background;
      logo.visible = false;
      scene.background = scene.environment;
      reflectionCamera.position.set(0, 0, .28).applyQuaternion(logo.quaternion).add(logo.position);
      try {
        reflectionCamera.update(renderer, scene);
      } finally {
        logo.visible = true;
        scene.background = background;
      }
      if (chrome.envMap !== reflectionTarget.texture) {
        chrome.envMap = reflectionTarget.texture;
        chrome.needsUpdate = true;
      }
      reflectionTime = time; reflectionDirty = false; reflectionFrames++;
      canvas.dataset.reflections = String(reflectionFrames);
    }
    renderer.render(scene,camera);
    if(ready){canvas.dataset.ready='true';if(time-snapshotTime>150){canvas.dataset.contacts=String(contacts);canvas.dataset.angle=String(angle);canvas.dataset.steps=String(world.stepnumber);snapshotTime=time;}}
  };
  frame=requestAnimationFrame(render);
  const loader=new GLTFLoader();
  const filenames=config.plaques.items.map(item => item.file);
  const loadedObjects:THREE.Object3D[]=[];
  const loaded = Promise.all([
    new THREE.TextureLoader().loadAsync(config.lighting.environment).then(texture=>{resources.add(texture);if(disposed)texture.dispose();return texture;}),
    ...filenames.map(file=>loader.loadAsync(`/assets/models/plaques/${file}.glb`).then(gltf=>{gltf.scene.name=file;track(gltf.scene);loadedObjects.push(gltf.scene);if(disposed){track(gltf.scene);geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}return gltf.scene;})),
  ]).then(([environment,...models])=>{
    if(disposed)return;
    const env=environment as THREE.Texture;env.mapping=THREE.EquirectangularReflectionMapping;
    // The JPG is display-encoded; decode it before using it as illumination.
    env.colorSpace=THREE.SRGBColorSpace;
    scene.environment=env;
    scene.environmentIntensity=config.lighting.environmentIntensity;
    for(const [index,model] of models.entries()) {
      (model as THREE.Object3D).traverse(child => {
        if (!(child instanceof THREE.Mesh)) return;
        for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
          if (!(material instanceof THREE.MeshStandardMaterial)) continue;
          if (material.name.startsWith("Resin")) material.color.set(config.plaques.items[index].color);
          material.roughness = config.plaques.material.roughness;
          material.metalness = config.plaques.material.metalness;
          material.envMapIntensity = config.plaques.material.envMapIntensity;
          if (material instanceof THREE.MeshPhysicalMaterial) {
            material.clearcoat = config.plaques.material.clearcoat;
            material.clearcoatRoughness = config.plaques.material.clearcoatRoughness;
          }
        }
      });
      add(model as THREE.Object3D,config.plaques.items[index].size,index);
    }
    const shapes=[new THREE.TorusGeometry(.6,.16,24,80),new THREE.TorusKnotGeometry(.45,.15,100,16),new THREE.SphereGeometry(.4,40,28),new THREE.CapsuleGeometry(.18,.7,12,24),new THREE.TorusGeometry(.5,.06,16,80)];
    const shapeSettings = [config.objects.torus, config.objects.knot, config.objects.sphere, config.objects.capsule, config.objects.thinRing];
    shapes.forEach((geometry,index)=>{const setting=shapeSettings[index];const material=new THREE.MeshPhysicalMaterial(setting.material);const mesh=new THREE.Mesh(geometry,material);add(mesh,setting.size,index+5,setting.animateMaterial?material:undefined);});
    // Additional silhouettes use the same body/force/collision owner as the plaques.
    const starShape = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? .25 : .58;
      if (i === 0) starShape.moveTo(Math.cos(a)*r, Math.sin(a)*r);
      else starShape.lineTo(Math.cos(a)*r, Math.sin(a)*r);
    }
    starShape.closePath();
    const starMaterial = new THREE.MeshPhysicalMaterial(config.objects.star.material);
    const star = new THREE.Mesh(new THREE.ExtrudeGeometry(starShape,{depth:.16,bevelEnabled:true,bevelThickness:.06,bevelSize:.06,bevelSegments:5,steps:1}),starMaterial);
    star.name='gold-star'; add(star,config.objects.star.size,10);
    const helixPoints = Array.from({length:161},(_,i)=>{const t=i/160;return new THREE.Vector3(.25*Math.cos(t*Math.PI*8),t*1.1-.55,.25*Math.sin(t*Math.PI*8));});
    const springMaterial = new THREE.MeshPhysicalMaterial(config.objects.spring.material);
    const spring = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helixPoints),160,.065,12,false),springMaterial);
    spring.name='silver-spring';add(spring,config.objects.spring.size,11,config.objects.spring.animateMaterial?springMaterial:undefined);
    const gemMaterial = new THREE.MeshPhysicalMaterial(config.objects.crystal.material);
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(.48),gemMaterial);
    gem.scale.set(1,1.3,1);gem.name='lilac-crystal';add(gem,config.objects.crystal.size,12);
    const linked = new THREE.Group();linked.name='linked-rings';
    const linkedMaterial = new THREE.MeshPhysicalMaterial(config.objects.linkedRings.material);
    const ringGeometry = new THREE.TorusGeometry(.29,.085,20,56);
    const ringA = new THREE.Mesh(ringGeometry,linkedMaterial), ringB = new THREE.Mesh(ringGeometry,linkedMaterial);
    ringA.position.x=-.18;ringB.position.x=.18;ringB.rotation.x=Math.PI/2;
    linked.add(ringA,ringB);add(linked,config.objects.linkedRings.size,13,config.objects.linkedRings.animateMaterial?linkedMaterial:undefined);
    add(createChromeGamepad(),config.gamepad.size,14);
    resize();reset();ready=true;canvas.dataset.plaques=String(models.length);canvas.dataset.environment=config.lighting.environment;
    canvas.dataset.phase=reduced?'static':'entrance';
  }).catch(error=>{if(!disposed){canvas.dataset.assetError='true';options.onError?.(error);}});
  const debug={snapshot:()=>({ready,paused,reduced,reflectionFrames,elapsed,angle,power,steps:world.stepnumber,contacts,collisionPairs:[...collisions],bursts,view:{width:viewWidth,height:viewHeight},camera:camera.position.toArray(),logoQuaternion:logo.quaternion.toArray(),cameraQuaternion:camera.quaternion.toArray(),bodies:items.map(({body,object})=>({name:object.name,position:body.position.toArray(),velocity:body.velocity.toArray(),quaternion:body.quaternion.toArray(),mass:body.mass}))}),replay:reset};
  const debugCanvas=canvas as HTMLCanvasElement & {__chromeDebug?:typeof debug};
  if(options.debug)debugCanvas.__chromeDebug=debug;
  return {
    loaded,
    setPaused(value:boolean){paused=value;if(value)activePointer=null;},
    replay(){if(ready)reset();},
    dispose(){
      disposed=true;cancelAnimationFrame(frame);observer.disconnect();visibility.disconnect();
      canvas.removeEventListener('pointerdown',pointerDown);canvas.removeEventListener('pointermove',pointerMove);canvas.removeEventListener('pointerup',pointerUp);canvas.removeEventListener('pointercancel',pointerCancel);canvas.removeEventListener('lostpointercapture',pointerCancel);canvas.removeEventListener('keydown',key);host.removeEventListener('wheel',wheel);media.removeEventListener('change',preference);canvas.removeEventListener('webglcontextlost',lost);canvas.removeEventListener('webglcontextrestored',restored);
      scene.clear();[...world.bodies].forEach(body=>world.removeBody(body));resources.forEach(texture=>texture.dispose());geometries.forEach(geometry=>geometry.dispose());materials.forEach(material=>material.dispose());reflectionTarget.dispose();renderer.dispose();delete debugCanvas.__chromeDebug;delete canvas.dataset.ready;
    },
  };
}
