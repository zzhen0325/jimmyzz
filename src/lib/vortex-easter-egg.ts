import * as THREE from "three";

const clamp = (n: number) => THREE.MathUtils.clamp(n, 0, 1);
const smooth = (n: number) => { const p = clamp(n); return p * p * (3 - 2 * p); };
const easeIn = (n: number) => Math.pow(clamp(n), 4);
const easeOut = (n: number) => 1 - Math.pow(1 - clamp(n), 5);
const easeInOut = (n: number) => {
  const p = clamp(n);
  return p < .5 ? 8 * p ** 4 : 1 - (-2 * p + 2) ** 4 / 2;
};
const aimDuration = .24;
const launchDuration = .58;
const impactDuration = .28;
const stagger = .052;
const absorbDuration = .48;
const collapseDuration = .14;
const transferDuration = .04;
const collapseOverlap = .14;
const emitOverlap = .18;
const throatScale = .16;
const appearDuration = .18;
const emitDuration = 1.04;
const swirl = Math.PI * 1.65;
const emitSwirl = swirl + Math.PI;
const emitCoastDuration = .3;
const smoother = (n: number) => { const p = clamp(n); return p ** 3 * (10 - 15 * p + 6 * p * p); };
type Momentum = { speed: number; absorbed: boolean; exit?: { pitch: number; length: number; coast: number; duration: number } };
const momentum = (): Momentum => ({ speed: 0, absorbed: false });
const mouthImpulseDuration = .066;
const exitCloseDuration = .16;
const settleDuration = .16;
type FlightObject = { object: THREE.Object3D; billboard?: boolean };

