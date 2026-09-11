import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

/** Compact twin-stick controller, with its controls facing local +Z. */
export function createChromeGamepad() {
  const controller = new THREE.Group();
  controller.name = "arcade-gamepad";
  const metal = new THREE.MeshStandardMaterial({ color: 0xb9c5c5, metalness: .55, roughness: .38, envMapIntensity: .3 });
  const edge = new THREE.MeshStandardMaterial({ color: 0x737b80, metalness: .9, roughness: .26 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x202428, metalness: .08, roughness: .65 });
  const red = new THREE.MeshStandardMaterial({ color: 0xff463a, metalness: .15, roughness: .32 });
  const screw = new THREE.MeshStandardMaterial({ color: 0xdfe5e5, metalness: 1, roughness: .18 });
  const box = (w: number, h: number, d: number, radius: number, material: THREE.Material, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, radius), material);
    mesh.position.set(x, y, z); controller.add(mesh); return mesh;
  };
  const cylinder = (radius: number, depth: number, material: THREE.Material, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, depth, 32), material);
    mesh.rotation.x = Math.PI / 2; mesh.position.set(x, y, z); controller.add(mesh); return mesh;
  };
  const label = (text: string, color: string, x: number, y: number, z: number, w: number, h: number) => {
    const canvas = document.createElement("canvas"); canvas.width = 256; canvas.height = 128;
    const context = canvas.getContext("2d")!;
    context.fillStyle = color; context.font = "italic 700 64px Arial";
    context.textAlign = "center"; context.textBaseline = "middle"; context.fillText(text, 128, 68);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }));
    mesh.position.set(x, y, z); controller.add(mesh);
  };

  box(2.5, 1.4, .3, .13, edge, 0, 0, 0);
  box(2.48, 1.38, .07, .12, metal, 0, 0, .17);
  box(2.35, 1.25, .04, .1, rubber, 0, 0, -.16);
  for (const x of [-.79, .79]) {
    cylinder(.32, .025, rubber, x, .16, .216);
    cylinder(.145, .095, edge, x, .16, .265);
    cylinder(.103, .38, rubber, x, .16, .46);
    cylinder(.114, .045, red, x, .16, .64);
    cylinder(.14, .09, rubber, x, .16, .7);
  }
  for (const [text, x, y, isRed] of [
    ["A", -.28, -.14, false], ["B", -.5, -.45, true],
    ["X", .28, -.14, false], ["Y", .5, -.45, true],
  ] as const) {
    cylinder(.145, .035, edge, x, y, .22);
    cylinder(.133, .075, isRed ? red : rubber, x, y, .265);
    label(text, isRed ? "#25292b" : "#ff594b", x, y, .305, .24, .12);
  }
  for (const [text, x] of [["SELECT", -.16], ["START", .16]] as const) {
    box(.31, .2, .07, .07, rubber, x, .34, .25);
    label(text, "#ff594b", x, .34, .287, .27, .135);
  }
  for (const x of [-1.08, 1.08]) for (const y of [-.53, .53]) {
    cylinder(.047, .018, screw, x, y, .214);
    box(.05, .008, .004, .002, rubber, x, y, .226);
    box(.008, .05, .004, .002, rubber, x, y, .226);
  }
  // Give the shallow enclosure and raised sticks an immediately readable silhouette.
  controller.rotation.set(.28, -.16, -.12);
  return controller;
}
