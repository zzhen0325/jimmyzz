import * as THREE from "three";

/** Live, angle-dependent materials for the user-supplied references.
 * Keep these out of matcap baking and plaster mixing so glass and cloth retain
 * their physical response while moving behind the logo.
 */
const finishes: Record<string, THREE.MeshPhysicalMaterialParameters> = {
  // Fluorescent yellow-green resin: softly blurred transmission beneath a crisp coat.
  "study-lime-resin": {
    color: "#eeff91", metalness: 0, roughness: .19,
    transmission: .92, thickness: .65, ior: 1.46,
    attenuationColor: new THREE.Color("#d2ec12"), attenuationDistance: .38,
    clearcoat: .85, clearcoatRoughness: .095,
    iridescence: .12, iridescenceIOR: 1.3, iridescenceThicknessRange: [180, 280],
    envMapIntensity: 1.1,
  },
  "study-liquid-chrome": { color: "#f4f5f7", metalness: 1, roughness: .085, envMapIntensity: 1.3 },
  "study-lemon-peel": { color: "#f6c72a", roughness: .43, clearcoat: .18, normalScale: new THREE.Vector2(.55, .55) },
  "study-cherry-lacquer": { color: "#ec004b", metalness: .15, roughness: .17, clearcoat: 1, clearcoatRoughness: .1 },
  "study-pearl": { color: "#ffffff", metalness: .22, roughness: .26, clearcoat: .55, clearcoatRoughness: .15, iridescence: 1, iridescenceIOR: 1.36, iridescenceThicknessRange: [180, 510], envMapIntensity: 1.05 },
  "study-lemon": { color: "#dde887", metalness: 0, roughness: .57, clearcoat: .06, sheen: .2, sheenColor: new THREE.Color("#f1f1a6"), sheenRoughness: .8 },
  "study-mint": { color: "#6be2a3", metalness: 0, roughness: .23, clearcoat: .65, clearcoatRoughness: .13, transmission: .08, thickness: .25 },
  "study-chrome": { color: "#eff4f5", metalness: 1, roughness: .13, envMapIntensity: 1.15 },
  "study-pink": { color: "#e99bc7", metalness: 0, roughness: .29, clearcoat: .35, clearcoatRoughness: .2, transmission: .09, thickness: .35, attenuationColor: new THREE.Color("#f9b6d7"), attenuationDistance: 2 },
  "study-aqua": { color: "#9dd9ca", metalness: 0, roughness: .32, clearcoat: .22 },
  "study-coral": { color: "#dc7056", metalness: 0, roughness: .24, clearcoat: .85, clearcoatRoughness: .12 },
  "study-cobalt": { color: "#0755b8", metalness: .08, roughness: .2, clearcoat: .75, clearcoatRoughness: .12 },
  "study-cloth": { color: "#83b6d7", metalness: 0, roughness: .92, clearcoat: 0, sheen: .85, sheenColor: new THREE.Color("#bbdef0"), sheenRoughness: .8, normalScale: new THREE.Vector2(.7, .7) },
  "study-orange": { color: "#eea137", metalness: 0, roughness: .34, clearcoat: .3, clearcoatRoughness: .22 },
  "study-blue-ice": { color: "#155bdc", metalness: .02, roughness: .2, clearcoat: .6, transmission: .26, thickness: .45, ior: 1.43, attenuationColor: new THREE.Color("#5284ed"), attenuationDistance: 1.6 },
  "study-glass": { color: "#ffffff", metalness: 0, roughness: .055, transmission: 1, thickness: .55, ior: 1.46, dispersion: .025, attenuationColor: new THREE.Color("#edf5ff"), attenuationDistance: 4, envMapIntensity: 1.15 },
  "study-amber": { color: "#fff5eb", metalness: 0, roughness: .07, transmission: 1, thickness: .75, ior: 1.48, dispersion: .018, attenuationColor: new THREE.Color("#d67b28"), attenuationDistance: .65, envMapIntensity: 1.2 },
};

export function applyReferencePropMaterials(root: THREE.Object3D) {
  const cache = new Map<THREE.Material, THREE.Material>();
  const convert = (source: THREE.Material) => {
    const existing = cache.get(source);
    if (existing) return existing;
    const parameters = finishes[source.name];
    if (!(source instanceof THREE.MeshStandardMaterial) || !parameters) return source;
    const material = new THREE.MeshPhysicalMaterial();
    THREE.MeshStandardMaterial.prototype.copy.call(material, source);
    // Standard.copy replaces defines; restore PHYSICAL for IOR/transmission chunks.
    material.defines = { ...material.defines, PHYSICAL: "" };
    material.setValues({ ...parameters, side: THREE.FrontSide });
    // Original vertex colors carry the lavender / lemon / seafoam patch pattern.
    // The exported textile normal map supplies the fine interlaced weave.
    material.name = source.name;
    cache.set(source, material);
    return material;
  };
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    object.material = Array.isArray(object.material) ? object.material.map(convert) : convert(object.material);
  });
}
