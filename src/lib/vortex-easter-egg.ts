import * as THREE from "three";

const clamp = (n: number) => THREE.MathUtils.clamp(n, 0, 1);
const smooth = (n: number) => { const p = clamp(n); return p * p * (3 - 2 * p); };
const easeIn = (n: number) => Math.pow(clamp(n), 4);
const easeOut = (n: number) => 1 - Math.pow(1 - clamp(n), 5);
const easeInOut = (n: number) => {
  const p = clamp(n);
  return p < .5 ? 8 * p ** 4 : 1 - (-2 * p + 2) ** 4 / 2;
};
const aimDuration = .3;
const launchDuration = .72;
const impactDuration = .36;
const stagger = .075;
const absorbDuration = .56;
const collapseDuration = .24;
const hiddenDuration = .12;
const appearDuration = .28;
const emitDuration = .86;
const exitCloseDuration = .16;
const settleDuration = .16;
type FlightObject = { object: THREE.Object3D; billboard?: boolean };

/** Temporarily take over visuals; leave physics and DOM layout intact. */
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
      return { node, center: new THREE.Vector2(rect.left + rect.width / 2, rect.top + rect.height / 2), style: node.getAttribute("style"), inert: node.inert };
    });
    const meshes = objects.map(({ object, billboard }) => ({ object, billboard, position: object.position.clone(), quaternion: object.quaternion.clone(), scale: object.scale.clone(), visible: object.visible }));
    dom.forEach(({ node }) => { node.inert = true; node.style.willChange = "translate, rotate, scale, opacity"; });
    // One queue for both scene objects and page elements, nearest to the mouth first.
    const queue = [
      ...meshes.map(mesh => ({ item: mesh, distance: screen(mesh.position).distanceTo(from) })),
      ...dom.map(item => ({ item, distance: item.center.distanceTo(from) })),
    ].sort((a, b) => a.distance - b.distance);
    const order = new Map(queue.map(({ item }, index) => [item, index]));
    const absorbEnd = impactDuration + Math.max(0, queue.length - 1) * stagger + absorbDuration;
    const disappearEnd = absorbEnd + collapseDuration;
    const appearStart = disappearEnd + hiddenDuration;
    const emitStart = appearStart + appearDuration;
    const emitEnd = emitStart + Math.max(0, queue.length - 1) * stagger + emitDuration;
    // Close once the last object has cleared the mouth; its settling flight continues.
    const exitCloseStart = emitEnd - emitDuration + .18;
    const duration = emitEnd + settleDuration;
    const inverseCamera = camera.quaternion.clone().invert();
    return { gun, gunLocal, gunQuaternion: gun.quaternion.clone(), aimedQuaternion: gun.quaternion.clone(), muzzle: new THREE.Vector3(), order, absorbEnd, disappearEnd, appearStart, emitStart, emitEnd, exitCloseStart, duration, vortex, origin, destination, originLocal: origin.clone().applyQuaternion(inverseCamera), destinationLocal: destination.clone().applyQuaternion(inverseCamera), returnPosition: origin.clone(), from, to, dom, meshes, reduced, onComplete, time: 0, scale: vortex.scale.clone(), quaternion: vortex.quaternion.clone() };
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
  function flight(t: number, index: number, emitStart: number) {
    const delay = index * stagger;
    const incoming = t < emitStart;
    const p = incoming ? clamp((t - impactDuration - delay) / absorbDuration) : clamp((t - emitStart - delay) / emitDuration);
    const travel = incoming ? easeIn(p) : easeOut(p);
    const scale = incoming ? 1 - smooth((travel - .55) / .45) : smooth(travel / .45);
    return { incoming, travel, scale, angle: (incoming ? travel : 1 - travel) * Math.PI * 1.35, visible: incoming ? p < 1 : p > 0 };
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
      canvas.dataset.vortexPhase = t < impactDuration ? "impact" : t < s.absorbEnd ? "absorb" : t < s.appearStart ? "hidden" : t < s.emitStart ? "appear" : "emit";
      const exit = t >= s.appearStart;
      let size = t < impactDuration ? .16 + easeOut(t / impactDuration) * 2.34
        : t < s.absorbEnd ? 2.5
        : t < s.disappearEnd ? 2.5 * (1 - easeIn((t - s.absorbEnd) / collapseDuration))
        : t < s.appearStart ? 0
        : t < s.emitStart ? 2.5 * easeOut((t - s.appearStart) / appearDuration)
        : 2.5 * (1 - easeIn((t - s.exitCloseStart) / exitCloseDuration));
      size = Math.max(0, size);
      s.vortex.visible = size > .001;
      const inhale = smooth(t / impactDuration) * (1 - easeIn((t - s.absorbEnd) / collapseDuration));
      const exhale = smooth((t - s.appearStart) / appearDuration) * (1 - easeIn((t - s.exitCloseStart) / exitCloseDuration));
      const pulse = .72 + .28 * Math.pow(Math.sin(seconds * 14), 2);
      const shake = (.035 * inhale + .05 * exhale) * pulse;
      s.vortex.scale.copy(s.scale).multiplyScalar(size * (1 + Math.sin(seconds * 28) * .025 * exhale));
      // Oscillate in real time; only the amplitude fades with the choreography.
      const offset = new THREE.Vector3(Math.sin(seconds * 93) * shake, Math.cos(seconds * 117) * shake, 0).applyQuaternion(camera.quaternion);
      s.vortex.position.copy(exit ? s.destination : s.origin).add(offset);
      s.vortex.quaternion.copy(camera.quaternion);
      s.vortex.rotateZ(Math.sin(seconds * 61) * shake * 1.4);
      const screenShake = screen(s.vortex.position).sub(exit ? s.to : s.from);
      const inverseCamera = camera.quaternion.clone().invert();
      s.meshes.forEach(mesh => {
        const { object, position, quaternion, scale, visible } = mesh;
        const f = flight(t, s.order.get(mesh)!, s.emitStart);
        const mouth = f.incoming ? s.origin : s.destination;
        const relative = position.clone().sub(mouth).applyQuaternion(inverseCamera);
        const radial = f.incoming ? 1 - f.travel : f.travel;
        const x = relative.x, y = relative.y;
        relative.x = (x * Math.cos(f.angle) - y * Math.sin(f.angle)) * radial;
        relative.y = (x * Math.sin(f.angle) + y * Math.cos(f.angle)) * radial;
        relative.z *= radial;
        object.position.copy(relative.applyQuaternion(camera.quaternion).add(mouth)).addScaledVector(offset, 1 - radial);
        object.scale.copy(scale).multiplyScalar(Math.max(.001, f.scale));
        object.quaternion.copy(quaternion); object.rotateZ(f.angle); object.rotateY(f.angle * .6);
        object.visible = visible && f.visible;
      });
      s.dom.forEach(item => {
        const { node, center } = item;
        const f = flight(t, s.order.get(item)!, s.emitStart);
        const mouth = f.incoming ? s.from : s.to;
        const radial = f.incoming ? 1 - f.travel : f.travel;
        const x = center.x - mouth.x, y = center.y - mouth.y;
        const px = mouth.x + (x * Math.cos(-f.angle) - y * Math.sin(-f.angle)) * radial;
        const py = mouth.y + (x * Math.sin(-f.angle) + y * Math.cos(-f.angle)) * radial;
        node.style.translate = `${px - center.x + screenShake.x * (1 - radial)}px ${py - center.y + screenShake.y * (1 - radial)}px`;
        node.style.rotate = `${-f.angle}rad`;
        node.style.scale = String(Math.max(.001, f.scale));
        node.style.opacity = f.visible ? String(clamp(f.scale * 4)) : "0";
      });
    },
  };
}
