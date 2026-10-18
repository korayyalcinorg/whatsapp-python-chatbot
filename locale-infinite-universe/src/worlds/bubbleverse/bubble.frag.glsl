// CO2 bubble in beer: transparent core that refracts the bright foam above
// (so it reads lighter than the liquid), a dark total-internal-reflection
// band and a hot specular rim / highlight.
precision highp float;

uniform vec3 uGold;
uniform vec3 uFoam;
uniform vec3 uDeep;
uniform float uHigh;
uniform vec3 uFogColor;
uniform float uFogDensity;

varying vec3 vNormalV;
varying vec3 vViewPos;
varying float vSeed;

void main() {
  vec3 n = normalize(vNormalV);
  vec3 v = normalize(-vViewPos);
  float ndv = clamp(dot(n, v), 0.0, 1.0);
  float edge = 1.0 - ndv;

  // Core: refracted view of the bright liquid above (bubble acts as a lens).
  vec3 core = mix(uGold * 1.25, uFoam, smoothstep(-0.2, 0.9, n.y) * 0.6);
  // Dark band where light is totally reflected.
  float band = smoothstep(0.45, 0.75, edge) * (1.0 - smoothstep(0.85, 0.97, edge));
  vec3 col = mix(core, uDeep * 0.35, band * 0.85);
  // Bright thin rim.
  col += uFoam * smoothstep(0.9, 1.0, edge) * 1.8;
  // Highlights from the light above + a small secondary from below.
  vec3 l1 = normalize(vec3(-0.3, 0.9, 0.4));
  vec3 l2 = normalize(vec3(0.4, -0.7, 0.5));
  vec3 r = reflect(-v, n);
  col += vec3(1.6, 1.45, 1.2) * pow(max(dot(r, l1), 0.0), 90.0) * (2.5 + 2.0 * uHigh);
  col += uGold * pow(max(dot(r, l2), 0.0), 30.0) * 0.8;

  float alpha = mix(0.35, 0.95, smoothstep(0.3, 0.95, edge));
  float fog = 1.0 - exp(-uFogDensity * uFogDensity * dot(vViewPos, vViewPos));
  col = mix(col, uFogColor, fog);
  alpha *= 1.0 - fog * 0.85;
  gl_FragColor = vec4(col, alpha);
}
