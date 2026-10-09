import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import contours from "./eat-sculpture-contours.json";
import labelContours from "./good-luck-label-contours.json";

type GoodLuckCylinderConfig = {
  materials: Record<"body" | "valve" | "recess" | "label", THREE.MeshPhysicalMaterialParameters>;
  labelColors: { background: string; ink: string };
};

function roundedRectangle<T extends THREE.Path>(path: T, left: number, bottom: number, width: number, height: number, radius: number): T {
  const right = left + width, top = bottom + height;
  path.moveTo(left + radius, bottom);
  path.lineTo(right - radius, bottom);
  path.quadraticCurveTo(right, bottom, right, bottom + radius);
  path.lineTo(right, top - radius);
  path.quadraticCurveTo(right, top, right - radius, top);
  path.lineTo(left + radius, top);
  path.quadraticCurveTo(left, top, left, top - radius);
  path.lineTo(left, bottom + radius);
  path.quadraticCurveTo(left, bottom, left + radius, bottom);
  path.closePath();
  return path;
}

/** Bend a perforated metal sheet into a half-cylinder, including its wall thickness. */
function collarPanel(start: number, tallOpening: boolean) {
  const radius = .415, width = radius * 1.60;
  const panel = roundedRectangle(new THREE.Shape(), 0, .63, width, .56, .035);
  const leftMargin = tallOpening ? .12 : .08, rightMargin = tallOpening ? .045 : .12;
  panel.holes.push(roundedRectangle(new THREE.Path(), leftMargin, tallOpening ? .72 : .92, width - leftMargin - rightMargin, tallOpening ? .405 : .19, .047));
  const raw = new THREE.ExtrudeGeometry(panel, { depth: .035, bevelEnabled: true, bevelSize: .009, bevelThickness: .009, bevelSegments: 5, curveSegments: 12, steps: 1 });
  // Straight shape edges need intermediate vertices before cylindrical bending.
  // Subdivide the broad faces along the arc to retain a smooth protective shell.
  const position = raw.getAttribute("position");
  const vertices: number[] = [];
  const vertex = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, level: number) => {
    if (level > 0 && Math.max(Math.abs(a.x - b.x), Math.abs(b.x - c.x), Math.abs(c.x - a.x)) > .045) {
      const ab = a.clone().lerp(b, .5), bc = b.clone().lerp(c, .5), ca = c.clone().lerp(a, .5);
      vertex(a, ab, ca, level - 1); vertex(ab, b, bc, level - 1);
      vertex(ca, bc, c, level - 1); vertex(ab, bc, ca, level - 1);
      return;
    }
    for (const p of [a, b, c]) {
      const theta = start + p.x / radius, r = radius + p.z;
      vertices.push(Math.sin(theta) * r, p.y, Math.cos(theta) * r);
    }
  };
  for (let i = 0; i < position.count; i += 3) vertex(new THREE.Vector3().fromBufferAttribute(position, i), new THREE.Vector3().fromBufferAttribute(position, i + 1), new THREE.Vector3().fromBufferAttribute(position, i + 2), 5);
  raw.dispose();
  const source = new THREE.BufferGeometry();
  source.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  const geometry = mergeVertices(source, 1e-5);
  source.dispose(); geometry.computeVertexNormals();
  return geometry;
}

