import * as THREE from "three";

export type SkyCloudPalette = {
  skyTop: string;
  skyBottom: string;
  cloudShadow: string;
  cloudHighlight: string;
};
export type SkyCloudSettings = {
  sunny: SkyCloudPalette;
  rainy: SkyCloudPalette;
  complexity: number;
  scale: number;
  coverage: number;
  speed: number;
  initialTime?: number;
};

// drift — "2D Clouds", https://www.shadertoy.com/view/4tdSWr
// Source mirror: https://github.com/Zygo/xscreensaver/blob/master/hacks/glx/glsl/driftclouds.glsl
// Preserve the original noise and motion; match the supplied sky palette.
const fragmentShader = /* glsl */ `
uniform vec3 iResolution;
uniform float iTime;
uniform float skyOpacity;
uniform float rainAmount;
uniform vec3 skycolour1;
uniform vec3 skycolour2;
uniform vec3 cloudshadow;
uniform vec3 cloudhighlight;
uniform vec3 rainySkyTop;
uniform vec3 rainySkyBottom;
uniform vec3 rainyCloudShadow;
uniform vec3 rainyCloudHighlight;
uniform int complexity;
uniform float cloudscale;
uniform float speed;
uniform float cloudcover;

// Title:  2D Clouds
// Author: drift
// URL:    https://www.shadertoy.com/view/4tdSWr
// Date:   12-Nov-2016
// Desc:   Used in 2 different demos:
// http://www.pouet.net/prod.php?which=66590
// and
// http://www.pouet.net/prod.php?which=68483

// 2024-06-25, drift says:
//
// "Just posting here to say that I don't check Shadertoy very often and I
// don't get any notifications of messages here. Anyone and everyone who
// wishes to use this shader I give my permission to use it in any way that
// you choose. Credit would be nice but I won't insist on it."


const float cloudalpha = 8.0;

const mat2 m = mat2( 1.6,  1.2, -1.2,  1.6 );

vec2 hash( vec2 p ) {
	p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3)));
	return -1.0 + 2.0*fract(sin(p)*43758.5453123);
}

float noise( in vec2 p ) {
    const float K1 = 0.366025404; // (sqrt(3)-1)/2;
    const float K2 = 0.211324865; // (3-sqrt(3))/6;
	vec2 i = floor(p + (p.x+p.y)*K1);	
    vec2 a = p - i + (i.x+i.y)*K2;
    vec2 o = (a.x>a.y) ? vec2(1.0,0.0) : vec2(0.0,1.0); //vec2 of = 0.5 + 0.5*vec2(sign(a.x-a.y), sign(a.y-a.x));
    vec2 b = a - o + K2;
	vec2 c = a - 1.0 + 2.0*K2;
    vec3 h = max(0.5-vec3(dot(a,a), dot(b,b), dot(c,c) ), 0.0 );
	vec3 n = h*h*h*h*vec3( dot(a,hash(i+0.0)), dot(b,hash(i+o)), dot(c,hash(i+1.0)));
    return dot(n, vec3(70.0));	
}

float fbm(vec2 n) {
	float total = 0.0, amplitude = 0.1;
	for (int i = 0; i < 7; i++) {
        if (i >= complexity) break;
		total += noise(n) * amplitude;
		n = m * n;
		amplitude *= 0.4;
	}
	return total;
}

// -----------------------------------------------

void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
    vec2 p = fragCoord.xy / iResolution.xy;
	vec2 uv = p*vec2(iResolution.x/iResolution.y,1.0);    
    float time = iTime * speed;
    float q = fbm(uv * cloudscale * 0.5);
    
    //ridged noise shape
	float r = 0.0;
	uv *= cloudscale;
    uv -= q - time;
    float weight = 0.8;
    for (int i=0; i<8; i++){
        if (i >= complexity) break;
		r += abs(weight*noise( uv ));
        uv = m*uv + time;
		weight *= 0.7;
    }
    
    //noise shape
	float f = 0.0;
    uv = p*vec2(iResolution.x/iResolution.y,1.0);
	uv *= cloudscale;
    uv -= q - time;
    weight = 0.7;
    for (int i=0; i<8; i++){
        if (i >= complexity) break;
		f += weight*noise( uv );
        uv = m*uv + time;
		weight *= 0.6;
    }
    
    f *= r + f;
    
    //noise colour
    float c = 0.0;
    time = iTime * speed * 2.0;
    uv = p*vec2(iResolution.x/iResolution.y,1.0);
	uv *= cloudscale*2.0;
    uv -= q - time;
    weight = 0.4;
    for (int i=0; i<7; i++){
        if (i >= complexity) break;
		c += weight*noise( uv );
        uv = m*uv + time;
		weight *= 0.6;
    }
    
    //noise ridge colour
    float c1 = 0.0;
    time = iTime * speed * 3.0;
    uv = p*vec2(iResolution.x/iResolution.y,1.0);
	uv *= cloudscale*3.0;
    uv -= q - time;
    weight = 0.4;
    for (int i=0; i<7; i++){
        if (i >= complexity) break;
		c1 += abs(weight*noise( uv ));
        uv = m*uv + time;
		weight *= 0.6;
    }
	
    c += c1;
    
    vec3 skycolour = mix(skycolour2, skycolour1, p.y);
    skycolour = mix(skycolour, mix(rainySkyBottom, rainySkyTop, p.y), rainAmount);
    // Keep the animated fine shading, with pale blue shadows and neutral whites.
    // Explicit endpoints avoid the original additive sky tint's grey-green cast.
    vec3 cloudcolour = mix(cloudshadow, cloudhighlight, smoothstep(-0.12, 0.55, c));
   
    cloudcolour = mix(cloudcolour, mix(rainyCloudShadow, rainyCloudHighlight, smoothstep(-.12, .65, c)), rainAmount);
    f = cloudcover + rainAmount * .48 + cloudalpha*f*r;
    
    vec3 result = mix(skycolour, cloudcolour, clamp(f + c, 0.0, 1.0));
    
	fragColor = vec4( result, 1.0 );
}

void main() {
  mainImage(gl_FragColor, gl_FragCoord.xy);
  gl_FragColor.a *= skyOpacity;
}
`;

