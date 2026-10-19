import * as THREE from "three";
import { FullScreenQuad } from "three/addons/postprocessing/Pass.js";

export type HomeGlowSettings = {
  threshold: number; strength: number; starStrength: number; starLength: number;
};

/** Linear HDR highlights, with a soft halo and a four-point diffraction star. */
export function createHomeGlow(renderer: THREE.WebGLRenderer, settings: HomeGlowSettings) {
  const sceneTarget = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
  const makeTarget = () => new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType, depthBuffer: false,
  });
  const highlights = makeTarget(), horizontal = makeTarget(), halo = makeTarget();
  const vertexShader = `varying vec2 vUv;
    void main() { vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;
  const makeMaterial = (fragmentShader: string, uniforms: Record<string, THREE.IUniform>) =>
    new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, depthTest: false, depthWrite: false, toneMapped: false });
  const extract = makeMaterial(`varying vec2 vUv; uniform sampler2D source; uniform float threshold;
    void main() {
      vec4 sampleColor = texture2D(source, vUv);
      // Only the vortex and tinted glass use the opaque display-color marker.
      vec3 color = sampleColor.rgb * (1. - clamp(sampleColor.a - 1., 0., 1.));
      float peak = max(max(color.r, color.g), color.b);
      float weight = smoothstep(threshold, threshold + .65, peak);
      gl_FragColor = vec4(min(color, vec3(8.)) * weight, 1.);
    }`, { source: { value: sceneTarget.texture }, threshold: { value: settings.threshold } });
  const blur = makeMaterial(`varying vec2 vUv; uniform sampler2D source; uniform vec2 stepUv;
    void main() {
      vec3 color = texture2D(source, vUv).rgb * .227027;
      color += texture2D(source, vUv + stepUv * 1.384615).rgb * .316216;
      color += texture2D(source, vUv - stepUv * 1.384615).rgb * .316216;
      color += texture2D(source, vUv + stepUv * 3.230769).rgb * .070270;
      color += texture2D(source, vUv - stepUv * 3.230769).rgb * .070270;
      gl_FragColor = vec4(color, 1.);
    }`, { source: { value: highlights.texture }, stepUv: { value: new THREE.Vector2() } });
  const stars = makeTarget();
  const streak = makeMaterial(`varying vec2 vUv; uniform sampler2D source; uniform vec2 stepUv;
    vec3 sampleHighlight(vec2 uv) {
      if (any(lessThan(uv, vec2(0.))) || any(greaterThan(uv, vec2(1.)))) return vec3(0.);
      return texture2D(source, uv).rgb;
    }
    void main() {
      vec3 color = vec3(0.);
      for (int i = 1; i <= 16; i++) {
        float t = float(i) / 16.;
        vec2 offset = stepUv * t * t;
        float weight = exp(-t * 3.5);
        color += (sampleHighlight(vUv + offset) + sampleHighlight(vUv - offset)
          + sampleHighlight(vUv + vec2(offset.x, -offset.y))
          + sampleHighlight(vUv + vec2(-offset.x, offset.y))) * weight;
      }
      gl_FragColor = vec4(color * .085, 1.);
    }`, { source: { value: highlights.texture }, stepUv: { value: new THREE.Vector2() } });
  const composite = makeMaterial(`varying vec2 vUv;
    uniform sampler2D source; uniform sampler2D halo; uniform sampler2D stars;
    uniform float strength; uniform float starStrength;
    void main() {
      vec4 base = texture2D(source, vUv);
      float displayColor = clamp(base.a - 1., 0., 1.);
      base.a = min(base.a, 1.);
      vec3 glow = texture2D(halo, vUv).rgb * strength + texture2D(stars, vUv).rgb * starStrength;
      float alpha = max(base.a, clamp(max(max(glow.r, glow.g), glow.b), 0., 1.));
      gl_FragColor = vec4((base.rgb + glow) / max(alpha, .00001), alpha);
      #include <tonemapping_fragment>
      // Preserve the two authored palettes; all unmarked scene pixels retain ACES.
      gl_FragColor.rgb = mix(gl_FragColor.rgb, base.rgb / max(base.a, .00001), displayColor);
      #include <colorspace_fragment>
    }`, {
    source: { value: sceneTarget.texture }, halo: { value: halo.texture }, stars: { value: stars.texture },
    strength: { value: settings.strength }, starStrength: { value: settings.starStrength },
  });
  composite.toneMapped = true;
  composite.transparent = true;
  const quad = new FullScreenQuad(extract);
  const draw = (material: THREE.ShaderMaterial, target: THREE.WebGLRenderTarget | null) => {
    quad.material = material;
    renderer.setRenderTarget(target);
    quad.render(renderer);
  };
  return {
    resize(width: number, height: number, pixelRatio: number, samples: number) {
      const w = Math.max(1, Math.floor(width * pixelRatio)), h = Math.max(1, Math.floor(height * pixelRatio));
      const nextSamples = Math.min(samples, renderer.capabilities.maxSamples);
      if (sceneTarget.samples !== nextSamples) { sceneTarget.samples = nextSamples; sceneTarget.dispose(); }
      sceneTarget.setSize(w, h);
      const scale = Math.min(.5, 768 / Math.max(w, h));
      for (const target of [highlights, horizontal, halo, stars]) target.setSize(Math.max(1, Math.round(w * scale)), Math.max(1, Math.round(h * scale)));
      streak.uniforms.stepUv.value.set(settings.starLength / width, settings.starLength / height);
    },
    render(drawScene: () => void, drawBackdrop: () => void) {
      const destination = renderer.getRenderTarget(), autoClear = renderer.autoClear;
      try {
        renderer.setRenderTarget(sceneTarget);
        renderer.autoClear = true;
        drawScene();
        draw(extract, highlights);
        blur.uniforms.source.value = highlights.texture;
        blur.uniforms.stepUv.value.set(2 / highlights.width, 0);
        draw(blur, horizontal);
        blur.uniforms.source.value = horizontal.texture;
        blur.uniforms.stepUv.value.set(0, 2 / highlights.height);
        draw(blur, halo);
        draw(streak, stars);
        renderer.setRenderTarget(destination);
        drawBackdrop();
        renderer.autoClear = false;
        draw(composite, destination);
      } finally {
        renderer.setRenderTarget(destination);
        renderer.autoClear = autoClear;
      }
    },
    snapshot: () => ({ ...settings, width: highlights.width, height: highlights.height }),
    dispose() {
      for (const target of [sceneTarget, highlights, horizontal, halo, stars]) target.dispose();
      for (const material of [extract, blur, streak, composite]) material.dispose();
      quad.dispose();
    },
  };
}
