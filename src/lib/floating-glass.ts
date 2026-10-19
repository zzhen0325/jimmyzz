import * as THREE from "three";
import type { GlassSceneUniforms } from "./glass-composite";

export type GlassShapeKind = "square" | "circle" | "hexagon" | "rosette" | "triangle" | "double-pill";
export type GlassShapeConfig = { name: string; shape: GlassShapeKind; color: string; size: number };
export type GlassFinishConfig = {
  depth: number; bevel: number; dome: number; refraction: number;
  dispersion: number; glow: number;
};

function createGlassMaterial(color: string, finish: GlassFinishConfig, heightMap: THREE.DataTexture, scene: GlassSceneUniforms) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      ...scene, glassHeight: { value: heightMap },
      glassEdgeColor: { value: new THREE.Color(color).convertLinearToSRGB() },
      glassRefraction: { value: finish.refraction }, glassDispersion: { value: finish.dispersion },
      glassGlow: { value: finish.glow },
      toneMappingExposure: { value: 1 },
    },
    transparent: true, depthWrite: false, blending: THREE.NoBlending, toneMapped: false,
    vertexShader: `
      attribute float glassEdge;
      varying vec2 vUv;
      varying vec3 vNormal, vTangent, vBitangent;
      varying vec2 vScreenScale;
      varying float vGlassEdge;
      void main() {
        vUv = uv;
        vGlassEdge = glassEdge;
        vNormal = normalize(normalMatrix * normal);
        vTangent = normalize(normalMatrix * vec3(1.0, 0.0, 0.0));
        vBitangent = normalize(normalMatrix * vec3(0.0, 1.0, 0.0));
        vScreenScale = length(modelViewMatrix[0].xyz) * vec2(projectionMatrix[0][0], projectionMatrix[1][1]) * 0.5;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      ${THREE.ShaderChunk.tonemapping_pars_fragment}
      uniform sampler2D glassBackground, glassDepth, glassHeight;
      uniform vec2 glassResolution;
      uniform vec4 glassCapture;
      uniform vec3 glassEdgeColor;
      uniform float glassViewportHeight, glassRefraction, glassDispersion, glassGlow;
      varying vec2 vUv, vScreenScale;
      varying vec3 vNormal, vTangent, vBitangent;
      varying float vGlassEdge;
      vec2 captureUv(vec2 screenUv) {
        vec2 halfPixel = vec2(0.5) / glassCapture.zw;
        return clamp((screenUv * glassResolution - glassCapture.xy) / glassCapture.zw, halfPixel, vec2(1.0) - halfPixel);
      }
      void main() {
        vec2 screenUv = gl_FragCoord.xy / glassResolution;
        // The shared depth keeps lenses behind the logo and the other props.
        if (gl_FragCoord.z > texture2D(glassDepth, captureUv(screenUv)).r + 0.000002) discard;
        float stepSize = 1.0 / 256.0;
        float h = texture2D(glassHeight, vUv).r;
        vec2 slope = vec2(
          texture2D(glassHeight, vUv + vec2(stepSize, 0.0)).r - texture2D(glassHeight, vUv - vec2(stepSize, 0.0)).r,
          texture2D(glassHeight, vUv + vec2(0.0, stepSize)).r - texture2D(glassHeight, vUv - vec2(0.0, stepSize)).r
        ) * 12.0;
        vec3 normal = normalize(vNormal - (vTangent * slope.x + vBitangent * slope.y));
        vec2 offset = normal.xy * vScreenScale * glassRefraction;
        vec2 refractedUv = clamp(screenUv - offset, vec2(0.001), vec2(0.999));
        vec4 background = texture2D(glassBackground, captureUv(refractedUv));
        background.r = texture2D(glassBackground, captureUv(clamp(refractedUv - offset * glassDispersion, vec2(0.001), vec2(0.999)))).r;
        background.b = texture2D(glassBackground, captureUv(clamp(refractedUv + offset * glassDispersion, vec2(0.001), vec2(0.999)))).b;
        float displayColor = clamp(background.a - 1.0, 0.0, 1.0);
        background.a = min(background.a, 1.0);
        vec3 captured = background.rgb / max(background.a, 0.0001);
        captured = mix(ACESFilmicToneMapping(captured), captured, displayColor);
        gl_FragColor = sRGBTransferOETF(vec4(captured, 1.0));
        // Match the page's CSS backdrop where the scene capture is transparent.
        float sky = clamp(1.0 - (1.0 - refractedUv.y) * glassViewportHeight / 150.0, 0.0, 1.0);
        vec3 backdrop = mix(vec3(0.96863), vec3(0.90588, 0.94510, 0.96863), sky);
        vec3 color = mix(backdrop, gl_FragColor.rgb, background.a);
        float fresnel = pow(1.0 - abs(normal.z), 3.0);
        float edge = max(pow(1.0 - h, 1.6), pow(vGlassEdge, 9.0));
        float rim = clamp(edge * 0.8 + fresnel * 0.3, 0.0, 1.0);
        color *= 1.0 - rim * 0.1;
        color = mix(color, glassEdgeColor, 0.12 + rim * glassGlow);
        float highlight = pow(max(0.0, dot(normal, normalize(vec3(-0.45, 0.65, 0.8)))), 22.0);
        color += vec3(highlight * 0.22 + fresnel * 0.13);
        // Store linear display color; the final composite skips a second ACES pass.
        gl_FragColor = vec4(sRGBTransferEOTF(vec4(clamp(color, 0.0, 1.0), 1.0)).rgb, 2.0);
        #include <colorspace_fragment>
      }`,
  });
  material.name = `height-map-glass-${color}`;
  material.onBeforeRender = renderer => {
    material.uniforms.toneMappingExposure.value = renderer.toneMappingExposure;
  };
  material.userData.heightMap = heightMap;
  return material;
}

/** Attach the live refraction shader to prebuilt GLB geometry and height data. */
export function createFloatingGlass(model: THREE.Object3D, setting: GlassShapeConfig, finish: GlassFinishConfig, scene: GlassSceneUniforms) {
  const height = model.userData.glassHeight as { data: Uint16Array; width: number; height: number };
  const heightMap = new THREE.DataTexture(height.data, height.width, height.height, THREE.RedFormat, THREE.HalfFloatType);
  heightMap.minFilter = heightMap.magFilter = THREE.LinearFilter;
  heightMap.needsUpdate = true;
  const material = createGlassMaterial(setting.color, finish, heightMap, scene);
  model.name = `floating-glass-${setting.name}`;
  model.traverse(object => {
    object.layers.set(1);
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.setAttribute("glassEdge", object.geometry.getAttribute("_glassedge"));
    object.material = material;
  });
  delete model.userData.glassHeight;
  return model;
}
