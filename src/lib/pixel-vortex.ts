import * as THREE from "three";

/** Broad pixel spiral streams, projected onto a fixed tilted disk. */
export function createPixelVortex(settings: { pixels: number; speed: number; arms: number }) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      formation: { value: 1 }, time: { value: 0 }, pixels: { value: settings.pixels },
      speed: { value: settings.speed }, arms: { value: settings.arms },
      green: { value: new THREE.Color("#74C93B") },
      lime: { value: new THREE.Color("#B8EE52") },
      yellow: { value: new THREE.Color("#FFF476") },
      white: { value: new THREE.Color("#fff0ac") },
    },
    vertexShader: `varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `varying vec2 vUv;
      uniform float time, pixels, speed, arms, formation;
      uniform vec3 green, lime, yellow, white;
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
          // Broad green islands and short cream accents follow the same flow.
          if (pigment < .22 && broad > .62 && patches > .60 && r > .58) color = white;
          if (patches < .42 && pigment > .20) color = green;

        }
        if (alpha < .5) discard;
        gl_FragColor = vec4(color, alpha);
        #include <colorspace_fragment>
      }`,
    side: THREE.DoubleSide, depthWrite: true, toneMapped: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1), material);
  mesh.name = "floating-pixel-vortex";
  return { mesh, update: (seconds: number, formation = 1) => { material.uniforms.time.value = seconds; material.uniforms.formation.value = formation; } };
}
