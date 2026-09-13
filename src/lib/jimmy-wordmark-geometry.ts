import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import contours from "./jimmy-wordmark-contours.json";

/** Smooth closed curves preserve the reference's handwriting and counters. */
export function createJimmyWordmarkGeometry() {
  const [left, top, right, bottom] = contours.bounds;
  const unit = 3.1 / (right - left);
  const trace = <T extends THREE.Path>(target: T, points: number[][]): T => {
    const vertices = points.map(([x, y]) => new THREE.Vector2(
      (x - (left + right) / 2) * unit, ((top + bottom) / 2 - y) * unit));
    const start = vertices[vertices.length - 1].clone().lerp(vertices[0], .5);
    target.moveTo(start.x, start.y);
    // Midpoint quadratic splines round tracing noise without overshooting strokes.
    vertices.forEach((point, index) => {
      const end = point.clone().lerp(vertices[(index + 1) % vertices.length], .5);
      target.quadraticCurveTo(point.x, point.y, end.x, end.y);
    });
    target.closePath();
    return target;
  };
  const shapes = contours.shapes.map(({ outline, holes }) => {
    const shape = trace(new THREE.Shape(), outline);
    shape.holes = holes.map(points => trace(new THREE.Path(), points));
    return shape;
  });
  const raw = new THREE.ExtrudeGeometry(shapes, {
    depth: .11, steps: 1, bevelEnabled: true,
    bevelThickness: .028, bevelSize: .016, bevelSegments: 8, curveSegments: 3,
  });
  // ExtrudeGeometry splits each wall triangle. Weld the shared surface before
  // recomputing normals so polished reflections flow continuously around the rim.
  raw.deleteAttribute("normal");
  raw.deleteAttribute("uv");
  const geometry = mergeVertices(raw, 1e-5);
  raw.dispose();
  geometry.computeVertexNormals();
  geometry.normalizeNormals();
  geometry.center();
  geometry.computeBoundingBox();
  return geometry;
}
