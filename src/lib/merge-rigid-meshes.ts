import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/** Batch rigid, opaque siblings without changing their triangles or materials.
 * Call only for props whose animation belongs to the outer physics group.
 * Transparent meshes retain their independent depth sorting.
 */
export function mergeRigidMeshes(root: THREE.Object3D) {
  for (const child of [...root.children]) mergeRigidMeshes(child);
  const batches = new Map<string, THREE.Mesh[]>();
  for (const child of root.children) {
    if (!(child instanceof THREE.Mesh) || child instanceof THREE.SkinnedMesh ||
      child instanceof THREE.InstancedMesh || child.children.length || !child.visible ||
      Array.isArray(child.material) || child.material.transparent ||
      (child.material instanceof THREE.MeshPhysicalMaterial && child.material.transmission > 0) ||
      Object.keys(child.geometry.morphAttributes).length ||
      child.geometry.drawRange.start !== 0 || child.geometry.drawRange.count !== Infinity) continue;
    child.updateMatrix();
    // Baking a reflection would reverse winding; leave those meshes alone.
    if (child.matrix.determinant() <= 0) continue;
    const geometry: THREE.BufferGeometry = child.geometry;
    const attributes = Object.entries(geometry.attributes).map(([name, a]) =>
      `${name}:${a.itemSize}:${a.normalized}:${a.array.constructor.name}`).sort().join(";");
    const key = [child.material.uuid, !!child.geometry.index, attributes,
      child.renderOrder, child.layers.mask, child.castShadow, child.receiveShadow, child.frustumCulled].join("|");
    const batch = batches.get(key) ?? [];
    batch.push(child);
    batches.set(key, batch);
  }
  for (const meshes of batches.values()) {
    if (meshes.length < 2) continue;
    const parts = meshes.map(mesh => mesh.geometry.clone().applyMatrix4(mesh.matrix));
    const geometry = mergeGeometries(parts, false);
    parts.forEach(part => part.dispose());
    if (!geometry) continue;
    const first = meshes[0];
    const merged = new THREE.Mesh(geometry, first.material);
    merged.name = `${root.name || "rigid"}-batch-${first.material instanceof THREE.Material ? first.material.name : "material"}`;
    merged.renderOrder = first.renderOrder;
    merged.layers.mask = first.layers.mask;
    merged.castShadow = first.castShadow;
    merged.receiveShadow = first.receiveShadow;
    merged.frustumCulled = first.frustumCulled;
    root.remove(...meshes);
    root.add(merged);
  }
}
