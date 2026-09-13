import * as THREE from "three";

/** A continuous bent light path, with a broad upper image and faint lower image. */
export function createBlackHoleLens(model: THREE.Object3D, color: string) {
  let core: THREE.Object3D | undefined;
  model.traverse(object => { if (object instanceof THREE.Mesh && /center/.test(object.name)) core = object; });
  if (!core) return;
  const bounds = new THREE.Box3().setFromObject(core);
  const center = bounds.getCenter(new THREE.Vector3());
  const radius = bounds.getSize(new THREE.Vector3()).x / 2;
  const geometry = new THREE.BufferGeometry();
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
  const segments = 512, rows = 12;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments * Math.PI * 2;
    const upper = Math.max(0, Math.sin(t));
    for (let j = 0; j <= rows; j++) {
      const v = j / rows;
      const r = radius * (1.05 + v * (.12 + .40 * upper));
      // The sides flare outward and approach the horizontal disk tangentially.
      const x = r * Math.cos(t) * (1.05 + 2.4 * Math.pow(Math.abs(Math.cos(t)), 6));
      const y = r * Math.sin(t) * (Math.sin(t) > 0 ? 1.45 : .83);
      positions.push(x, y, 0);
      uvs.push(i / segments, v);
      if (i < segments && j < rows) {
        const a = i * (rows + 1) + j, b = a + rows + 1;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  }
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  const lens = new THREE.Mesh(geometry, new THREE.ShaderMaterial({
    uniforms: { tint: { value: new THREE.Color(color) } },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `varying vec2 vUv; uniform vec3 tint;
      void main() {
        float upper = step(0., sin(vUv.x * 6.283185));
        float band = exp(-pow((vUv.y - .28) / .24, 2.));
        float fade = smoothstep(0., .08, vUv.y) * (1. - smoothstep(.65, 1., vUv.y));
        gl_FragColor = vec4(mix(tint, vec3(1.), .6), band * fade * mix(.30, 1., upper));
        #include <colorspace_fragment>
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    side: THREE.DoubleSide, toneMapped: false,
  }));
  lens.name = "lensed-photon-ring";
  lens.position.copy(center);
  lens.position.z = bounds.max.z + radius * .03;
  lens.rotation.z = -.18;
  return lens;
}
