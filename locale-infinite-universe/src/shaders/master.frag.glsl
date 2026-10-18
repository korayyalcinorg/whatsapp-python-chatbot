// Final grade before tone mapping: colour theme, safe beat pulse, blackout.
precision highp float;

uniform sampler2D tDiffuse;
uniform vec3 uLift;
uniform vec3 uGain;
uniform float uSaturation;
uniform float uPulse;      // already limited by FlashGuard
uniform float uBlackout;   // 0 visible .. 1 black
uniform float uAspect;

varying vec2 vUv;

void main() {
  vec3 c = texture2D(tDiffuse, vUv).rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(l), c, uSaturation);
  c = c * uGain + uLift * (1.0 - clamp(l, 0.0, 1.0));
  c *= 1.0 + uPulse * 0.22;
  vec2 v = (vUv - 0.5) * vec2(uAspect, 1.0);
  c *= 1.0 - smoothstep(0.55, 1.6, length(v) / max(uAspect * 0.5, 0.5)) * 0.35;
  c *= 1.0 - uBlackout;
  gl_FragColor = vec4(max(c, 0.0), 1.0);
}
