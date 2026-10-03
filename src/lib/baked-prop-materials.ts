import * as THREE from "three";

/** Cache the fixed studio lighting of small props in normal space.
 * Geometry, normal maps and native-resolution rasterization stay unchanged.
 * The hero logo keeps its live environment reflections.
 */
export function createBakedPropMaterials(renderer: THREE.WebGLRenderer, sourceScene: THREE.Scene) {
  const scene = new THREE.Scene();
  scene.environment = sourceScene.environment;
  scene.environmentIntensity = sourceScene.environmentIntensity;
  sourceScene.traverse(object => {
    if (object instanceof THREE.Light) {
      const light = object.clone();
      light.position.copy(object.position);
      scene.add(light);
    }
  });
  const geometry = new THREE.SphereGeometry(1, 64, 32);
  const sphere = new THREE.Mesh<THREE.BufferGeometry, THREE.Material>(geometry);
  sphere.material.dispose();
  scene.add(sphere);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 10);
  camera.position.z = 4;
  const cache = new Map<THREE.Material, THREE.Material>();
  const captures: { source: THREE.MeshStandardMaterial; target: THREE.WebGLRenderTarget }[] = [];

  const capture = (source: THREE.MeshStandardMaterial, target: THREE.WebGLRenderTarget) => {
    const material = source.clone();
    material.normalMap = null;
    material.bumpMap = null;
    material.side = THREE.FrontSide;
    sphere.material = material;
    const previous = renderer.getRenderTarget();
    const face = renderer.getActiveCubeFace(), mip = renderer.getActiveMipmapLevel();
    try {
      renderer.setRenderTarget(target);
      renderer.render(scene, camera);
    } finally {
      renderer.setRenderTarget(previous, face, mip);
      material.dispose();
    }
  };

  const convert = (source: THREE.Material): THREE.Material => {
    if (!(source instanceof THREE.MeshStandardMaterial)) return source;
    if (cache.has(source)) return cache.get(source)!;
    if (source instanceof THREE.MeshPhysicalMaterial && source.transmission > 0) {
      if (source.thickness !== 0) return source;
      // This model's reservoir has zero thickness. A thin transparent surface
      // avoids a second full-screen HDR scene render for a tiny plastic dome.
      const thin = source.clone();
      thin.transmission = 0;
      thin.transparent = true;
      thin.opacity = .65;
      thin.depthWrite = false;
      thin.side = THREE.FrontSide;
      cache.set(source, thin);
      return thin;
    }
    if (source.metalness >= .5 || source.map || source.transparent || source.emissive.getHex() !== 0
      || source.vertexColors || source.aoMap || source.roughnessMap || source.metalnessMap
      || source.alphaMap || source.displacementMap) return source;
    const target = new THREE.WebGLRenderTarget(256, 256, {
      type: THREE.HalfFloatType, depthBuffer: true,
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
    });
    captures.push({ source, target });
    capture(source, target);
    // Retain linear HDR radiance. The main render applies tone mapping once.
    const baked = new THREE.MeshMatcapMaterial({
      matcap: target.texture, color: 0xffffff, side: source.side,
      normalMap: source.normalMap, normalScale: source.normalScale.clone(),
      normalMapType: source.normalMapType, bumpMap: source.bumpMap,
      bumpScale: source.bumpScale, flatShading: source.flatShading,
    });
    baked.name = source.name;
    cache.set(source, baked);
    return baked;
  };
  return {
    apply(root: THREE.Object3D) {
      root.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        object.material = Array.isArray(object.material) ? object.material.map(convert) : convert(object.material);
      });
    },
    refresh() {
      captures.forEach(({ source, target }) => capture(source, target));
    },
    dispose() {
      geometry.dispose();
      cache.forEach(material => material.dispose());
      captures.forEach(({ target }) => target.dispose());
      captures.length = 0;
      cache.clear();
    },
  };
}
