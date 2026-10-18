// Inside a pint: amber depth gradient, light pouring down from the foam,
// drifting caustics and suspended particles.
precision highp float;

uniform float uTime;
uniform float uAspect;
uniform float uEnergy;
uniform float uBass;
uniform vec3 uDeep;
uniform vec3 uGold;
uniform vec3 uFoam;
uniform vec2 uLook; // camera sway, shifts the light shafts

varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}

void main() {
  vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0) + uLook;
  float y = p.y;

  // Depth gradient: dark amber below, glowing gold under the foam.
  vec3 col = mix(uDeep, uGold, smoothstep(-0.7, 0.55, y));
  col += uFoam * smoothstep(0.3, 0.8, y) * 0.55;

  // God rays from the foam head.
  float rays = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float x = p.x * (1.4 + fi * 0.7) + y * (0.35 + fi * 0.1) + uTime * (0.03 + fi * 0.02);
    rays += pow(fbm(vec2(x * 3.0, fi * 7.0)), 3.0);
  }
  col += uGold * rays * smoothstep(-0.6, 0.6, y) * (0.5 + 0.4 * uEnergy);

  // Caustic shimmer.
  vec2 cp = p * 3.0 + vec2(0.0, -uTime * 0.25);
  float c = fbm(cp + fbm(cp * 1.7 + uTime * 0.2));
  col += uFoam * pow(c, 6.0) * 1.6 * smoothstep(-0.2, 0.6, y);

  // Fine suspended yeast/particles.
  vec2 g = p * 70.0 + vec2(0.0, -uTime * 4.0);
  float h = hash(floor(g));
  col += uFoam * step(0.985, h) * smoothstep(0.35, 0.0, length(fract(g) - 0.5)) * 0.6;

  col *= 0.7 + 0.2 * uBass;
  gl_FragColor = vec4(col, 1.0);
}