/** drift's Shadertoy 4tdSWr with the supplied reference's sky/cloud colours. */
export function createSkyClouds(settings: SkyCloudSettings, renderScale = .5) {
  // This shader outputs display-space RGB directly; undo Color's sRGB decoding.
  const displayColor = (hex: string) => new THREE.Color(hex).convertLinearToSRGB();
  const group = new THREE.Group();
  group.name = "sky-clouds";
  // Start from a composed cloud formation, then continue the same noise motion.
  const initialTime = Math.max(0, settings.initialTime ?? 0);
  const uniforms = {
    iResolution: { value: new THREE.Vector3(1, 1, 1) },
    iTime: { value: initialTime },
    skyOpacity: { value: 1 },
    rainAmount: { value: 0 },
    skycolour1: { value: displayColor(settings.sunny.skyTop) },
    skycolour2: { value: displayColor(settings.sunny.skyBottom) },
    cloudshadow: { value: displayColor(settings.sunny.cloudShadow) },
    cloudhighlight: { value: displayColor(settings.sunny.cloudHighlight) },
    rainySkyTop: { value: displayColor(settings.rainy.skyTop) },
    rainySkyBottom: { value: displayColor(settings.rainy.skyBottom) },
    rainyCloudShadow: { value: displayColor(settings.rainy.cloudShadow) },
    rainyCloudHighlight: { value: displayColor(settings.rainy.cloudHighlight) },
    complexity: { value: Math.round(THREE.MathUtils.clamp(settings.complexity, 1, 8)) },
    cloudscale: { value: Math.max(.01, settings.scale) },
    cloudcover: { value: THREE.MathUtils.clamp(settings.coverage, 0, 1) },
    speed: { value: Math.max(0, settings.speed) },
  };
  const material = new THREE.ShaderMaterial({
    name: "shadertoy-4tdSWr-drift-2d-clouds",
    uniforms,
    // Store straight display-space RGBA; the presentation pass blends it once.
    transparent: false,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    vertexShader: /* glsl */ `
      void main() {
        gl_Position = vec4(position.xy, 1.0, 1.0);
      }
    `,
    // Shadertoy writes display values directly. Applying Three's colour-space
    // or ACES chunks here would wash out its blue sky and cloud contrast.
    fragmentShader,
  });
  const geometry = new THREE.PlaneGeometry(2, 2);
  const source = new THREE.Scene();
  const sourceCamera = new THREE.Camera();
  const sourceMesh = new THREE.Mesh(geometry, material);
  sourceMesh.frustumCulled = false;
  source.add(sourceMesh);
  const target = new THREE.WebGLRenderTarget(1, 1, {
    depthBuffer: false, stencilBuffer: false,
    minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
  });
  const presentation = new THREE.ShaderMaterial({
    uniforms: { skyTexture: { value: target.texture } },
    transparent: true, depthTest: false, depthWrite: false, toneMapped: false,
    vertexShader: `varying vec2 vUv;
      void main() { vUv = uv; gl_Position = vec4(position.xy, 1.0, 1.0); }`,
    fragmentShader: `uniform sampler2D skyTexture; varying vec2 vUv;
      void main() { gl_FragColor = texture2D(skyTexture, vUv); }`,
  });
  const mesh = new THREE.Mesh(geometry, presentation);
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  const drawingBuffer = new THREE.Vector2();
  group.add(mesh);
  let disposed = false;
  let clock = 0;

  return {
    group,
    ready: Promise.resolve(),
    prepare(renderer: THREE.WebGLRenderer) {
      if (disposed || !group.visible) return;
      renderer.getDrawingBufferSize(drawingBuffer);
      // Clouds are low-frequency shading: quarter the noise evaluations while
      // retaining the original shader, animation rate, and full-size geometry.
      const width = Math.max(1, Math.floor(drawingBuffer.x * renderScale));
      const height = Math.max(1, Math.floor(drawingBuffer.y * renderScale));
      target.setSize(width, height);
      uniforms.iResolution.value.set(width, height, 1);
      const destination = renderer.getRenderTarget();
      const autoClear = renderer.autoClear;
      try {
        renderer.setRenderTarget(target);
        renderer.autoClear = true;
        renderer.render(source, sourceCamera);
      } finally {
        renderer.setRenderTarget(destination);
        renderer.autoClear = autoClear;
      }
    },
    update(_camera: THREE.Camera, _width: number, _height: number, delta: number, progress: number, rainAmount = 0) {
      group.visible = !disposed && progress < 1;
      if (!group.visible) return;
      uniforms.rainAmount.value = rainAmount;
      clock += Math.max(0, delta);
      uniforms.iTime.value = initialTime + clock;
      uniforms.skyOpacity.value = 1 - THREE.MathUtils.clamp(progress, 0, 1);
    },
    snapshot() {
      return {
        time: clock,
        initialTime,
        rainAmount: uniforms.rainAmount.value,
        mode: "shadertoy-4tdSWr",
        complexity: uniforms.complexity.value,
        scale: uniforms.cloudscale.value,
        coverage: uniforms.cloudcover.value,
        speed: uniforms.speed.value,
        resolution: uniforms.iResolution.value.toArray(),
        opacity: uniforms.skyOpacity.value,
        loaded: !disposed,
      };
    },
    dispose() {
      disposed = true;
      material.dispose();
      presentation.dispose();
      target.dispose();
      source.clear();
      geometry.dispose();
      group.clear();
    },
  };
}