/** Soft satin-blue cylinder, open protective collar and separate brass valve. */
export function createGoodLuckCylinder(config: GoodLuckCylinderConfig) {
  const group = new THREE.Group();
  group.name = "floating-sculpted-good-luck";
  const blue = new THREE.MeshPhysicalMaterial(config.materials.body);
  const brass = new THREE.MeshPhysicalMaterial(config.materials.valve);
  const dark = new THREE.MeshPhysicalMaterial(config.materials.recess);
  const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) => {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(x, y, z);
    group.add(object);
    return object;
  };
  const profile = [
    [0, -.94], [.48, -.94], [.55, -.91], [.57, -.85], [.57, -.77],
    [.63, -.74], [.65, -.69], [.65, .29], [.64, .39], [.60, .49],
    [.53, .57], [.40, .61], [.19, .62], [0, .62],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  mesh(new THREE.LatheGeometry(profile, 64), blue);
  const seam = mesh(new THREE.TorusGeometry(.632, .018, 8, 64), blue, 0, -.73);
  seam.rotation.x = Math.PI / 2;
  mesh(new THREE.CylinderGeometry(.13, .17, .09, 32), blue, 0, .66);
  mesh(new THREE.CylinderGeometry(.09, .09, .30, 6), brass, -.15, .86);
  mesh(new THREE.CylinderGeometry(.145, .145, .055, 8), brass, -.15, 1.04);
  mesh(new THREE.CylinderGeometry(.108, .108, .045, 6), brass, -.15, .98);
  const outlet = mesh(new THREE.CylinderGeometry(.106, .106, .19, 32, 1, true), brass, -.15, .86, .18);
  outlet.rotation.x = Math.PI / 2;
  const lip = mesh(new THREE.TorusGeometry(.082, .024, 16, 40), brass, -.15, .86, .285);
  lip.name = "brass-outlet-rim";
  const inner = mesh(new THREE.CylinderGeometry(.062, .062, .08, 32, 1, true), brass, -.15, .86, .245);
  inner.rotation.x = Math.PI / 2;
  inner.material = brass.clone(); inner.material.side = THREE.BackSide;
  const bore = mesh(new THREE.CircleGeometry(.062, 32), dark, -.15, .86, .206);
  bore.name = "valve-recess";
  mesh(collarPanel(-1.75, true), blue).name = "open-rear-protective-collar";
  mesh(collarPanel(.15, false), blue).name = "slotted-front-protective-collar";

  const label = document.createElement("canvas");
  label.width = 1024; label.height = 768;
  const context = label.getContext("2d")!;
  context.fillStyle = config.labelColors.background; context.fillRect(0, 0, label.width, label.height);
  context.fillStyle = config.labelColors.ink;
  // Use the actual reference letterforms, counters and sun; no font substitution.
  for (const { outline, holes } of labelContours) {
    context.beginPath();
    for (const path of [outline, ...holes]) {
      const last = path[path.length - 1], first = path[0];
      context.moveTo((last[0] + first[0]) / 2 * label.width, (last[1] + first[1]) / 2 * label.height);
      path.forEach(([x, y], i) => {
        const next = path[(i + 1) % path.length];
        context.quadraticCurveTo(x * label.width, y * label.height, (x + next[0]) / 2 * label.width, (y + next[1]) / 2 * label.height);
      });
      context.closePath();
    }
    context.fill("evenodd");
  }
  const texture = new THREE.CanvasTexture(label);
  texture.colorSpace = THREE.SRGBColorSpace;
  const paper = new THREE.MeshPhysicalMaterial({ ...config.materials.label, map: texture });
  // A cylindrical patch follows the tank instead of floating on a flat plane.
  const labelMesh = mesh(new THREE.CylinderGeometry(.653, .653, .90, 64, 1, true, -1.06, 2.12), paper, 0, -.18);
  labelMesh.name = "curved-good-luck-label";
  return group;
}

