import * as THREE from "three";

export type HomeWeather = "sunny" | "rainy";

/** A single instanced draw, sized in CSS pixels so rain stays fine on Retina. */
export function createHomeRain() {
  const geometry = new THREE.InstancedBufferGeometry();
  const plane = new THREE.PlaneGeometry(1, 1);
  geometry.index = plane.index;
  geometry.attributes = { ...plane.attributes };
  const count = 560;
  const seeds = new Float32Array(count * 4);
  for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
  geometry.setAttribute("seed", new THREE.InstancedBufferAttribute(seeds, 4));
  geometry.instanceCount = count;
  const uniforms = {
    time: { value: 0 },
    opacity: { value: 0 },
    viewport: { value: new THREE.Vector2(1, 1) },
  };
  const material = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthTest: false, depthWrite: false, toneMapped: false,
    vertexShader: `
      attribute vec4 seed;
      uniform float time;
      uniform vec2 viewport;
      varying vec2 rainUv;
      varying float strength;
      void main() {
        rainUv = uv;
        float depth = seed.z;
        float fall = fract(seed.y - time * mix(.38, .85, depth));
        vec2 center = vec2(fract(seed.x - time * .045), fall) * (viewport + 100.) - 50.;
        float length = mix(12., 38., depth);
        vec2 streak = vec2(position.x * mix(.65, 1.35, depth) + position.y * length * .18, position.y * length);
        gl_Position = vec4((center + streak) / viewport * 2. - 1., 0., 1.);
        strength = mix(.16, .55, depth) * mix(.6, 1., seed.w);
      }
    `,
    fragmentShader: `
      uniform float opacity;
      varying vec2 rainUv;
      varying float strength;
      void main() {
        float edge = 1. - abs(rainUv.x * 2. - 1.);
        float tail = sin(rainUv.y * 3.14159265);
        gl_FragColor = vec4(.88, .93, .98, edge * tail * strength * opacity);
      }
    `,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(mesh);
  const camera = new THREE.Camera();
  return {
    update(delta: number, amount: number, width: number, height: number) {
      uniforms.time.value += delta;
      uniforms.opacity.value = amount;
      uniforms.viewport.value.set(width, height);
      geometry.instanceCount = width < 700 ? 240 : count;
    },
    render(renderer: THREE.WebGLRenderer) {
      if (uniforms.opacity.value < .001) return;
      const autoClear = renderer.autoClear;
      renderer.autoClear = false;
      try { renderer.render(scene, camera); } finally { renderer.autoClear = autoClear; }
    },
    dispose() { geometry.dispose(); plane.dispose(); material.dispose(); scene.clear(); },
  };
}
