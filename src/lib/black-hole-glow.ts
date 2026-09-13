import * as THREE from "three";

// A small object-local light spread replaces Sketchfab's viewer bloom.
// The opaque horizon is masked out, and depth testing keeps nearer objects in front.
export function createBlackHoleGlow(model: THREE.Object3D, color: string, strength: number) {
  let core: THREE.Object3D | undefined;
  model.traverse(object => { if (object instanceof THREE.Mesh && /center/.test(object.name)) core = object; });
  if (!core) return;
  const bounds = new THREE.Box3().setFromObject(core);
  const center = bounds.getCenter(new THREE.Vector3());
  const radius = bounds.getSize(new THREE.Vector3()).x / 2;
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(radius * 14, radius * 5), new THREE.ShaderMaterial({
    uniforms: { radius: { value: radius }, tint: { value: new THREE.Color(color) }, strength: { value: strength } },
    vertexShader: `varying vec2 p;
      void main() { p = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `uniform float radius; uniform vec3 tint; uniform float strength; varying vec2 p;
      void main() {
        vec2 q = mat2(.98384, .17903, -.17903, .98384) * p / radius;
        float r = length(q);
        float bentRadius = q.y > 0. ? length(vec2(q.x / 1.1, q.y / 1.45)) : r;
        float photon = exp(-pow((bentRadius - 1.08) / .28, 2.)) * .55;
        float elliptical = length(vec2(q.x, q.y / .25));
        float disk = exp(-pow((elliptical - 1.7) / .75, 2.)) * .24;
        // Convert elliptical radius to screen-space distance so the glow spreads
        // vertically too, rather than being squeezed into the thin disk plane.
        float gradient = length(vec2(q.x, q.y / .0625)) / max(elliptical, .001);
        float distanceToRing = (elliptical - 3.8) / max(gradient, 1.);
        disk += exp(-pow(distanceToRing / .28, 2.)) * .50;
        disk += exp(-pow(distanceToRing / .75, 2.)) * .17;
        disk *= 1. - smoothstep(0., .5, q.y) * (1. - smoothstep(1., 2.8, abs(q.x)));
        float haze = exp(-pow((r - 1.35) / .7, 2.)) * .06;
        float alpha = (photon + disk + haze) * smoothstep(1., 1.04, r) * strength;
        gl_FragColor = vec4(tint, alpha);
        #include <colorspace_fragment>
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  }));
  glow.name = "black-hole-local-glow";
  glow.position.copy(center);
  glow.position.z = bounds.max.z + radius * .02;
  return glow;
}
