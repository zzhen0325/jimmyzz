import * as THREE from "three";

export type GlassSceneUniforms = {
  glassBackground: { value: THREE.Texture };
  glassDepth: { value: THREE.DepthTexture };
  glassResolution: { value: THREE.Vector2 };
  glassCapture: { value: THREE.Vector4 };
  glassViewportHeight: { value: number };
};

/** Draw the scene directly; only capture the region needed by visible lenses. */
export function createGlassComposite(renderer: THREE.WebGLRenderer) {
  const depth = new THREE.DepthTexture(1, 1, THREE.UnsignedIntType);
  const target = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType, depthTexture: depth,
    minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
    samples: Math.min(4, renderer.capabilities.maxSamples),
  });
  const uniforms: GlassSceneUniforms = {
    glassBackground: { value: target.texture },
    glassDepth: { value: depth },
    glassResolution: { value: new THREE.Vector2(1, 1) },
    // Origin is bottom-left, in the main drawing buffer's physical pixels.
    glassCapture: { value: new THREE.Vector4(0, 0, 1, 1) },
    glassViewportHeight: { value: 1 },
  };
  const lenses: THREE.Mesh[] = [];
  const corner = new THREE.Vector3();
  const crop = new THREE.Matrix4();
  let captureCamera: THREE.Camera | undefined;
  let active = false;

  const prepareCapture = (camera: THREE.Camera) => {
    const { x: width, y: height } = uniforms.glassResolution.value;
    let left = Infinity, bottom = Infinity, right = -Infinity, top = -Infinity;
    for (const mesh of lenses) {
      let visible = true;
      for (let parent: THREE.Object3D | null = mesh; parent; parent = parent.parent) {
        if (!parent.visible) { visible = false; break; }
      }
      if (!visible) continue;
      const geometry = mesh.geometry;
      if (!geometry.boundingBox) geometry.computeBoundingBox();
      const box = geometry.boundingBox;
      if (!box || box.isEmpty()) continue;
      let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
      for (let i = 0; i < 8; i++) {
        corner.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z)
          .applyMatrix4(mesh.matrixWorld).project(camera);
        x0 = Math.min(x0, corner.x); x1 = Math.max(x1, corner.x);
        y0 = Math.min(y0, corner.y); y1 = Math.max(y1, corner.y);
        z0 = Math.min(z0, corner.z); z1 = Math.max(z1, corner.z);
      }
      // Test the glass itself, before adding refraction padding.
      if (x1 <= -1 || x0 >= 1 || y1 <= -1 || y0 >= 1 || z1 < -1 || z0 > 1) continue;
      const material = mesh.material as THREE.ShaderMaterial;
      const refraction = Math.abs(material.uniforms.glassRefraction.value);
      const dispersion = Math.abs(material.uniforms.glassDispersion.value);
      const scale = corner.setFromMatrixColumn(mesh.matrixWorld, 0).length();
      // Match the shader's maximum normal.xy displacement, plus its RGB split.
      const paddingX = scale * Math.abs(camera.projectionMatrix.elements[0]) * .5 * refraction * (1 + dispersion) * width + 2;
      const paddingY = scale * Math.abs(camera.projectionMatrix.elements[5]) * .5 * refraction * (1 + dispersion) * height + 2;
      left = Math.min(left, (x0 + 1) * .5 * width - paddingX);
      right = Math.max(right, (x1 + 1) * .5 * width + paddingX);
      bottom = Math.min(bottom, (y0 + 1) * .5 * height - paddingY);
      top = Math.max(top, (y1 + 1) * .5 * height + paddingY);
    }
    if (!Number.isFinite(left)) return false;
    left = Math.max(0, Math.floor(left)); right = Math.min(width, Math.ceil(right));
    bottom = Math.max(0, Math.floor(bottom)); top = Math.min(height, Math.ceil(top));
    // Grow in tiles and retain capacity until viewport/quality changes. Movement
    // and rotation then update only the camera/UV origin, not GPU allocations.
    const captureWidth = Math.min(width, Math.max(target.width, Math.ceil((right - left) / 64) * 64));
    const captureHeight = Math.min(height, Math.max(target.height, Math.ceil((top - bottom) / 64) * 64));
    target.setSize(captureWidth, captureHeight);
    const x = Math.max(0, Math.min(width - captureWidth, Math.floor((left + right - captureWidth) / 2)));
    const y = Math.max(0, Math.min(height - captureHeight, Math.floor((bottom + top - captureHeight) / 2)));
    uniforms.glassCapture.value.set(x, y, captureWidth, captureHeight);
    captureCamera ??= camera.clone();
    captureCamera.copy(camera, false);
    // Crop x/y only: z stays identical to the main view for depth comparisons.
    crop.set(width / captureWidth, 0, 0, (width - 2 * x - captureWidth) / captureWidth,
      0, height / captureHeight, 0, (height - 2 * y - captureHeight) / captureHeight,
      0, 0, 1, 0, 0, 0, 0, 1);
    captureCamera.projectionMatrix.premultiply(crop);
    captureCamera.projectionMatrixInverse.copy(captureCamera.projectionMatrix).invert();
    captureCamera.layers.set(0);
    return true;
  };

  return {
    uniforms,
    register(object: THREE.Object3D) {
      object.traverse(child => {
        if (child instanceof THREE.Mesh && child.layers.isEnabled(1) && !lenses.includes(child)) lenses.push(child);
      });
    },
    snapshot: () => ({ active, width: target.width, height: target.height, samples: target.samples,
      viewport: uniforms.glassResolution.value.toArray(), region: uniforms.glassCapture.value.toArray() }),
    resize(width: number, height: number, pixelRatio: number, samples = 4) {
      const nextSamples = Math.min(samples, renderer.capabilities.maxSamples);
      if (target.samples !== nextSamples) { target.samples = nextSamples; target.dispose(); }
      uniforms.glassResolution.value.set(Math.max(1, Math.floor(width * pixelRatio)), Math.max(1, Math.floor(height * pixelRatio)));
      uniforms.glassViewportHeight.value = height;
      target.setSize(1, 1);
    },
    render(scene: THREE.Scene, camera: THREE.Camera, backdrop?: THREE.Scene) {
      const originalMask = camera.layers.mask;
      const autoClear = renderer.autoClear;
      const destination = renderer.getRenderTarget();
      const background = scene.background;
      try {
        active = prepareCapture(camera);
        if (active) {
          renderer.setRenderTarget(target);
          renderer.autoClear = true;
          renderer.render(scene, captureCamera!);
        }
        renderer.setRenderTarget(destination);
        renderer.autoClear = true;
        if (backdrop) {
          renderer.render(backdrop, camera);
          renderer.autoClear = false;
        }
        camera.layers.set(0);
        renderer.render(scene, camera);
        if (active) {
          camera.layers.set(1);
          renderer.autoClear = false;
          scene.background = null;
          renderer.render(scene, camera);
        }
      } finally {
        camera.layers.mask = originalMask;
        renderer.autoClear = autoClear;
        scene.background = background;
        renderer.setRenderTarget(destination);
      }
    },
    dispose() { lenses.length = 0; target.dispose(); depth.dispose(); },
  };
}
