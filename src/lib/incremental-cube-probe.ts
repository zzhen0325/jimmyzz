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
