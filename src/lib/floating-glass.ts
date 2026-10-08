import * as THREE from "three";
import type { GlassSceneUniforms } from "./glass-composite";

export type GlassShapeKind = "square" | "circle" | "hexagon" | "rosette" | "triangle" | "double-pill";
export type GlassShapeConfig = { name: string; shape: GlassShapeKind; color: string; size: number };
export type GlassFinishConfig = {
  depth: number; bevel: number; dome: number; refraction: number;
  dispersion: number; glow: number;
};

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

function createGlassMaterial(color: string, finish: GlassFinishConfig, heightMap: THREE.DataTexture, scene: GlassSceneUniforms) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      ...scene, glassHeight: { value: heightMap },
      glassEdgeColor: { value: new THREE.Color(color).convertLinearToSRGB() },
      glassRefraction: { value: finish.refraction }, glassDispersion: { value: finish.dispersion },
      glassGlow: { value: finish.glow },
    },
    transparent: true, depthWrite: false,
    vertexShader: `
      attribute float glassEdge;
      varying vec2 vUv;
      varying vec3 vNormal, vTangent, vBitangent;
      varying vec2 vScreenScale;
      varying float vGlassEdge;
      void main() {
        vUv = uv;
        vGlassEdge = glassEdge;
        vNormal = normalize(normalMatrix * normal);
        vTangent = normalize(normalMatrix * vec3(1.0, 0.0, 0.0));
        vBitangent = normalize(normalMatrix * vec3(0.0, 1.0, 0.0));
        vScreenScale = length(modelViewMatrix[0].xyz) * vec2(projectionMatrix[0][0], projectionMatrix[1][1]) * 0.5;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform sampler2D glassBackground, glassDepth, glassHeight;
      uniform vec2 glassResolution;
      uniform vec3 glassEdgeColor;
      uniform float glassViewportHeight, glassRefraction, glassDispersion, glassGlow;
      varying vec2 vUv, vScreenScale;
      varying vec3 vNormal, vTangent, vBitangent;
      varying float vGlassEdge;
      void main() {
        vec2 screenUv = gl_FragCoord.xy / glassResolution;
        // The shared depth keeps lenses behind the logo and the other props.
        if (gl_FragCoord.z > texture2D(glassDepth, screenUv).r + 0.000002) discard;
        float stepSize = 1.0 / 256.0;
        float h = texture2D(glassHeight, vUv).r;
        vec2 slope = vec2(
          texture2D(glassHeight, vUv + vec2(stepSize, 0.0)).r - texture2D(glassHeight, vUv - vec2(stepSize, 0.0)).r,
          texture2D(glassHeight, vUv + vec2(0.0, stepSize)).r - texture2D(glassHeight, vUv - vec2(0.0, stepSize)).r
        ) * 12.0;
        vec3 normal = normalize(vNormal - (vTangent * slope.x + vBitangent * slope.y));
        vec2 offset = normal.xy * vScreenScale * glassRefraction;
        vec2 refractedUv = clamp(screenUv - offset, vec2(0.001), vec2(0.999));
        vec4 background = texture2D(glassBackground, refractedUv);
        background.r = texture2D(glassBackground, clamp(refractedUv - offset * glassDispersion, vec2(0.001), vec2(0.999))).r;
        background.b = texture2D(glassBackground, clamp(refractedUv + offset * glassDispersion, vec2(0.001), vec2(0.999))).b;
        gl_FragColor = vec4(background.rgb / max(background.a, 0.0001), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        // Match the page's CSS backdrop where the scene capture is transparent.
        float sky = clamp(1.0 - (1.0 - refractedUv.y) * glassViewportHeight / 150.0, 0.0, 1.0);
        vec3 backdrop = mix(vec3(0.96863), vec3(0.19216, 0.74510, 1.0), sky);
        vec3 color = mix(backdrop, gl_FragColor.rgb, background.a);
        float fresnel = pow(1.0 - abs(normal.z), 3.0);
        float edge = max(pow(1.0 - h, 1.6), pow(vGlassEdge, 9.0));
        float rim = clamp(edge * 0.8 + fresnel * 0.3, 0.0, 1.0);
        color *= 1.0 - rim * 0.1;
        color = mix(color, glassEdgeColor, rim * glassGlow);
        float highlight = pow(max(0.0, dot(normal, normalize(vec3(-0.45, 0.65, 0.8)))), 22.0);
        color += vec3(highlight * 0.22 + fresnel * 0.13);
        gl_FragColor = vec4(color, 1.0);
      }`,
  });
  material.name = `height-map-glass-${color}`;
  material.userData.heightMap = heightMap;
  return material;
}

/** A thin, closed glass solid with a soft colored inner glow. */
export function createFloatingGlass(setting: GlassShapeConfig, finish: GlassFinishConfig, scene: GlassSceneUniforms) {
  const shape = outlineShape(setting.shape);
  const outline = shape.getSpacedPoints(112).slice(0, -1);
  if (THREE.ShapeUtils.isClockWise(outline)) outline.reverse();
  const group = new THREE.Group();
  group.name = `floating-glass-${setting.name}`;
  group.add(new THREE.Mesh(createGlassGeometry(outline, finish), createGlassMaterial(setting.color, finish, createHeightMap(outline), scene)));
  group.traverse(object => object.layers.set(1));
  return group;
}
