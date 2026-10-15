import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import contours from "./eat-sculpture-contours.json";

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
