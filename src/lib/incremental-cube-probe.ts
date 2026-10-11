import * as THREE from "three";

/** Spread a live reflection capture over six frames instead of stalling one.
 * The physical material keeps its previous PMREM until all faces are ready.
 */
export function createIncrementalCubeProbe(camera: THREE.CubeCamera) {
  let face = 0;
  return (renderer: THREE.WebGLRenderer, scene: THREE.Scene, immediate: boolean) => {
    if (immediate) {
      camera.update(renderer, scene);
      face = 0;
      return true;
    }

    // Hold the probe origin steady for the complete cube, even as the logo moves.
    if (face === 0) camera.updateMatrixWorld();
    const target = camera.renderTarget;
    const previousTarget = renderer.getRenderTarget();
    const previousFace = renderer.getActiveCubeFace();
    const previousMip = renderer.getActiveMipmapLevel();
    const xrEnabled = renderer.xr.enabled;
    const mipmaps = target.texture.generateMipmaps;
    try {
      renderer.xr.enabled = false;
      target.texture.generateMipmaps = face === 5 && mipmaps;
      renderer.setRenderTarget(target, face, camera.activeMipmapLevel);
      renderer.render(scene, camera.children[face] as THREE.PerspectiveCamera);
    } finally {
      renderer.setRenderTarget(previousTarget, previousFace, previousMip);
      renderer.xr.enabled = xrEnabled;
      target.texture.generateMipmaps = mipmaps;
    }
    face = (face + 1) % 6;
    if (face === 0) target.texture.needsPMREMUpdate = true;
    return face === 0;
  };
}

/** Keep capture work incremental, but blend completed, filtered maps every frame.
 * Both PMREMs have identical dimensions so the material's cube-UV lookup works
 * for either map. Never sample the cube while its faces are being written.
 */
export function createSmoothCubeProbe(camera: THREE.CubeCamera, material: THREE.MeshPhysicalMaterial) {
  const capture = createIncrementalCubeProbe(camera);
  let generator: THREE.PMREMGenerator | undefined;
  let current: THREE.WebGLRenderTarget | undefined;
  let previous: THREE.WebGLRenderTarget | undefined;
  const previousMap = { value: null as THREE.Texture | null };
  const blend = { value: 1 };
  material.onBeforeCompile = shader => {
    shader.uniforms.previousReflectionMap = previousMap;
    shader.uniforms.reflectionBlend = blend;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <envmap_physical_pars_fragment>",
      `
      #ifdef ENVMAP_TYPE_CUBE_UV
      uniform sampler2D previousReflectionMap;
      uniform float reflectionBlend;
      // Integrate the reflection across the pixel footprint. Geometry MSAA
      // cannot smooth high-contrast lines inside a mirrored surface.
      vec4 filteredReflection(sampler2D reflectionMap, vec3 direction, float roughness, vec3 dx, vec3 dy) {
        return 0.25 * (
          textureCubeUV(reflectionMap, normalize(direction - dx - dy), roughness) +
          textureCubeUV(reflectionMap, normalize(direction + dx - dy), roughness) +
          textureCubeUV(reflectionMap, normalize(direction - dx + dy), roughness) +
          textureCubeUV(reflectionMap, normalize(direction + dx + dy), roughness)
        );
      }
      vec4 smoothReflection(vec3 direction, float roughness) {
        vec3 dx = dFdx(direction) * 0.25;
        vec3 dy = dFdy(direction) * 0.25;
        return mix(
          filteredReflection(previousReflectionMap, direction, roughness, dx, dy),
          filteredReflection(envMap, direction, roughness, dx, dy),
          reflectionBlend
        );
      }
      #endif
      ${THREE.ShaderChunk.envmap_physical_pars_fragment.replaceAll("textureCubeUV( envMap,", "smoothReflection(")}`,
    );
  };
  material.customProgramCacheKey = () => "smooth-cube-probe-v2-aa";
  return {
    update(renderer: THREE.WebGLRenderer, scene: THREE.Scene, immediate: boolean) {
      // One face per display frame also advances the previous transition by 1/6.
      // It reaches the current map exactly before the next completed map arrives.
      blend.value = Math.min(1, blend.value + 1 / 6);
      if (!capture(renderer, scene, immediate)) return false;
      generator ??= new THREE.PMREMGenerator(renderer);
      const next = generator.fromCubemap(camera.renderTarget.texture, previous);
      previous = current;
      current = next;
      previousMap.value = previous?.texture ?? current.texture;
      blend.value = immediate || !previous ? 1 : 0;
      const firstMap = material.envMap?.mapping !== current.texture.mapping;
      material.envMap = current.texture;
      if (firstMap) material.needsUpdate = true;
      return true;
    },
    dispose() {
      current?.dispose();
      previous?.dispose();
      generator?.dispose();
    },
  };
}
