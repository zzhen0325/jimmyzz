import * as THREE from "three";
import { home3DConfig } from "./home-3d-config";

/** Retro green toy ray gun, with a rounded shell, stepped nozzle and silver controls. */
export function createChromePortalGun() {
  const group = new THREE.Group();
  group.name = "floating-green-portal-gun";
  const config = home3DConfig.portalGun;
  const shell = new THREE.MeshPhysicalMaterial(config.materials.shell);
  // Wider, multi-channel scuffs survive mipmapping at the floating object's size.
  const makeCanvas = (fill: string) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 512;
    const context = canvas.getContext("2d")!;
    context.fillStyle = fill;
    context.fillRect(0, 0, 512, 512);
    context.lineCap = "round";
    return { canvas, context };
  };
  const height = makeCanvas("#808080");
  const roughness = makeCanvas("#999999");
  const color = makeCanvas("#bdbdbd");
  let seed = 147;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 120; i++) {
    const x = random() * 512, y = random() * 512;
    const length = 18 + random() * 70, angle = -.65 + random() * 1.5;
    const width = 1.3 + random() * 1.6;
    const opacity = .5 + random() * .4;
    const endX = x + Math.cos(angle) * length, endY = y + Math.sin(angle) * length;
    for (const [context, stroke, thickness] of [
      [height.context, `rgba(35,35,35,${opacity})`, width],
      [roughness.context, `rgba(255,255,255,${opacity})`, width + 1.5],
      [color.context, `rgba(255,255,255,${opacity * .8})`, width + .4],
    ] as const) {
      context.strokeStyle = stroke;
      context.lineWidth = thickness;
      context.beginPath(); context.moveTo(x, y);
      context.lineTo(endX, endY); context.stroke();
    }
  }
  const texture = (canvas: HTMLCanvasElement) => {
    const map = new THREE.CanvasTexture(canvas);
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    return map;
  };
  shell.bumpMap = texture(height.canvas);
  shell.bumpScale = .065;
  shell.roughnessMap = texture(roughness.canvas);
  shell.roughness = .7; // .42 on the shell, up to .7 along the worn strokes.
  shell.map = texture(color.canvas);
  shell.map.colorSpace = THREE.SRGBColorSpace;
  const trim = new THREE.MeshPhysicalMaterial(config.materials.trim);
  const silver = new THREE.MeshPhysicalMaterial(config.materials.buttons);
  const dark = new THREE.MeshStandardMaterial({ color: "#052820", roughness: .25, metalness: .35 });
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material, position: number[]) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.fromArray(position); group.add(mesh); return mesh;
  };
  const body = add(new THREE.SphereGeometry(1, 48, 32), shell, [-.35, .35, 0]);
  body.scale.set(1.02, .46, .35);

  const grip = new THREE.Shape();
  grip.moveTo(-.8, .12);
  grip.bezierCurveTo(-.75, -.25, -1.27, -.47, -1.18, -1.18);
  grip.quadraticCurveTo(-1.17, -1.32, -.97, -1.28);
  grip.lineTo(-.61, -1.18);
  grip.quadraticCurveTo(-.48, -1.13, -.54, -.92);
  grip.bezierCurveTo(-.62, -.66, -.27, -.49, -.18, -.05);
  grip.closePath();
  const gripGeometry = new THREE.ExtrudeGeometry(grip, { depth: .34, bevelEnabled: true, bevelThickness: .08, bevelSize: .07, bevelSegments: 5, curveSegments: 24, steps: 1 });
  gripGeometry.translate(0, 0, -.17);
  const gripMesh = add(gripGeometry, shell, [0, 0, 0]);
  // Project every sample onto the actual mesh instead of drawing on a flat Z plane.
  // Linear segments preserve the arrow corners and cannot bow away from the shell.
  const surfaceLine = (points: THREE.Vector2[], target: THREE.Mesh, side: number, radius: number, closed = false) => {
    target.updateWorldMatrix(true, false);
    const path = new THREE.CurvePath<THREE.Vector3>();
    const count = closed ? points.length : points.length - 1;
    for (let i = 0; i < count; i++) {
      const a = points[i], b = points[(i + 1) % points.length];
      if (a.distanceToSquared(b) > 1e-10) path.add(new THREE.LineCurve3(new THREE.Vector3(a.x, a.y, 0), new THREE.Vector3(b.x, b.y, 0)));
    }
    const ray = new THREE.Raycaster();
    const direction = new THREE.Vector3(0, 0, -side);
    let run: THREE.Vector3[] = [];
    const flush = () => {
      if (run.length > 1) {
        const fitted = new THREE.CurvePath<THREE.Vector3>();
        for (let i = 1; i < run.length; i++) fitted.add(new THREE.LineCurve3(run[i - 1], run[i]));
        add(new THREE.TubeGeometry(fitted, run.length * 2, radius, 6, false), trim, [0, 0, 0]);
      }
      run = [];
    };
    for (const point of path.getSpacedPoints(Math.max(128, points.length * 16))) {
      ray.set(new THREE.Vector3(point.x, point.y, side * 2), direction);
      const hit = ray.intersectObject(target, false)[0];
      if (!hit) { flush(); continue; } // Clip decoration where it leaves the grip silhouette.
      const fitted = group.worldToLocal(hit.point.clone());
      fitted.z += side * .002; // Almost flush; most of the line is embedded in the plastic.
      run.push(fitted);
    }
    flush();
  };
  const outline = grip.getPoints(32);
  for (const side of [-1, 1]) surfaceLine(outline, gripMesh, side, .012, true);

  // Cylinders point along +X; each collar decreases toward the muzzle.
  for (const [x, radius, length] of [[.64, .4, .18], [.94, .32, .34], [1.22, .235, .26], [1.46, .14, .27]]) {
    const barrel = add(new THREE.CylinderGeometry(radius * .87, radius, length, 40), shell, [x, .35, 0]);
    barrel.rotation.z = -Math.PI / 2;
    const rim = add(new THREE.TorusGeometry(radius, .026, 10, 48), trim, [x - length / 2, .35, 0]);
    rim.rotation.y = Math.PI / 2;
  }
  const muzzle = add(new THREE.CylinderGeometry(.105, .105, .025, 32), dark, [1.605, .35, 0]);
  muzzle.name = "portal-muzzle";
  muzzle.rotation.z = Math.PI / 2;
  const inner = add(new THREE.TorusGeometry(.076, .018, 10, 32), silver, [1.622, .35, 0]);
  inner.rotation.y = Math.PI / 2;

  // Decorative double arrow and small silver side button on both faces.
  for (const side of [-1, 1]) {
    const arrow = [[-.99, .36], [-.08, .39], [-.33, .59], [.18, .39], [.03, .54], [.43, .34], [.05, .15], [.2, .3], [-.34, .15], [-.08, .3], [-.99, .31]];
    surfaceLine(arrow.map(([x, y]) => new THREE.Vector2(x, y)), body, side, .009);
    const button = add(new THREE.CylinderGeometry(.105, .105, .085, 32), silver, [-1.04, .48, side * .255]);
    button.rotation.x = Math.PI / 2;
    const socket = add(new THREE.TorusGeometry(.107, .019, 8, 32), silver, [-1.04, .48, side * .303]);
    socket.rotation.z = .2;
    for (let i = 0; i < 3; i++) {
      surfaceLine([new THREE.Vector2(-1.06 + i * .075, -.96 + i * .22), new THREE.Vector2(-.66 + i * .06, -.84 + i * .2)], gripMesh, side, .009);
    }
  }
  const trigger = add(new THREE.CylinderGeometry(.065, .065, .28, 24), silver, [-.09, -.29, 0]);
  trigger.rotation.z = Math.PI / 2;
  const cap = add(new THREE.CylinderGeometry(.115, .115, .05, 24), silver, [.06, -.29, 0]);
  cap.rotation.z = Math.PI / 2;
  group.rotation.z = .08;
  return group;
}
