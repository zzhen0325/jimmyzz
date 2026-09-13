import * as THREE from "three";

/** Camera-facing accretion image. A shared coordinate system prevents seams
 * between the foreground disk, bent rear image and photon rim. */
export function createBlackHoleRing(model: THREE.Object3D, color: string, brightness: number, glowStrength = 1) {
  let core: THREE.Mesh | undefined;
  model.traverse(object => { if (object instanceof THREE.Mesh && /center/.test(object.name)) core = object; });
  if (!core) return;
  const bounds = new THREE.Box3().setFromObject(core);
  const radius = bounds.getSize(new THREE.Vector3()).x / 2;
  const material = new THREE.ShaderMaterial({
    uniforms: {
      tint: { value: new THREE.Color(color) }, brightness: { value: brightness },
      glowStrength: { value: glowStrength },
    },
    vertexShader: `varying vec2 p;
      void main() { p = (uv - .5) * vec2(12., 6.);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `varying vec2 p; uniform vec3 tint;
      uniform float brightness; uniform float glowStrength;
      float gaussian(float x, float width) { return exp(-x*x/(width*width)); }
      // Filter the fine orbital bands at their projected pixel footprint.
      float bands(float r, float a) {
        float phase = r * 36. + 1.6 * sin(a * 3. + r * 2.);
        float detail = 1. - smoothstep(.5, 3., fwidth(phase));
        return .86 + .14 * sin(phase) * detail;
      }
      void main() {
        vec2 q = mat2(.98384, .17903, -.17903, .98384) * p;
        float r = length(q);
        float aa = max(fwidth(r), .006);
        float outside = smoothstep(1. - aa, 1. + aa, r);
        float diskR = length(vec2(q.x, q.y / .19));
        float angle = atan(q.y / .19, q.x);
        float diskEdge = smoothstep(1.35, 1.8, diskR) * (1. - smoothstep(3.8, 5.1, diskR));
        float disk = exp(-max(diskR - 1.8, 0.) * .42) * diskEdge;
        disk *= bands(diskR, angle);
        // The near side crosses the lower shadow; the rear central image bends
        // above it instead of drawing a second unbent ellipse.
        float front = 1. - smoothstep(-.04, .04, q.y);
        disk *= mix(outside * smoothstep(.9, 2.2, abs(q.x)), 1., front);
        float bendR = length(vec2(q.x, q.y / 1.18));
        float upper = smoothstep(-.04, .15, q.y);
        float arc = gaussian(bendR - 1.27, .16) * upper;
        arc *= bands(bendR * 1.6, atan(q.y, q.x));
        arc *= smoothstep(.05, .65, q.y);
        float lower = gaussian(r - 1.055, .026) * (1. - upper) * .46;
        float photon = gaussian(r - 1.035, .019) * .62;
        float asymmetry = clamp(1. - .16 * q.x, .52, 1.5);
        float light = (disk * 1.35 + arc * 1.5 + lower + photon) * asymmetry;
        float halo = gaussian(bendR - 1.28, .32) * upper * .15;
        float diskDistance = abs(q.y) - .19 * sqrt(max(0., 3.1*3.1-q.x*q.x));
        halo += gaussian(diskDistance, .16) * (1. - smoothstep(3.5, 5.2, abs(q.x))) * .10;
        halo *= outside * glowStrength;
        light *= brightness;
        float intensity = light + halo;
        vec3 warm = mix(tint * vec3(1., .65, .32), tint, smoothstep(.08, .8, light));
        vec3 emission = mix(warm, vec3(1., .97, .88), smoothstep(.9, 2.2, light) * .7);
        float alpha = 1. - exp(-intensity * 1.5);
        // Opaque shadow and luminous foreground compose together, so bloom
        // cannot wash out the center or expose the old model's light shells.
        float shadow = 1. - outside;
        gl_FragColor = vec4(emission * alpha / max(alpha + shadow * (1. - alpha), .001),
          alpha + shadow * (1. - alpha));
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, toneMapped: false,
  });
  const ring = new THREE.Mesh(new THREE.PlaneGeometry(radius * 12, radius * 6), material);
  ring.name = "procedural-accretion-ring";
  ring.position.copy(bounds.getCenter(new THREE.Vector3()));
  ring.position.z = bounds.max.z + radius * .04;
  return ring;
}
