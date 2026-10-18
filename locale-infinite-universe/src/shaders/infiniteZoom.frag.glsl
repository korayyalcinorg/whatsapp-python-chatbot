// Infinite zoom through nested "universes".
// LAYERS copies of a ring-shaped universe sit at scales 2^0 .. 2^LAYERS.
// uZoom slides every layer towards the viewer; a layer fades in while tiny,
// peaks mid-way and fades out once it is larger than the screen, so the
// loop never shows a seam.
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uZoom;
uniform float uBass;
uniform float uMid;
uniform float uHigh;
uniform float uBeat;
uniform float uHue;

varying vec2 vUv;

#define LAYERS 7.0
#define PI 3.14159265359
#define TAU 6.28318530718

vec3 palette(float t) {
  // Deep blue -> magenta -> amber neon palette (club friendly, no pure white).
  return 0.5 + 0.5 * cos(TAU * (t + vec3(0.0, 0.33, 0.67)));
}

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

mat2 rot(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

// One universe: a ring band (r in 0.5..1.0) with kaleidoscopic spokes,
// glowing orbits and a scattering of stars. The hole in the middle is where
// the next, smaller universe lives.
vec3 universe(vec2 q, float id) {
  float seed = hash(vec2(id, id * 1.7));
  float dir = seed > 0.5 ? 1.0 : -1.0;
  q *= rot(uTime * 0.15 * dir + seed * TAU);

  float r = length(q);
  float a = atan(q.y, q.x);

  float sectors = 5.0 + floor(seed * 4.0) * 2.0;
  float ka = abs(mod(a, TAU / sectors) - PI / sectors);
  vec2 k = vec2(cos(ka), sin(ka)) * r;

  float band = smoothstep(0.42, 0.52, r) * smoothstep(1.08, 0.96, r);

  float thickness = 0.006 + 0.01 * uBass;
  float orbits = thickness / (abs(sin(r * PI * (5.0 + seed * 3.0) - uTime * 0.6)) + 0.02);
  float spokes = thickness / (abs(k.y - 0.08 * sin(r * 12.0 + uTime)) + 0.015);
  float petals = smoothstep(0.03, 0.0, abs(length(k - vec2(0.75, 0.0)) - 0.18 - 0.04 * uMid));

  vec2 g = q * 9.0;
  vec2 cell = floor(g);
  float h = hash(cell + id);
  float star = smoothstep(0.08 + 0.06 * uHigh, 0.0, length(fract(g) - 0.5 - (h - 0.5) * 0.6));
  star *= step(0.9, h);

  vec3 col = palette(id * 0.137 + r * 0.35 + uHue);
  vec3 col2 = palette(id * 0.137 + 0.5 + uHue);

  vec3 c = col * (orbits * 0.6 + spokes * 0.5) + col2 * petals * 0.7;
  c *= band;
  c += vec3(1.0, 0.9, 0.8) * star * (0.25 + 0.5 * band) * (0.5 + uHigh);
  return c;
}

void main() {
  vec2 p = (vUv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0) * 2.0;
  p *= rot(uTime * 0.03);

  vec3 color = vec3(0.0);
  for (float i = 0.0; i < LAYERS; i++) {
    float t = (i + uZoom) / LAYERS;
    float depth = fract(t);
    // Unique per pass of a layer; uZoom is wrapped at 64 * LAYERS on the CPU.
    float id = mod(floor(t), 64.0) * LAYERS + i;
    // 0.25: the largest layer reaches past the edges of a 32:9 LED wall.
    float scale = exp2(LAYERS * (1.0 - depth)) * 0.25;
    float fade = smoothstep(0.0, 0.25, depth) * smoothstep(1.0, 0.7, depth);
    color += universe(p * scale, id) * fade;
  }

  // Central "portal" glow and beat flash.
  float r = length(p);
  color += palette(uHue + uTime * 0.05) * (0.04 / (r + 0.08)) * (0.4 + 0.8 * uBass);
  color *= 1.0 + uBeat * 0.35;

  color = 1.0 - exp(-color * 1.4);               // soft tone map, keeps LEDs from clipping
  color *= smoothstep(1.9, 0.4, length(vUv - 0.5) * 2.2); // vignette
  gl_FragColor = vec4(color, 1.0);
}
