import * as THREE from "three";
import { MarchingCubes } from "three/addons/objects/MarchingCubes.js";
import { home3DConfig } from "./home-3d-config";

/** Rounded metal planet with shallow dents and a gently uneven, solid orbit ring. */
export function createChromePlanet() {
  const group = new THREE.Group();
  group.name = "floating-metal-saturn";
  const config = home3DConfig.celestial.planet;
  const geometry = new THREE.SphereGeometry(.76, 64, 40);
  const positions = geometry.getAttribute("position");
  const dents = [[.3, .6, .7], [-.6, .1, .8], [.65, -.35, .6], [-.2, -.7, .7], [.45, .7, -.4]].map(p => new THREE.Vector3(...p).normalize());
  const vertex = new THREE.Vector3();
  for (let i = 0; i < positions.count; i++) {
    vertex.fromBufferAttribute(positions, i).normalize();
    const dent = dents.reduce((sum, direction) => sum + .018 * Math.exp(-vertex.distanceToSquared(direction) / .003), 0);
    const radius = .76 - dent + .009 * Math.sin(vertex.x * 9 + vertex.y * 5) * Math.sin(vertex.z * 7);
    positions.setXYZ(i, vertex.x * radius, vertex.y * radius * 1.04, vertex.z * radius * .91);
  }
  geometry.computeVertexNormals();
  group.add(new THREE.Mesh(geometry, new THREE.MeshPhysicalMaterial(config.material)));
  const points = Array.from({ length: 96 }, (_, i) => {
    const angle = i / 96 * Math.PI * 2;
    const radius = 1.12 + .024 * Math.sin(angle * 7) + .014 * Math.cos(angle * 11);
    return new THREE.Vector3(radius * Math.cos(angle), .28 * Math.sin(angle) + .015 * Math.sin(angle * 5), .75 * Math.sin(angle));
  });
  const ring = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, true), 192, .085, 12, true), new THREE.MeshPhysicalMaterial(config.ringMaterial));
  group.add(ring);
  group.rotation.z = -.16;
  return group;
}

/** A single smooth cloud surface, with four solid teardrops travelling with it. */
export function createChromeRainCloud() {
  const group = new THREE.Group();
  group.name = "floating-chrome-rain-cloud";
  const material = new THREE.MeshPhysicalMaterial(home3DConfig.celestial.cloud.material);
  const resolution = 48;
  const surface = new MarchingCubes(resolution, material, false, false, 20000);
  surface.isolation = 0;
  const lobes = [
    [-.53, -.12, .32], [-.22, -.08, .35], [.12, -.08, .37], [.49, -.12, .33],
    [-.28, .16, .32], [.13, .26, .37], [.39, .12, .3],
  ];
  for (let z = 0; z < resolution; z++) for (let y = 0; y < resolution; y++) for (let x = 0; x < resolution; x++) {
    const px = x / resolution * 2 - 1, py = y / resolution * 2 - 1, pz = (z / resolution * 2 - 1) / .62;
    let distance = 10;
    for (const [cx, cy, radius] of lobes) {
      const next = Math.hypot(px - cx, py - cy, pz) - radius;
      const blend = Math.max(.13 - Math.abs(distance - next), 0) / .13;
      distance = Math.min(distance, next) - blend * blend * .13 * .25;
    }
    surface.field[x + y * resolution + z * resolution * resolution] = -distance;
  }
  surface.update();
  // Retain only the generated triangles, not the reusable marching-cubes buffers.
  const geometry = new THREE.BufferGeometry();
  for (const attribute of ["position", "normal"]) {
    const source = surface.geometry.getAttribute(attribute);
    geometry.setAttribute(attribute, new THREE.Float32BufferAttribute(source.array.slice(0, surface.geometry.drawRange.count * 3), 3));
  }
  surface.geometry.dispose();
  group.add(new THREE.Mesh(geometry, material));
  const profile = Array.from({ length: 25 }, (_, i) => {
    const t = i / 24;
    return new THREE.Vector2(.105 * Math.sin(Math.PI * t) * (1.2 - .7 * t), -.13 + .3 * t);
  });
  const dropGeometry = new THREE.LatheGeometry(profile, 24);
  for (const [x, y, scale] of [[-.51, -.65, .85], [-.2, -.83, .92], [.26, -.65, .9], [.58, -.86, .84]]) {
    const drop = new THREE.Mesh(dropGeometry, material);
    drop.position.set(x, y, .025);
    drop.scale.setScalar(scale);
    group.add(drop);
  }
  return group;
}
