// Brand reveal, drawn AFTER tone mapping and colour grading so the logo keeps
// its original colours. Uniform scale only; never stretched or tinted.
precision highp float;

uniform sampler2D tDiffuse;  // already display-encoded (sRGB)
uniform sampler2D tLogo;     // sRGB texture, sampled as linear
uniform vec2 uCenter;
uniform float uHalf;         // half size in screen-height units
uniform float uAlpha;
uniform float uAspect;

varying vec2 vUv;

vec3 linearToSRGB(vec3 c) {
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
}

void main() {
  vec3 base = texture2D(tDiffuse, vUv).rgb;
  if (uAlpha <= 0.0) { gl_FragColor = vec4(base, 1.0); return; }
  vec2 q = (vUv - uCenter) * vec2(uAspect, 1.0);
  vec2 luv = q / (2.0 * uHalf) + 0.5;
  vec4 logo = vec4(0.0);
  if (all(greaterThanEqual(luv, vec2(0.0))) && all(lessThanEqual(luv, vec2(1.0)))) logo = texture2D(tLogo, luv);
  gl_FragColor = vec4(mix(base, linearToSRGB(logo.rgb), logo.a * uAlpha), 1.0);
}