/** Spiral through both mouths, then blend into the live scene poses. */
export function createVortexEasterEgg(canvas: HTMLCanvasElement, camera: THREE.OrthographicCamera) {
  let running: ReturnType<typeof capture> | undefined;
  const screen = (point: THREE.Vector3) => {
    const p = point.clone().project(camera);
    const rect = canvas.getBoundingClientRect();
    return new THREE.Vector2(rect.left + (p.x + 1) * rect.width / 2, rect.top + (1 - p.y) * rect.height / 2);
  };
  function capture(vortex: THREE.Object3D, gun: THREE.Object3D, objects: FlightObject[], reduced: boolean, onComplete: (position: THREE.Vector3) => void) {
    camera.updateMatrixWorld(true);
    const gunLocal = gun.position.clone().applyQuaternion(camera.quaternion.clone().invert());
    const projected = gun.position.clone().project(camera);
    const rect = canvas.getBoundingClientRect();
    // Choose a distant point in screen pixels, with room for the expanded portal.
    const marginX = Math.min(.42, 1.5 * camera.zoom / (camera.right - camera.left));
    const marginY = Math.min(.42, 1.5 * camera.zoom / (camera.top - camera.bottom));
    let target = new THREE.Vector3();
    let farthest = -1;
    for (let i = 0; i < 24; i++) {
      const candidate = new THREE.Vector3((Math.random() * 2 - 1) * (1 - marginX), (Math.random() * 2 - 1) * (1 - marginY), projected.z);
      const distance = Math.hypot((candidate.x - projected.x) * rect.width, (candidate.y - projected.y) * rect.height);
      if (distance > farthest) { target = candidate; farthest = distance; }
      if (distance > Math.max(rect.width, rect.height) * 1.05) { target = candidate; break; }
    }
    const origin = target.unproject(camera);
    projected.copy(origin).project(camera);
    // Place the exit on the opposite side, safely inside both desktop and mobile views.
    const destination = new THREE.Vector3(projected.x > 0 ? -.48 : .48, projected.y > 0 ? -.3 : .3, projected.z).unproject(camera);
    const from = screen(origin), to = screen(destination);
    const nodes = Array.from(canvas.parentElement!.querySelectorAll<HTMLElement>("[data-vortex-element]"));
    const dom = nodes.filter(node => node.getBoundingClientRect().width > 0).map(node => {
      const rect = node.getBoundingClientRect();
      return { node, center: new THREE.Vector2(rect.left + rect.width / 2, rect.top + rect.height / 2), style: node.getAttribute("style"), inert: node.inert, momentum: momentum() };
    });
    const meshes = objects.map(({ object, billboard }) => ({ object, billboard, position: object.position.clone(), quaternion: object.quaternion.clone(), scale: object.scale.clone(), visible: object.visible, momentum: momentum() }));
    dom.forEach(({ node }) => { node.inert = true; node.style.willChange = "translate, rotate, scale, opacity"; });
    // One queue for both scene objects and page elements, nearest to the mouth first.
    const queue = [
      ...meshes.map(mesh => ({ item: mesh, distance: screen(mesh.position).distanceTo(from) })),
      ...dom.map(item => ({ item, distance: item.center.distanceTo(from) })),
    ].sort((a, b) => a.distance - b.distance);
    const order = new Map(queue.map(({ item }, index) => [item, index]));
    const absorbEnd = impactDuration + Math.max(0, queue.length - 1) * stagger + absorbDuration;
    const collapseStart = absorbEnd - collapseOverlap;
    const disappearEnd = collapseStart + collapseDuration;
    const appearStart = disappearEnd + transferDuration;
    const appearEnd = appearStart + appearDuration;
    // Release as soon as the compressed core arrives, while the exit unfolds.
    const emitStart = appearEnd - emitOverlap;
    // A few deliberate releases lead into a rapid stream. Share this schedule
    // with flights and mouth reactions so the portal follows the same rhythm.
    const lastIndex = Math.max(0, queue.length - 1);
    const emitSpan = Math.min(1.65, lastIndex * stagger);
    const emitDelays = queue.map((_, index) => lastIndex === 0 ? 0
      : emitSpan * Math.log1p(5 * index / lastIndex) / Math.log(6));
    const emitEnd = emitStart + emitSpan + emitDuration;
    // Close once the last object has cleared the mouth; its settling flight continues.
    const exitCloseStart = emitEnd - emitDuration + .16;
    const duration = emitEnd + settleDuration;
    const inverseCamera = camera.quaternion.clone().invert();
    return { gun, gunLocal, gunQuaternion: gun.quaternion.clone(), aimedQuaternion: gun.quaternion.clone(), muzzle: new THREE.Vector3(), order, emitDelays, absorbEnd, collapseStart, disappearEnd, appearStart, appearEnd, emitStart, emitEnd, exitCloseStart, duration, vortex, origin, destination, originLocal: origin.clone().applyQuaternion(inverseCamera), destinationLocal: destination.clone().applyQuaternion(inverseCamera), returnPosition: origin.clone(), from, to, dom, meshes, reduced, onComplete, time: 0, scale: vortex.scale.clone(), quaternion: vortex.quaternion.clone() };
  }
  function restore(completed: boolean) {
    if (!running) return;
    const state = running;
    running = undefined;
    for (const { object, position, quaternion, scale, visible } of state.meshes) {
      object.position.copy(position); object.quaternion.copy(quaternion); object.scale.copy(scale); object.visible = visible;
    }
    for (const { node, style, inert } of state.dom) {
      if (style === null) node.removeAttribute("style"); else node.setAttribute("style", style);
      node.inert = inert;
    }
    state.vortex.visible = false;
    state.vortex.position.copy(completed ? state.destination : state.returnPosition);
    state.vortex.scale.copy(state.scale);
    state.vortex.quaternion.copy(camera.quaternion);
    delete canvas.dataset.vortexPhase;
    canvas.style.cursor = "grab";
    if (completed) state.onComplete(state.destination);
  }
  // Short overlapping flights: objects shrink only as they reach the mouth,
  // and grow as they leave it, rather than scaling the whole scene together.
  function flight(t: number, index: number, emitStart: number, emitDelays: number[]) {
    const incoming = t < emitStart;
    const delay = incoming ? index * stagger : emitDelays[index];
    const p = incoming ? clamp((t - impactDuration - delay) / absorbDuration) : clamp((t - emitStart - delay) / emitDuration);
    const travel = incoming ? easeIn(p) : smoother(p);
    const elapsed = t - (incoming ? impactDuration : emitStart) - delay;
    const scale = incoming ? 1 - smooth((travel - .55) / .45) : smooth(elapsed / .09);
    // The exit starts at full speed, so its reaction belongs at the mouth.
    const impulseStart = incoming ? absorbDuration - mouthImpulseDuration : 0;
    const impulse = (elapsed - impulseStart) / mouthImpulseDuration;
    const pressure = impulse > 0 && impulse < 1 ? Math.sin(impulse * Math.PI) ** 2 : 0;
    return { incoming, elapsed, travel, scale, pressure, angle: (incoming ? travel : travel - 1) * swirl, visible: incoming ? p < 1 : p > 0 };
  }
  function move(relative: THREE.Vector3, f: ReturnType<typeof flight>, motion: Momentum) {
    if (f.incoming) {
      // At the throat the rotating radius is zero: terminal speed is exactly
      // distance * d(p^4)/dt. Freeze it when this item's intake completes.
      if (!motion.absorbed) {
        motion.speed = relative.length() * 4 / absorbDuration;
        motion.absorbed = f.elapsed >= absorbDuration;
      }
      return relative.applyAxisAngle(new THREE.Vector3(0, 0, 1), f.angle).multiplyScalar(1 - f.travel);
    }
    if (f.elapsed <= 0) return relative.set(0, 0, 0);
    // Parameterize the outward spiral by travelled distance, not radius: this
    // keeps the mouth's launch speed while spending momentum on the winding.
    const arc = (r: number, pitch: number) => pitch < 1e-6 ? r
      : .5 * (r * Math.hypot(1, pitch * r) + Math.asinh(pitch * r) / pitch);
    if (!motion.exit) {
      const distance = relative.length();
      const pitch = emitSwirl * Math.hypot(relative.x, relative.y) / Math.max(1e-6, distance);
      const length = distance * arc(1, pitch);
      const travelTime = length / Math.max(1e-6, motion.speed);
      // An extra half-turn gives the impulse room to persist without sending
      // objects farther out. Reserve 45% of the path for full-speed winding.
      const coast = Math.min(emitCoastDuration, travelTime * .45);
      motion.exit = { pitch, length, coast, duration: Math.max(.001, coast + 2 * (travelTime - coast)) };
    }
    const { pitch, length, coast, duration } = motion.exit;
    const tail = duration - coast;
    const p = clamp((f.elapsed - coast) / tail);
    // Hold the inherited speed first; only then ease the speed down. Integrating
    // that speed reaches the end of the spiral exactly, without an overshoot.
    const distance = motion.speed * (Math.min(f.elapsed, coast) + tail * (p - p ** 3 + .5 * p ** 4));
    const progress = clamp(distance / Math.max(1e-6, length));
    const target = progress * arc(1, pitch);
    let radius = progress;
    for (let i = 0; i < 7; i++) {
      radius = clamp(radius - (arc(radius, pitch) - target) / Math.hypot(1, pitch * radius));
    }
    if (f.elapsed >= duration) radius = 1;
    f.travel = radius;
    f.angle = (radius - 1) * emitSwirl;
    return relative.applyAxisAngle(new THREE.Vector3(0, 0, 1), f.angle).multiplyScalar(radius);
  }
  return {
    get active() { return !!running; },
    start(vortex: THREE.Object3D, gun: THREE.Object3D, objects: FlightObject[], reduced: boolean, onComplete: (position: THREE.Vector3) => void) {
      if (running) return;
      running = capture(vortex, gun, objects, reduced, onComplete);
      canvas.style.cursor = "wait";
      canvas.dataset.vortexPhase = "aim";
    },
    cancel: () => restore(false),
    update(delta: number) {
      if (!running) return;
      const s = running;
      // Physics supplies fresh poses every frame, including while objects are
      // hidden. The world composes its normal animation first, so position,
      // orientation and size all converge to the exact next-frame baseline.
      if (!s.reduced) {
        s.returnPosition.copy(s.vortex.position);
        s.origin.copy(s.originLocal).applyQuaternion(camera.quaternion);
        s.destination.copy(s.destinationLocal).applyQuaternion(camera.quaternion);
        for (const mesh of s.meshes) {
          mesh.position.copy(mesh.object.position);
          mesh.quaternion.copy(mesh.object.quaternion);
          mesh.scale.copy(mesh.object.scale);
          // Visibility belongs to the captured baseline: the previous flight
          // may have hidden this object while it was inside the portal.
        }
      }
      s.time += delta;
      const seconds = s.time;
      if (seconds >= (s.reduced ? .3 : s.duration + launchDuration)) { restore(true); return; }
      if (s.reduced) {
        s.vortex.visible = seconds < .1 || seconds > .2;
        if (seconds > .15) s.vortex.position.copy(s.destination);
        return;
      }
      const t = seconds - launchDuration;
      if (t < 0) {
        canvas.dataset.vortexPhase = seconds < aimDuration ? "aim" : "shoot";
        const gunPosition = s.gunLocal.clone().applyQuaternion(camera.quaternion);
        const direction = s.origin.clone().sub(gunPosition).applyQuaternion(camera.quaternion.clone().invert());
        // The toy barrel points along local +X, with a built-in .08 rad tilt.
        const aim = camera.quaternion.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.atan2(direction.y, direction.x) - .08));
        s.gun.position.copy(gunPosition);
        s.gun.quaternion.copy(s.gunQuaternion).slerp(aim, easeInOut(seconds / aimDuration));
        s.aimedQuaternion.copy(aim);
        if (seconds >= aimDuration) {
          const muzzle = s.gun.getObjectByName("portal-muzzle");
          s.gun.updateWorldMatrix(true, true);
          if (muzzle) muzzle.getWorldPosition(s.muzzle); else s.muzzle.copy(gunPosition);
          const progress = clamp((seconds - aimDuration) / (launchDuration - aimDuration));
          const recoil = Math.sin(clamp((seconds - aimDuration) / .22) * Math.PI) * .12;
          s.gun.position.addScaledVector(s.origin.clone().sub(s.muzzle).normalize(), -recoil);
          s.vortex.visible = true;
          s.vortex.position.lerpVectors(s.muzzle, s.origin, easeIn(progress));
          s.vortex.quaternion.copy(camera.quaternion);
          s.vortex.scale.copy(s.scale).multiplyScalar(.16 + .035 * Math.sin(progress * Math.PI));
        } else s.vortex.visible = false;
        return;
      }
      s.from.copy(screen(s.origin)); s.to.copy(screen(s.destination));
      // Ease the gun back into its live drift after firing, before it is absorbed.
      if (t < impactDuration) {
        const gunMesh = s.meshes.find(mesh => mesh.object === s.gun);
        if (gunMesh) {
          gunMesh.position.lerpVectors(s.gunLocal.clone().applyQuaternion(camera.quaternion), gunMesh.position.clone(), easeOut(t / impactDuration));
          gunMesh.quaternion.copy(s.aimedQuaternion.clone().slerp(gunMesh.quaternion, easeOut(t / impactDuration)));
        }
      }
      canvas.dataset.vortexPhase = t < impactDuration ? "impact" : t < s.absorbEnd ? "absorb" : t < s.appearStart ? "transfer" : t < s.emitStart ? "appear" : "emit";
      const transfer = smooth((t - s.disappearEnd) / transferDuration);
      let size = t < impactDuration ? .16 + easeOut(t / impactDuration) * 2.34
        : t < s.collapseStart ? 2.5
        : t < s.disappearEnd ? throatScale + (2.5 - throatScale) * (1 - smooth((t - s.collapseStart) / collapseDuration))
        : t < s.appearStart ? throatScale
        : t < s.appearEnd ? throatScale + (2.5 - throatScale) * smooth((t - s.appearStart) / appearDuration)
        : 2.5 * (1 - easeIn((t - s.exitCloseStart) / exitCloseDuration));
      size = Math.max(0, size);
      s.vortex.visible = size > .001;
      const inverseCamera = camera.quaternion.clone().invert();
      const reaction = new THREE.Vector3();
      let intake = 0, release = 0;
      const respond = (index: number, x: number, y: number) => {
        const f = flight(t, index, s.emitStart, s.emitDelays);
        if (f.pressure === 0) return;
        const length = Math.hypot(x, y) || 1;
        // Pull toward arriving objects; recoil away from departing objects.
        const force = f.pressure * (f.incoming ? .115 : -.115) / length;
        reaction.x += (x * Math.cos(f.angle) - y * Math.sin(f.angle)) * force;
        reaction.y += (x * Math.sin(f.angle) + y * Math.cos(f.angle)) * force;
        if (f.incoming) intake += f.pressure; else release += f.pressure;
      };
      const mouth = t < s.emitStart ? s.origin : s.destination;
      for (const mesh of s.meshes) {
        if (!mesh.visible) continue;
        const direction = mesh.position.clone().sub(mouth).applyQuaternion(inverseCamera);
        respond(s.order.get(mesh)!, direction.x, direction.y);
      }
      const mouthScreen = t < s.emitStart ? s.from : s.to;
      for (const item of s.dom) {
        respond(s.order.get(item)!, item.center.x - mouthScreen.x, mouthScreen.y - item.center.y);
      }
      // Bound overlapping reactions without letting idle time generate movement.
      reaction.multiplyScalar(1 / Math.max(1, intake + release));
      const compression = clamp(intake), expansion = clamp(release);
      const activity = clamp(intake + release);
      // Both directions share a fine, fast tremor over the larger mouth reaction.
      // Gate every oscillation with crossing pressure so idle gaps stay still.
      const tremorX = Math.sin(seconds * 83) * .012 * activity;
      const tremorY = Math.sin(seconds * 107) * .012 * activity;
      const tremorTurn = Math.sin(seconds * 97) * .014 * activity;
      reaction.x += tremorX;
      reaction.y += tremorY;
      s.vortex.scale.copy(s.scale).multiplyScalar(size * (1 - .085 * compression + .085 * expansion));
      const offset = reaction.applyQuaternion(camera.quaternion);
      // Keep a visible, compressed core moving between mouths: no empty cut.
      s.vortex.position.lerpVectors(s.origin, s.destination, transfer).add(offset);
      s.vortex.quaternion.copy(camera.quaternion);
      s.vortex.rotateZ(.07 * (compression - expansion) + tremorTurn);
      const screenShake = screen(s.vortex.position).sub(screen(s.origin.clone().lerp(s.destination, transfer)));
      s.meshes.forEach(mesh => {
        const { object, position, quaternion, scale, visible } = mesh;
        const f = flight(t, s.order.get(mesh)!, s.emitStart, s.emitDelays);
        const mouth = f.incoming ? s.origin : s.destination;
        const relative = position.clone().sub(mouth).applyQuaternion(inverseCamera);
        move(relative, f, mesh.momentum);
        if (mesh.momentum.exit) s.duration = Math.max(s.duration,
          s.emitStart + s.emitDelays[s.order.get(mesh)!] + mesh.momentum.exit.duration + settleDuration);
        const radial = f.incoming ? 1 - f.travel : f.travel;
        object.position.copy(relative.applyQuaternion(camera.quaternion).add(mouth)).addScaledVector(offset, 1 - radial);
        object.scale.copy(scale).multiplyScalar(Math.max(.001, f.scale));
        object.quaternion.copy(quaternion); object.rotateZ(f.angle); object.rotateY(f.angle * .6);
        object.visible = visible && f.visible;
      });
      s.dom.forEach(item => {
        const { node, center } = item;
        const f = flight(t, s.order.get(item)!, s.emitStart, s.emitDelays);
        const mouth = f.incoming ? s.from : s.to;
        const relative = move(new THREE.Vector3(center.x - mouth.x, mouth.y - center.y, 0), f, item.momentum);
        if (item.momentum.exit) s.duration = Math.max(s.duration,
          s.emitStart + s.emitDelays[s.order.get(item)!] + item.momentum.exit.duration + settleDuration);
        const radial = f.incoming ? 1 - f.travel : f.travel;
        node.style.translate = `${mouth.x + relative.x - center.x + screenShake.x * (1 - radial)}px ${mouth.y - relative.y - center.y + screenShake.y * (1 - radial)}px`;
        node.style.rotate = `${-f.angle}rad`;
        node.style.scale = String(Math.max(.001, f.scale));
        node.style.opacity = f.visible ? String(clamp(f.scale * 4)) : "0";
      });
    },
  };
}
