import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

/** One closed shell: two inset domed faces joined by a rounded rim and side wall. */
export function createLogoTriangle(vertices: number[][]) {
  const points = vertices.map(([x, y]) => new THREE.Vector2((x - 30) * .05, (y - 15) * .05));
  if (new THREE.Vector2().subVectors(points[1], points[0]).cross(new THREE.Vector2().subVectors(points[2], points[0])) < 0) {
    [points[1], points[2]] = [points[2], points[1]];
  }
  const lengths = points.map((_, i) => points[(i + 1) % 3].distanceTo(points[(i + 2) % 3]));
  const perimeter = lengths.reduce((a, b) => a + b, 0);
  const center = new THREE.Vector2();
  points.forEach((p, i) => center.addScaledVector(p, lengths[i] / perimeter));
  const area2 = new THREE.Vector2().subVectors(points[1], points[0]).cross(new THREE.Vector2().subVectors(points[2], points[0]));
  const inradius = area2 / perimeter;
  const radius = .035;
  const inset = (distance: number) => points.map(p => p.clone().sub(center).multiplyScalar(1 - distance / inradius).add(center));
  const facePoints = inset(radius);
  const divisions = 48;
  const positions: number[] = [];
  const triangle = (a: number[], b: number[], c: number[]) => positions.push(...a, ...b, ...c);
  const faceVertex = (u: number, v: number, front: boolean) => {
    const w = 1 - u - v;
    const dome = .11 * Math.pow(Math.max(0, 27 * u * v * w), .65);
    return [facePoints[0].x * w + facePoints[1].x * u + facePoints[2].x * v,
      facePoints[0].y * w + facePoints[1].y * u + facePoints[2].y * v,
      // Both faces bulge outward equally, meeting their existing rim at the edges.
      front ? .09 + dome : -.075 - dome];
  };
  for (const front of [true, false]) {
    const emit = (a: number[], b: number[], c: number[]) => front ? triangle(a, b, c) : triangle(a, c, b);
    for (let i = 0; i < divisions; i++) for (let j = 0; j < divisions - i; j++) {
      const a = faceVertex(i / divisions, j / divisions, front);
      const b = faceVertex((i + 1) / divisions, j / divisions, front);
      const c = faceVertex(i / divisions, (j + 1) / divisions, front);
      emit(a, b, c);
      if (j < divisions - i - 1) emit(b, faceVertex((i + 1) / divisions, (j + 1) / divisions, front), c);
    }
  }
  const rings: number[][][] = [];
  const ring = (distance: number, z: number) => {
    const corners = inset(distance);
    rings.push(corners.flatMap((p, i) => Array.from({ length: divisions }, (_, j) => {
      const q = p.clone().lerp(corners[(i + 1) % 3], j / divisions);
      return [q.x, q.y, z];
    })));
  };
  for (let i = 0; i <= 10; i++) {
    const angle = i / 10 * Math.PI / 2;
    ring(radius * (1 - Math.sin(angle)), .055 + radius * Math.cos(angle));
  }
  for (let i = 0; i <= 10; i++) {
    const angle = i / 10 * Math.PI / 2;
    ring(radius * (1 - Math.cos(angle)), -.04 - radius * Math.sin(angle));
  }
  for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < divisions * 3; j++) {
    const k = (j + 1) % (divisions * 3);
    triangle(rings[i][j], rings[i + 1][j], rings[i][k]);
    triangle(rings[i][k], rings[i + 1][j], rings[i + 1][k]);
  }
  const raw = new THREE.BufferGeometry();
  raw.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  // Weld the face/rim boundaries before calculating shared, continuous normals.
  const geometry = mergeVertices(raw, 1e-6);
  raw.dispose();
  geometry.computeVertexNormals();
  return geometry;
}
