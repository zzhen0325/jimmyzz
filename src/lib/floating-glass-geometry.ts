import * as THREE from "three";
import type { GlassShapeKind, GlassFinishConfig } from "./floating-glass";

function roundedPolygon(vertices: THREE.Vector2[], rounding: number) {
  const shape = new THREE.Shape();
  vertices.forEach((vertex, index) => {
    const previous = vertices[(index + vertices.length - 1) % vertices.length];
    const next = vertices[(index + 1) % vertices.length];
    const entry = vertex.clone().lerp(previous, rounding);
    const exit = vertex.clone().lerp(next, rounding);
    if (index === 0) shape.moveTo(entry.x, entry.y); else shape.lineTo(entry.x, entry.y);
    shape.quadraticCurveTo(vertex.x, vertex.y, exit.x, exit.y);
  });
  shape.closePath();
  return shape;
}

function outlineShape(kind: GlassShapeKind) {
  const shape = new THREE.Shape();
  if (kind === "square") {
    return roundedPolygon([
      new THREE.Vector2(-.5, -.5), new THREE.Vector2(.5, -.5),
      new THREE.Vector2(.5, .5), new THREE.Vector2(-.5, .5),
    ], .09);
  }
  if (kind === "triangle" || kind === "hexagon") {
    const count = kind === "triangle" ? 3 : 6;
    return roundedPolygon(Array.from({ length: count }, (_, index) => {
      const angle = Math.PI / 2 + index / count * Math.PI * 2;
      return new THREE.Vector2(Math.cos(angle) * .56, Math.sin(angle) * .56);
    }), kind === "triangle" ? .085 : .11);
  }
  if (kind === "circle") {
    shape.absarc(0, 0, .5, 0, Math.PI * 2, false);
  } else if (kind === "rosette") {
    // Seven softly rounded lobes, including the upward point in the reference.
    for (let index = 0; index <= 224; index++) {
      const angle = Math.PI / 2 + index / 224 * Math.PI * 2;
      const radius = .445 + .055 * Math.cos(7 * (angle - Math.PI / 2));
      const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
      if (index === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
    }
  } else {
    // Two joined capsules with a small, smooth inward pinch at their waist.
    shape.moveTo(-.25, .46);
    shape.lineTo(.25, .46);
    shape.bezierCurveTo(.51, .46, .58, .16, .415, .035);
    shape.bezierCurveTo(.385, .012, .385, -.012, .415, -.035);
    shape.bezierCurveTo(.58, -.16, .51, -.46, .25, -.46);
    shape.lineTo(-.25, -.46);
    shape.bezierCurveTo(-.51, -.46, -.58, -.16, -.415, -.035);
    shape.bezierCurveTo(-.385, -.012, -.385, .012, -.415, .035);
    shape.bezierCurveTo(-.58, .16, -.51, .46, -.25, .46);
  }
  shape.closePath();
  return shape;
}

function createGlassGeometry(outline: THREE.Vector2[], finish: GlassFinishConfig) {
  const count = outline.length;
  const positions: number[] = [], edges: number[] = [], indices: number[] = [];
  const halfDepth = finish.depth / 2;
  const faceScale = 1 - finish.bevel;
  const rings: { scale: number; z: number }[] = [];
  const faceSteps = 6, bevelSteps = 12;
  // Subdivided, gently convex faces bend the view through the glass even
  // head-on. Both faces meet a continuous round rim with no extrusion seam.
  for (let step = 1; step <= faceSteps; step++) {
    const radius = step / faceSteps;
    rings.push({ scale: radius * faceScale, z: halfDepth + finish.dome * (1 - radius * radius) ** 2 });
  }
  for (let step = 1; step <= bevelSteps; step++) {
    const angle = step / bevelSteps * Math.PI;
    rings.push({ scale: faceScale + finish.bevel * Math.sin(angle), z: halfDepth * Math.cos(angle) });
  }
  for (let step = faceSteps - 1; step >= 1; step--) {
    const radius = step / faceSteps;
    rings.push({ scale: radius * faceScale, z: -halfDepth - finish.dome * (1 - radius * radius) ** 2 });
  }
  positions.push(0, 0, halfDepth + finish.dome); edges.push(0);
  rings.forEach(({ scale, z }) => outline.forEach(point => {
    positions.push(point.x * scale, point.y * scale, z); edges.push(scale);
  }));
  for (let index = 0; index < count; index++) {
    const next = (index + 1) % count;
    indices.push(0, 1 + index, 1 + next);
    for (let ring = 0; ring < rings.length - 1; ring++) {
      const inner = 1 + ring * count, outer = inner + count;
      indices.push(inner + index, outer + index, outer + next, inner + index, outer + next, inner + next);
    }
  }
  const backCenter = positions.length / 3;
  positions.push(0, 0, -halfDepth - finish.dome); edges.push(0);
  const lastRing = 1 + (rings.length - 1) * count;
  for (let index = 0; index < count; index++) indices.push(lastRing + index, backCenter, lastRing + (index + 1) % count);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("glassEdge", new THREE.Float32BufferAttribute(edges, 1));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox!;
  const uvs: number[] = [];
  for (let index = 0; index < positions.length; index += 3) {
    uvs.push((positions[index] - bounds.min.x) / (bounds.max.x - bounds.min.x),
      (positions[index + 1] - bounds.min.y) / (bounds.max.y - bounds.min.y));
  }
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeBoundingSphere();
  return geometry;
}

/** White center → black perimeter. Bake distance to the actual curved outline
 * once, so concave shapes have the same smooth edge profile as circles. */
function createHeightMap(outline: THREE.Vector2[]) {
  const resolution = 256;
  const bounds = new THREE.Box2().setFromPoints(outline);
  const size = bounds.getSize(new THREE.Vector2());
  const pixels = new Uint16Array(resolution * resolution);
  for (let y = 0; y < resolution; y++) for (let x = 0; x < resolution; x++) {
    const px = bounds.min.x + x / (resolution - 1) * size.x;
    const py = bounds.min.y + y / (resolution - 1) * size.y;
    let inside = false, distanceSq = Infinity;
    for (let index = 0; index < outline.length; index++) {
      const a = outline[index], b = outline[(index + 1) % outline.length];
      if ((a.y > py) !== (b.y > py) && px < (b.x - a.x) * (py - a.y) / (b.y - a.y) + a.x) inside = !inside;
      const dx = b.x - a.x, dy = b.y - a.y;
      const t = THREE.MathUtils.clamp(((px - a.x) * dx + (py - a.y) * dy) / Math.max(dx * dx + dy * dy, 1e-10), 0, 1);
      distanceSq = Math.min(distanceSq, (px - a.x - t * dx) ** 2 + (py - a.y - t * dy) ** 2);
    }
    const height = inside ? THREE.MathUtils.smoothstep(Math.sqrt(distanceSq), 0, .22) : 0;
    pixels[y * resolution + x] = THREE.DataUtils.toHalfFloat(height);
  }
  const texture = new THREE.DataTexture(pixels, resolution, resolution, THREE.RedFormat, THREE.HalfFloatType);
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

export function prepareGlassGeometry(kind: GlassShapeKind, finish: GlassFinishConfig) {
  const outline = outlineShape(kind).getSpacedPoints(112).slice(0, -1);
  if (THREE.ShapeUtils.isClockWise(outline)) outline.reverse();
  return { geometry: createGlassGeometry(outline, finish), heightMap: createHeightMap(outline) };
}
