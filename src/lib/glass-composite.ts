import * as THREE from "three";

export type GlassSceneUniforms = {
  glassBackground: { value: THREE.Texture };
  glassDepth: { value: THREE.DepthTexture };
  glassResolution: { value: THREE.Vector2 };
  glassViewportHeight: { value: number };
};

/** Render the original scene once, then share its color/depth with every lens.
 * The full-resolution capture also supplies the final background, so its
 * geometry is not redrawn for a separate pass per lens.
 */
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
    glassViewportHeight: { value: 1 },
  };
  const screen = new THREE.Scene();
  const screenCamera = new THREE.Camera();
  const geometry = new THREE.PlaneGeometry(2, 2);
  const material = new THREE.ShaderMaterial({
    uniforms: { glassBackground: uniforms.glassBackground },
    depthTest: false, depthWrite: false, premultipliedAlpha: true,
    vertexShader: `varying vec2 vUv;
      void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `uniform sampler2D glassBackground;
      varying vec2 vUv;
      void main() {
        vec4 color = texture2D(glassBackground, vUv);
        gl_FragColor = vec4(color.rgb / max(color.a, 0.0001), color.a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <premultiplied_alpha_fragment>
      }`,
  });
  const quad = new THREE.Mesh(geometry, material);
  quad.frustumCulled = false;
  screen.add(quad);
  return {
    uniforms,
    resize(width: number, height: number, pixelRatio: number) {
      target.setSize(Math.round(width * pixelRatio), Math.round(height * pixelRatio));
      uniforms.glassResolution.value.set(target.width, target.height);
      uniforms.glassViewportHeight.value = height;
    },
    render(scene: THREE.Scene, camera: THREE.Camera) {
      const originalMask = camera.layers.mask;
      const autoClear = renderer.autoClear;
      const destination = renderer.getRenderTarget();
      const background = scene.background;
      try {
        camera.layers.set(0);
        renderer.setRenderTarget(target);
        renderer.autoClear = true;
        renderer.render(scene, camera);
        renderer.setRenderTarget(destination);
        renderer.render(screen, screenCamera);
        camera.layers.set(1);
        renderer.autoClear = false;
        scene.background = null;
        renderer.render(scene, camera);
      } finally {
        camera.layers.mask = originalMask;
        renderer.autoClear = autoClear;
        scene.background = background;
        renderer.setRenderTarget(destination);
      }
    },
    dispose() { target.dispose(); depth.dispose(); geometry.dispose(); material.dispose(); },
  };
}
