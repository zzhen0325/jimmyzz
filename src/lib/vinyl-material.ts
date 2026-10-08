import * as THREE from "three";

type VinylSettings = {
  color: string;
  roughness: number;
  anisotropy: number;
  ior: number;
  envMapIntensity: number;
  grooveCount: number;
  grooveStrength: number;
  labelRoughness: number;
};

// r184's area-light LTC path is isotropic. Integrate the existing anisotropic
// GGX BRDF over each studio rectangle for this material only (3×3 quadrature).
const areaSpecular = /* glsl */`
  vec3 vinylLightNormal = normalize(cross(halfWidth, halfHeight));
  float vinylArea = 4.0 * length(cross(halfWidth, halfHeight));
  for (int ix = 0; ix < 3; ix++) {
    float sx = float(ix - 1) * 0.7745966692;
    float wx = ix == 1 ? 0.4444444444 : 0.2777777778;
    for (int iy = 0; iy < 3; iy++) {
      float sy = float(iy - 1) * 0.7745966692;
      float wy = iy == 1 ? 0.4444444444 : 0.2777777778;
      vec3 offset = lightPos + halfWidth * sx + halfHeight * sy - position;
      float distanceSquared = max(dot(offset, offset), 0.0001);
      vec3 lightDirection = offset * inversesqrt(distanceSquared);
      float projectedArea = max(dot(vinylLightNormal, lightDirection), 0.0)
        * vinylArea * wx * wy / distanceSquared;
      reflectedLight.directSpecular += lightColor * projectedArea
        * max(dot(normal, lightDirection), 0.0)
        * BRDF_GGX(lightDirection, viewDir, normal, material);
    }
  }
`;

/** Replace the artwork's painted highlights with a live, grooved PVC surface.
 * The authored mesh lies in XY, with planar UV = (position.xy + 1) / 2.
 * Its center label and rounded edge have separate, isotropic materials.
 */
export function applyVinylMaterial(root: THREE.Object3D, settings: VinylSettings) {
  const size = 1024;
  const direction = new Uint8Array(size * size * 4);
  const normals = new Uint8Array(size * size * 4);
  const roughness = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const px = (x + .5) / size * 2 - 1;
    const py = (y + .5) / size * 2 - 1;
    const radius = Math.hypot(px, py);
    const dx = px / radius, dy = py / radius;
    const phase = radius * settings.grooveCount * Math.PI * 2;
    const slope = Math.cos(phase) * settings.grooveStrength;
    const nz = 1 / Math.sqrt(1 + slope * slope);
    const offset = (y * size + x) * 4;
    // Anisotropy describes the broad lobe axis, perpendicular to the grooves:
    // radial vectors produce the paired fan-shaped highlights of a record.
    direction.set([Math.round((dx * .5 + .5) * 255), Math.round((dy * .5 + .5) * 255), 255, 255], offset);
    normals.set([
      Math.round((-dx * slope * nz * .5 + .5) * 255),
      Math.round((-dy * slope * nz * .5 + .5) * 255),
      Math.round((nz * .5 + .5) * 255), 255,
    ], offset);
    const grain = Math.round(255 * (.92 + .08 * Math.sin(phase)));
    roughness.set([grain, grain, grain, 255], offset);
  }
  const texture = (data: Uint8Array, name: string) => {
    const map = new THREE.DataTexture(data, size, size);
    map.name = name;
    map.colorSpace = THREE.NoColorSpace;
    map.magFilter = THREE.LinearFilter;
    map.minFilter = THREE.LinearMipmapLinearFilter;
    map.generateMipmaps = true;
    map.needsUpdate = true;
    return map;
  };
  const pvc = new THREE.MeshPhysicalMaterial({
    name: "Black PVC · concentric anisotropy",
    color: settings.color, metalness: 0, roughness: settings.roughness,
    anisotropy: settings.anisotropy, anisotropyMap: texture(direction, "Vinyl radial reflection direction"),
    normalMap: texture(normals, "Vinyl concentric microgrooves"),
    roughnessMap: texture(roughness, "Vinyl groove roughness"),
    ior: settings.ior, envMapIntensity: settings.envMapIntensity,
  });
  pvc.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <lights_physical_pars_fragment>",
      THREE.ShaderChunk.lights_physical_pars_fragment.replace(
        "reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );",
        areaSpecular,
      ),
    );
  };
  pvc.customProgramCacheKey = () => "vinyl-anisotropic-area-v1";
  const edge = new THREE.MeshPhysicalMaterial({
    name: "Black PVC · rounded rim", color: settings.color,
    metalness: 0, roughness: .24, ior: settings.ior,
    envMapIntensity: settings.envMapIntensity,
  });
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    const source = Array.isArray(object.material) ? object.material[0] : object.material;
    const label = new THREE.MeshStandardMaterial({
      name: "Vinyl · original paper label",
      map: source instanceof THREE.MeshStandardMaterial ? source.map : null,
      color: "#ffffff", metalness: 0, roughness: settings.labelRoughness,
    });
    const geometry = object.geometry;
    const position = geometry.getAttribute("position");
    const normal = geometry.getAttribute("normal");
    // The old coarse grooves exaggerated the surface slope. Fine normal-map
    // grooves now supply the relief, with mipmaps to avoid distant shimmering.
    for (let i = 0; i < position.count; i++) {
      const r = Math.hypot(position.getX(i), position.getY(i));
      if (r >= .36 && r <= .986) normal.setXYZ(i, 0, 0, Math.sign(position.getZ(i)));
    }
    normal.needsUpdate = true;
    geometry.computeTangents();
    geometry.clearGroups();
    const index = geometry.index!;
    let groupStart = 0, currentMaterial = -1;
    for (let i = 0; i < index.count; i += 3) {
      let radius = 0;
      for (let j = 0; j < 3; j++) {
        const vertex = index.getX(i + j);
        radius += Math.hypot(position.getX(vertex), position.getY(vertex)) / 3;
      }
      const material = radius < .355 ? 1 : radius > .986 ? 2 : 0;
      if (material !== currentMaterial) {
        if (currentMaterial !== -1) geometry.addGroup(groupStart, i - groupStart, currentMaterial);
        currentMaterial = material;
        groupStart = i;
      }
    }
    geometry.addGroup(groupStart, index.count - groupStart, currentMaterial);
    object.material = [pvc, label, edge];
  });
}
