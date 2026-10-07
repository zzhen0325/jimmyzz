import * as THREE from "three";

export type FloatingPlasterSettings = {
  color: string;
  grain: number;
  transitionStart: number;
  transitionEnd: number;
};

/** Per-object uniforms keep depth transitions independent even on shared glTF materials.
 * Blend the final linear lighting, retaining texture alpha and the original front material.
 * Only floating roots are registered: the hero logo never receives this shader.
 */
export function createFloatingPlasterMaterials(settings: FloatingPlasterSettings) {
  const materials: THREE.Material[] = [];
  const entries: { root: THREE.Object3D; amount: { value: number }; permanent: boolean }[] = [];
  const position = new THREE.Vector3();
  const cameraPosition = new THREE.Vector3();
  const towardCamera = new THREE.Vector3();
  const color = new THREE.Color(settings.color);

  return {
    apply(root: THREE.Object3D, permanent = false, billboard = false) {
      const amount = { value: permanent ? 1 : 0 };
      const cache = new Map<THREE.Material, THREE.Material>();
      const convert = (source: THREE.Material) => {
        const cached = cache.get(source);
        if (cached) return cached;
        const material = source.clone();
        material.onBeforeCompile = shader => {
          shader.uniforms.uPlasterAmount = amount;
          shader.uniforms.uPlasterColor = { value: color };
          shader.uniforms.uPlasterGrain = { value: settings.grain };
          shader.vertexShader = `varying vec3 vPlasterNormal;
            varying vec3 vPlasterPosition;\n${shader.vertexShader}`.replace(
            "#include <begin_vertex>",
            `#include <begin_vertex>
            vPlasterNormal = normalize(normalMatrix * normal);
            vPlasterPosition = position;`,
          );
          shader.fragmentShader = `uniform float uPlasterAmount;
            uniform vec3 uPlasterColor;
            uniform float uPlasterGrain;
            varying vec3 vPlasterNormal;
            varying vec3 vPlasterPosition;\n${shader.fragmentShader}`.replace(
            "#include <opaque_fragment>",
            `vec3 plasterNormal = normalize(vPlasterNormal) * (gl_FrontFacing ? 1.0 : -1.0);
            float plasterKey = max(dot(plasterNormal, normalize(vec3(-0.45, 0.65, 0.8))), 0.0);
            float plasterFill = max(dot(plasterNormal, normalize(vec3(0.6, -0.2, 0.5))), 0.0);
            float plasterNoise = fract(sin(dot(floor(vPlasterPosition * 180.0), vec3(12.9898, 78.233, 45.164))) * 43758.5453) - 0.5;
            vec3 plasterLight = uPlasterColor * (0.58 + 0.48 * plasterKey + 0.10 * plasterFill + plasterNoise * uPlasterGrain);
            ${billboard ? `// Preserve photographic relief instead of turning cutouts into white silhouettes.
            float relief = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
            plasterLight *= 0.66 + 0.34 * sqrt(max(relief, 0.0));` : ""}
            outgoingLight = mix(outgoingLight, plasterLight, uPlasterAmount);
            #include <opaque_fragment>`,
          );
        };
        material.customProgramCacheKey = () => `floating-plaster-v1-${billboard ? "cutout" : "mesh"}`;
        materials.push(material);
        cache.set(source, material);
        return material;
      };
      root.traverse(object => {
        if (!(object instanceof THREE.Mesh)) return;
        object.material = Array.isArray(object.material) ? object.material.map(convert) : convert(object.material);
      });
      entries.push({ root, amount, permanent });
    },
    update(camera: THREE.Camera, center: THREE.Object3D, depthScale: number) {
      camera.getWorldPosition(cameraPosition);
      center.getWorldPosition(position);
      towardCamera.subVectors(cameraPosition, position).normalize();
      for (const entry of entries) {
        if (entry.permanent) continue;
        entry.root.getWorldPosition(position).sub(center.position);
        // Positive distance is behind the logo plane from the current camera's view.
        const depth = -position.dot(towardCamera) / Math.max(depthScale, .001);
        entry.amount.value = THREE.MathUtils.smoothstep(depth, settings.transitionStart, settings.transitionEnd);
      }
    },
    dispose() {
      materials.forEach(material => material.dispose());
      materials.length = 0;
      entries.length = 0;
    },
  };
}
