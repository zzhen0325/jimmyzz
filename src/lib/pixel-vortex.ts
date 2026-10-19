import * as THREE from "three";

/** Broad pixel spiral streams, projected onto a fixed tilted disk. */
export function createPixelVortex(geometry: THREE.BufferGeometry, settings: { pixels: number; speed: number; arms: number }) {
  // Reference palette: fresh green, lime, bright yellow, and white accents.
  const green = new THREE.Color("#6FD643");
  const yellow = new THREE.Color("#FBFF77");
  const lime = new THREE.Color("#C1EE63");
  const material = new THREE.ShaderMaterial({
    uniforms: {
      formation: { value: 1 }, time: { value: 0 }, pixels: { value: settings.pixels },
      speed: { value: settings.speed }, arms: { value: settings.arms },
      green: { value: green },
      lime: { value: lime },
      yellow: { value: yellow },
      highlight: { value: new THREE.Color("#FFFFFF") },
    },
    vertexShader: `varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `varying vec2 vUv;
      uniform float time, pixels, speed, arms, formation;
      uniform vec3 green, lime, yellow, highlight;
      const float TAU = 6.2831853;
      float hash(float n) { return fract(sin(n * 127.1) * 43758.5453); }
      float noise(vec2 p) {
        vec2 cell = floor(p), f = fract(p);
        f = f * f * (3. - 2. * f);
        float n = dot(cell, vec2(127.1, 311.7));
        return mix(mix(hash(n), hash(n + 127.1), f.x),
          mix(hash(n + 311.7), hash(n + 438.8), f.x), f.y);
      }
      void main() {
        vec2 grid = vec2(pixels, pixels / 1.5);
        vec2 p = ((floor(vUv * grid) + .5) / grid - .5) * vec2(2.8, 1.866667);
        vec2 q = mat2(.819, -.574, .574, .819) * p;
        q.y /= mix(1., .38, formation);
        float r = length(q);
        float a = atan(q.y, q.x);
        float t = time * speed;
        // Sample broad patches in spiral coordinates so the color islands
        // stretch along the flow instead of looking like scattered static noise.
        float flowAngle = a + 2.8 * pow(r, .65) - t * .65;
        vec2 flow = vec2(cos(flowAngle), sin(flowAngle)) * r;
        float broad = noise(flow * 2.4 + vec2(3.1, 1.7));
        float patches = noise(flow * 4.2 + vec2(broad * .6));
        float winding = a + 5.4 * pow(r, .55) - t * .65
          + .12 * sin(r * 5. - t * .7) + (broad - .5) * .65;
        float sector = TAU / arms;
        float signedDistance = mod(winding + sector * .5, sector) - sector * .5;
        float distanceToArm = abs(signedDistance);
        // A connected silhouette avoids detached one-pixel tips and flicker.
        float outer = .86 + .23 * (1. - smoothstep(.08, .52, distanceToArm))
          + .025 * sin(a * 2. - t * .65);
        float taper = 1. - smoothstep(.94, 1.32, r);
        // Broad colored streams meet over a filled green interior.
        float armWidth = (1.02 + .38 * (1. - r)) * taper * 2. / arms
          * (.78 + broad * .52);
        vec3 color = green;
        float alpha = 0.;
        if (r < mix(.8, outer, formation)) {
          alpha = 1.;
          float pigment = distanceToArm / max(armWidth, .001)
            + (patches - .5) * .72;
          if (pigment < .74) color = lime;
          if (pigment < .36 + (broad - .5) * .22) color = yellow;
          // Broad green islands and white accents follow the same flow.
          if (pigment < .22 && broad > .62 && patches > .60 && r > .58) color = highlight;
          if (patches < .42 && pigment > .20) color = green;

        }
        // Sparse pixel droplets peel off the rim along a rotating tangent.
        // Use the same plane and pixel grid, keeping the effect to one draw call.
        if (alpha < .5 && formation > .25) {
          for (int i = 0; i < 12; i++) {
            float seed = float(i) + 1.;
            float life = fract(t * (.40 + hash(seed + 9.) * .16) + hash(seed));
            float age = life / .72;
            float angle = seed * 2.399963 + t * .32 + age * .22;
            float radius = .88 + (.35 + hash(seed + 4.) * .12) * age;
            vec2 droplet = vec2(cos(angle), sin(angle)) * radius;
            droplet.y *= mix(1., .38, formation);
            droplet = mat2(.819, .574, -.574, .819) * droplet;
            droplet.y -= .065 * age * age;
            float size = (.028 + hash(seed + 7.) * .022)
              * smoothstep(0., .12, age) * (1. - smoothstep(.48, 1., age));
            vec2 d = abs(p - droplet);
            if (age < 1. && max(d.x, d.y) < size) {
              color = mix(green, yellow, .25 + hash(seed + 2.) * .5);
              alpha = 1.;
            }
          }
        }
        if (alpha < .5) discard;
        // Alpha 2 marks opaque display colors for the final HDR composite.
        gl_FragColor = vec4(color, 2.0);
        #include <colorspace_fragment>
      }`,
    // Draw as the scene's backdrop without occluding any released geometry.
    side: THREE.DoubleSide, depthTest: false, depthWrite: false, toneMapped: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "floating-pixel-vortex";
  mesh.renderOrder = -1000;
  return { mesh, update: (seconds: number, formation = 1) => { material.uniforms.time.value = seconds; material.uniforms.formation.value = formation; } };
}
