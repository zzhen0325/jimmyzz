import * as THREE from "three";

const clamp = (n: number) => THREE.MathUtils.clamp(n, 0, 1);
const smooth = (n: number) => { const p = clamp(n); return p * p * (3 - 2 * p); };
const duration = 6.2;
type FlightObject = { object: THREE.Object3D; billboard?: boolean };

/** Temporarily take over visuals; leave physics and DOM layout intact. */
export function createVortexEasterEgg(canvas: HTMLCanvasElement, camera: THREE.OrthographicCamera) {
  let running: ReturnType<typeof capture> | undefined;
  const screen = (point: THREE.Vector3) => {
    const p = point.clone().project(camera);
    const rect = canvas.getBoundingClientRect();
    return new THREE.Vector2(rect.left + (p.x + 1) * rect.width / 2, rect.top + (1 - p.y) * rect.height / 2);
  };
  function capture(vortex: THREE.Object3D, objects: FlightObject[], reduced: boolean, onComplete: (position: THREE.Vector3) => void) {
    const origin = vortex.position.clone();
    const projected = origin.clone().project(camera);
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
    const inverseCamera = camera.quaternion.clone().invert();
    return { vortex, origin, destination, originLocal: origin.clone().applyQuaternion(inverseCamera), destinationLocal: destination.clone().applyQuaternion(inverseCamera), returnPosition: origin.clone(), from, to, dom, meshes, reduced, onComplete, time: 0, scale: vortex.scale.clone(), quaternion: vortex.quaternion.clone() };
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
    state.vortex.visible = true;
    state.vortex.position.copy(completed ? state.destination : state.returnPosition);
    state.vortex.scale.copy(state.scale);
    state.vortex.quaternion.copy(camera.quaternion);
    delete canvas.dataset.vortexPhase;
    canvas.style.cursor = "grab";
    if (completed) state.onComplete(state.destination);
  }
  // Local flight curves complement the shared slow–fast–slow choreography clock.
  function flight(t: number, index: number, count: number) {
    const delay = index / Math.max(1, count - 1) * .4;
    const incoming = t < 3;
    const p = incoming ? clamp((t - .55 - delay) / 1.55) : clamp((t - 3.65 - delay) / 2.15);
    const travel = incoming ? p * p * p : 1 - Math.pow(1 - p, 3);
    return { incoming, travel, scale: incoming ? 1 - Math.pow(p, 2) : 1 - Math.pow(1 - p, 2), angle: (incoming ? travel : 1 - travel) * Math.PI * 1.35, visible: incoming ? p < 1 : p > 0 };
  }
  return {
    get active() { return !!running; },
    start(vortex: THREE.Object3D, objects: FlightObject[], reduced: boolean, onComplete: (position: THREE.Vector3) => void) {
      if (running) return;
      running = capture(vortex, objects, reduced, onComplete);
      canvas.style.cursor = "wait";
      canvas.dataset.vortexPhase = "charge";
    },
    cancel: () => restore(false),
    update(delta: number) {
      if (!running) return;
      const s = running;
      // Physics supplies fresh poses every frame, including while objects are
      // hidden. Flights return to these moving targets, never frozen snapshots.
      if (!s.reduced) {
        s.returnPosition.copy(s.vortex.position);
        s.origin.copy(s.originLocal).applyQuaternion(camera.quaternion);
        s.destination.copy(s.destinationLocal).applyQuaternion(camera.quaternion);
        for (const mesh of s.meshes) {
          mesh.position.copy(mesh.object.position);
          mesh.quaternion.copy(mesh.billboard ? camera.quaternion : mesh.object.quaternion);
        }
      }
      s.time += delta;
      const seconds = s.time;
      if (seconds >= (s.reduced ? .3 : duration)) { restore(true); return; }
      if (s.reduced) {
        s.vortex.visible = seconds < .1 || seconds > .2;
        if (seconds > .15) s.vortex.position.copy(s.destination);
        return;
      }
      // One master ease keeps the whole journey slow at its ends and fastest
      // around the handoff, instead of pausing between two independent flights.
      const t = smooth(seconds / duration) * duration;
      canvas.dataset.vortexPhase = t < .55 ? "charge" : t < 2.75 ? "absorb" : t < 3.15 ? "hidden" : t < 3.65 ? "appear" : "emit";
      const exit = t >= 3.15;
      let size = t < .55 ? 1 + smooth(t / .55) * 1.5 : t < 2.35 ? 2.5 : t < 2.75 ? 2.5 * (1 - smooth((t - 2.35) / .4)) : t < 3.15 ? 0 : t < 3.65 ? 2.5 * smooth((t - 3.15) / .5) : 2.5 - 1.5 * smooth((t - 5.2) / 1);
      size = Math.max(0, size);
      s.vortex.visible = size > .001;
      const inhale = smooth(t / .55) * (1 - smooth((t - 2.35) / .4));
      const exhale = smooth((t - 3.15) / .35) * (1 - smooth((t - 4.7) / 1.5));
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
      s.meshes.forEach(({ object, position, quaternion, scale, visible }, index) => {
        const f = flight(t, index, s.meshes.length);
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
      s.dom.forEach(({ node, center }, index) => {
        const f = flight(t, index, s.dom.length);
        const mouth = f.incoming ? s.from : s.to;
        const radial = f.incoming ? 1 - f.travel : f.travel;
        const x = center.x - mouth.x, y = center.y - mouth.y;
        const px = mouth.x + (x * Math.cos(-f.angle) - y * Math.sin(-f.angle)) * radial;
        const py = mouth.y + (x * Math.sin(-f.angle) + y * Math.cos(-f.angle)) * radial;
        // Text and controls also respond gently while waiting for their turn.
        const drift = smooth(seconds / .35) * (1 - smooth((t - 5.1) / 1.1)) * radial;
        const driftX = Math.sin(seconds * 2.8 + index) * 5 * drift;
        const driftY = Math.sin(seconds * 2.2 + index * 1.7) * 4 * drift;
        node.style.translate = `${px - center.x + screenShake.x * (1 - radial) + driftX}px ${py - center.y + screenShake.y * (1 - radial) + driftY}px`;
        node.style.rotate = `${-f.angle + Math.sin(seconds * 2.4 + index) * .025 * drift}rad`;
        node.style.scale = String(Math.max(.001, f.scale));
        node.style.opacity = f.visible ? String(clamp(f.scale * 4)) : "0";
      });
    },
  };
}
