"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useOverloadMotion } from "./overload-system";

/** A procedural toy: no external model or texture needs to block the first paint. */
export default function OverloadSculpture({ remix }: { remix: number }) {
  const host = useRef<HTMLDivElement>(null);
  const { moving } = useOverloadMotion();
  const state = useRef({ moving, remix });
  useEffect(() => { state.current = { moving, remix }; }, [moving, remix]);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); } catch { return; }
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    element.appendChild(renderer.domElement);
    element.dataset.ready = "true";
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, .1, 50);
    camera.position.set(0, 0, 10.8);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x272169, 3));
    const key = new THREE.DirectionalLight(0xfff5dd, 5);
    key.position.set(-3, 5, 6); scene.add(key);
    const rim = new THREE.DirectionalLight(0x8bcbff, 4);
    rim.position.set(4, 1, -2); scene.add(rim);
    const toy = new THREE.Group(); scene.add(toy);
    const lime = new THREE.MeshPhysicalMaterial({ color: 0xbaff25, roughness: .24, metalness: .08, clearcoat: 1, clearcoatRoughness: .18 });
    const blue = new THREE.MeshPhysicalMaterial({ color: 0x303bfc, roughness: .23, metalness: .12, clearcoat: 1 });
    const orange = new THREE.MeshPhysicalMaterial({ color: 0xff671b, roughness: .25, metalness: .05, clearcoat: 1 });
    const white = new THREE.MeshPhysicalMaterial({ color: 0xfffdf1, roughness: .2, clearcoat: 1 });
    const black = new THREE.MeshStandardMaterial({ color: 0x111326, roughness: .3 });
    const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(1.24, .42, 160, 24, 2, 3), lime);
    knot.rotation.set(.3, -.2, -.3); toy.add(knot);
    const eyes = new THREE.Group(); eyes.position.set(.1, .23, 1.45); toy.add(eyes);
    const ball = new THREE.SphereGeometry(1, 40, 28);
    for (const x of [-.35, .35]) {
      const eye = new THREE.Mesh(ball, white); eye.position.x = x; eye.scale.set(.36, .47, .28); eyes.add(eye);
      const pupil = new THREE.Mesh(ball, black); pupil.position.set(x + .06, -.045, .27); pupil.scale.set(.12, .18, .09); eyes.add(pupil);
    }
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(2.25, .035, 10, 100), white);
    hoop.rotation.set(1.1, .3, -.5); toy.add(hoop);
    const satellite = new THREE.Mesh(ball, orange); satellite.scale.setScalar(.52); satellite.position.set(1.8, -1.45, .6); toy.add(satellite);
    const satellite2 = new THREE.Mesh(ball, blue); satellite2.scale.setScalar(.33); satellite2.position.set(-1.85, 1.18, .4); toy.add(satellite2);
    const cube = new THREE.Mesh(new THREE.BoxGeometry(.42, .42, .42), orange); cube.position.set(1.9, 1.8, 0); cube.rotation.set(.5, .5, .2); toy.add(cube);
    const pointer = new THREE.Vector2();
    const move = (event: PointerEvent) => { const rect = element.getBoundingClientRect(); pointer.set((event.clientX - rect.left) / rect.width - .5, (event.clientY - rect.top) / rect.height - .5); };
    const leave = () => pointer.set(0, 0);
    element.addEventListener("pointermove", move); element.addEventListener("pointerleave", leave);
    // Layout dimensions stay stable while the entrance animates the parent's scale.
    const resize = () => {
      const width = element.clientWidth, height = element.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.position.z = 10.8 / Math.min(1, camera.aspect);
      camera.updateProjectionMatrix(); render();
    };
    let visible = true, frame = 0, time = 0, last = 0, previousRemix = -1;
    const render = () => renderer.render(scene, camera);
    const palettes = [0xbaff25, 0xff712e, 0xe9b3ff];
    const tick = (now: number) => {
      frame = 0;
      const delta = Math.min((now - last) / 1000, .04); last = now;
      const active = state.current.moving;
      if (active) time += delta;
      const changed = previousRemix !== state.current.remix;
      if (changed) { lime.color.setHex(palettes[state.current.remix % palettes.length]); previousRemix = state.current.remix; }
      if (active || changed) {
        toy.rotation.y += ((pointer.x * .5 + Math.sin(time * .35) * .15) - toy.rotation.y) * .045;
        toy.rotation.x += ((pointer.y * .25 - .06) - toy.rotation.x) * .045;
        toy.rotation.z = Math.sin(time * .45) * .08;
        toy.position.y = Math.sin(time * .9) * .1;
        knot.rotation.z = -.3 + Math.sin(time * .28) * .18;
        cube.rotation.y = time * .4;
        eyes.scale.y = active && time % 5.7 > 5.5 ? .2 : 1;
        render();
      }
      if (visible && !document.hidden) frame = requestAnimationFrame(tick);
    };
    const sync = () => { cancelAnimationFrame(frame); frame = 0; if (visible && !document.hidden) { last = performance.now(); frame = requestAnimationFrame(tick); } };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }); observer.observe(element);
    const sizeObserver = new ResizeObserver(resize); sizeObserver.observe(element);
    document.addEventListener("visibilitychange", sync); resize(); sync();
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); sizeObserver.disconnect(); document.removeEventListener("visibilitychange", sync);
      element.removeEventListener("pointermove", move); element.removeEventListener("pointerleave", leave);
      const geometries = new Set<THREE.BufferGeometry>();
      scene.traverse(object => { if (object instanceof THREE.Mesh) geometries.add(object.geometry); }); geometries.forEach(geometry => geometry.dispose());
      [lime, blue, orange, white, black].forEach(material => material.dispose()); renderer.dispose(); renderer.domElement.remove(); delete element.dataset.ready;
    };
  }, []);
  return <div className="ol-sculpture" ref={host} aria-hidden="true"><div className="ol-sculpture-fallback">✳</div></div>;
}
