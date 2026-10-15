import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

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

  const paper = new THREE.MeshPhysicalMaterial(config.materials.label);
  // A cylindrical patch follows the tank instead of floating on a flat plane.
  const labelMesh = mesh(new THREE.CylinderGeometry(.653, .653, .90, 64, 1, true, -1.06, 2.12), paper, 0, -.18);
  labelMesh.name = "curved-good-luck-label";
  return group;
}
