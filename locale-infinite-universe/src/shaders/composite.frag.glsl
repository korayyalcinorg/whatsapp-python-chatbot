// Portal compositor: draws the current world, cuts a portal into it and shows
// the next world inside, scaled so that the whole next frame is "contained"
// in the portal and grows to full screen exactly when the portal covers it.
precision highp float;

uniform sampler2D tCurrent;
uniform sampler2D tNext;
uniform float uAspect;
uniform vec2 uCenter;      // portal centre, uv
uniform float uRadius;     // portal radius, screen-height units
uniform float uProgress;   // 0..1, -1 when no transition
uniform int uType;         // 0 object interior, 1 hole to universe, 2 fractal recursion
uniform float uIntensity;  // DJ "Transition Intensity"
uniform float uLogo;       // brand reveal alpha (halo only; the logo itself is drawn after tone mapping)
uniform float uLogoHalf;   // logo half size, screen-height units
uniform float uTime;

varying vec2 vUv;

#define PI 3.14159265359

vec2 toQ(vec2 uv, vec2 c) { return (uv - c) * vec2(uAspect, 1.0); }
vec2 fromQ(vec2 q, vec2 c) { return c + q / vec2(uAspect, 1.0); }

vec2 rotate(vec2 p, float a) { float s = sin(a), c = cos(a); return mat2(c, -s, s, c) * p; }

void main() {
  if (uProgress < 0.0) {
    gl_FragColor = texture2D(tCurrent, vUv);
    return;
  }
  float p = uProgress;
  vec2 c = mix(uCenter, vec2(0.5), smoothstep(0.45, 1.0, p));
  vec2 q = toQ(vUv, c);
  float cover = length(vec2(uAspect, 1.0)) * 0.5 + length(c - 0.5) * 2.0 + 0.05;
  float r = mix(max(uRadius, 0.002), cover, smoothstep(0.55, 1.0, p));

  float d = length(q);
  float a = atan(q.y, q.x);

  // Portal edge shape.
  float edgeR = r;
  if (uType == 2) {
    edgeR *= 1.0 + 0.06 * uIntensity * cos(a * 8.0 + uTime * 0.8) * (1.0 - p);
  }
  float inside = 1.0 - smoothstep(edgeR - 0.004 - r * 0.02, edgeR + 0.002, d);

  // --- current world, distorted around the portal ---
  vec2 qc = q;
  float near = exp(-max(d - r, 0.0) / max(r * 0.6, 0.02));
  if (uType == 1) {
    // Event horizon: space swirls into the hole.
    qc = rotate(q, near * (1.5 + 2.5 * uIntensity) * p);
  } else if (uType == 0) {
    // Liquid lens: the bubble pulls its surroundings towards its rim.
    qc = q * (1.0 - near * 0.18 * uIntensity);
  } else {
    qc = rotate(q, near * 0.6 * uIntensity);
  }
  vec3 current = texture2D(tCurrent, fromQ(qc, c)).rgb;

  // --- next world, compressed into the portal ---
  float k = cover / r;
  vec2 qn = q;
  if (uType == 0) {
    // Bubble lens bulge: magnify the middle, compress towards the rim.
    float x = clamp(d / r, 0.0, 1.0);
    qn *= mix(0.75, 1.0, x * x);
  } else if (uType == 2) {
    // Kaleidoscopic fold near the rim fades out as we pass through.
    float seg = PI / 4.0;
    float ka = abs(mod(a + uTime * 0.1, 2.0 * seg) - seg);
    vec2 kq = vec2(cos(ka), sin(ka)) * d;
    qn = mix(qn, kq, smoothstep(0.4, 1.0, d / r) * (1.0 - p) * uIntensity);
  }
  vec2 nuv = vec2(0.5) + qn * k / vec2(uAspect, 1.0);
  vec3 next = texture2D(tNext, clamp(nuv, 0.0, 1.0)).rgb;

  vec3 color = mix(current, next, inside);

  // Rim light.
  float rim = exp(-abs(d - edgeR) / max(r * 0.04, 0.002)) * (1.0 - smoothstep(0.75, 1.0, p));
  vec3 rimColor = uType == 1 ? vec3(0.0) : (uType == 0 ? vec3(1.6, 1.15, 0.45) : vec3(1.2, 0.9, 1.0));
  if (uType == 1) color *= 1.0 - 0.85 * rim; // dark event horizon ring
  else color += rimColor * rim * (0.6 + uIntensity);

  // Warm halo behind the brand reveal (outside the badge only).
  if (uLogo > 0.0) {
    float badge = uLogoHalf * 0.96;
    color += vec3(1.0, 0.65, 0.2) * smoothstep(badge * 0.9, badge, d) * exp(-max(d - badge, 0.0) / max(uLogoHalf * 0.25, 0.02)) * 0.35 * uLogo;
  }

  gl_FragColor = vec4(color, 1.0);
}