/** Inflated white silhouette with raised ink following the same soft surface. */
export function createEatSculpture(inflation = .12) {
  const group = new THREE.Group();
  group.name = "floating-sculpted-eat";
  const trace = <T extends THREE.Path>(path: T, points: number[][]): T => {
    const vertices = points.map(([x, y]) => new THREE.Vector2((x - contours.width / 2) / contours.height * 2, (contours.height / 2 - y) / contours.height * 2));
    const start = vertices[vertices.length - 1].clone().lerp(vertices[0], .5);
    path.moveTo(start.x, start.y);
    vertices.forEach((point, i) => {
      const end = point.clone().lerp(vertices[(i + 1) % vertices.length], .5);
      path.quadraticCurveTo(point.x, point.y, end.x, end.y);
    });
    path.closePath();
    return path;
  };
  const makeEdges = (data: { outline: number[][]; holes: number[][][] }[]) => data.flatMap(shape => [shape.outline, ...shape.holes].flatMap(path => path.map(([x, y], i) => {
    const next = path[(i + 1) % path.length];
    return [new THREE.Vector2((x - contours.width / 2) / contours.height * 2, (contours.height / 2 - y) / contours.height * 2), new THREE.Vector2((next[0] - contours.width / 2) / contours.height * 2, (contours.height / 2 - next[1]) / contours.height * 2)];
  })));
  const distanceToEdge = (point: THREE.Vector3, edges: THREE.Vector2[][]) => {
    let distance = Infinity;
    for (const [a, b] of edges) {
      const dx = b.x - a.x, dy = b.y - a.y;
      const t = THREE.MathUtils.clamp(((point.x - a.x) * dx + (point.y - a.y) * dy) / Math.max(dx * dx + dy * dy, 1e-10), 0, 1);
      distance = Math.min(distance, Math.hypot(point.x - a.x - dx * t, point.y - a.y - dy * t));
    }
    return distance;
  };
  const bodyEdges = makeEdges(contours.body);
  const bodyHeights = new Map<string, number>();
  const balloonLift = (point: THREE.Vector3) => {
    const key = `${Math.round(point.x * 1e6)},${Math.round(point.y * 1e6)}`;
    const cached = bodyHeights.get(key);
    if (cached !== undefined) return cached;
    const distance = distanceToEdge(point, bodyEdges);
    // A broad, soft dome gives each silhouette lobe a cushion-like volume.
    const height = inflation * (1 - Math.exp(-distance / .16));
    bodyHeights.set(key, height);
    return height;
  };
  const build = (data: { outline: number[][]; holes: number[][][] }[], depth: number, bevel: number, dome: number, material: THREE.Material, z: number) => {
    const shapes = data.map(({ outline, holes }) => {
      const shape = trace(new THREE.Shape(), outline);
      shape.holes = holes.map(hole => trace(new THREE.Path(), hole));
      return shape;
    });
    const raw = new THREE.ExtrudeGeometry(shapes, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 12, curveSegments: 8, steps: 1 });
    const body = data === contours.body;
    const edges = dome > 0 ? makeEdges(data) : [];
    const heights = new Map<string, number>();
    const puff = (point: THREE.Vector3) => {
      const key = `${Math.round(point.x * 1e6)},${Math.round(point.y * 1e6)}`;
      const cached = heights.get(key);
      if (cached !== undefined) return cached;
      const distance = dome > 0 ? distanceToEdge(point, edges) : 0;
      const height = point.z + dome * (1 - Math.exp(-distance / .065));
      heights.set(key, height);
      return height;
    };
    const vertices: number[] = [];
    const triangle = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, level: number) => {
      const cap = depth + bevel;
      const front = Math.abs(a.z - cap) < 1e-6 && Math.abs(b.z - cap) < 1e-6 && Math.abs(c.z - cap) < 1e-6;
      const back = body && Math.abs(a.z + bevel) < 1e-6 && Math.abs(b.z + bevel) < 1e-6 && Math.abs(c.z + bevel) < 1e-6;
      // Every cap triangle uses the same subdivision count, so shared edges
      // stay watertight when the face is inflated.
      if ((front || back) && level > 0) {
        const ab = a.clone().lerp(b, .5), bc = b.clone().lerp(c, .5), ca = c.clone().lerp(a, .5);
        triangle(a, ab, ca, level - 1); triangle(ab, b, bc, level - 1);
        triangle(ca, bc, c, level - 1); triangle(ab, bc, ca, level - 1);
        return;
      }
      for (const point of [a, b, c]) {
        const face = front ? puff(point) : point.z;
        // Conform every ink vertex to the inflated white surface. Both sides of
        // the white body inflate symmetrically so it stays soft as it tumbles.
        const lift = body ? balloonLift(point) * THREE.MathUtils.clamp((point.z - depth / 2) / (depth / 2 + bevel), -1, 1) : balloonLift(point);
        vertices.push(point.x, point.y, face + lift);
      }
    };
    const positions = raw.getAttribute("position");
    for (let i = 0; i < positions.count; i += 3) triangle(new THREE.Vector3().fromBufferAttribute(positions, i), new THREE.Vector3().fromBufferAttribute(positions, i + 1), new THREE.Vector3().fromBufferAttribute(positions, i + 2), body ? 4 : 2);
    const surface = new THREE.BufferGeometry();
    surface.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    const geometry = mergeVertices(surface, 1e-5);
    surface.dispose();
    raw.dispose(); geometry.computeVertexNormals();
    const object = new THREE.Mesh(geometry, material);
    object.position.z = z;
    group.add(object);
  };
  build(contours.body, .10, .09, 0, new THREE.MeshPhysicalMaterial({ color: "#f2efe8", roughness: .27, envMapIntensity: .6, clearcoat: .85, clearcoatRoughness: .16 }), -.05);
  build(contours.ink, .014, .018, .004, new THREE.MeshPhysicalMaterial({ color: "#10110f", roughness: .28, envMapIntensity: .3, clearcoat: .8, clearcoatRoughness: .18 }), .156);
  return group;
}
