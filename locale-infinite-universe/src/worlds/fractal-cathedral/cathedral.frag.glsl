// Fractal Cathedral: an endless gothic nave, raymarched.
// Pointed vault, clustered piers, transverse ribs, recursive blind arcades,
// stained-glass lancets in Locale colours, hazy light and a floating rose
// window that is the portal to the next world.
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uCamPos;
uniform vec3 uCamTarget;
uniform float uRoll;
uniform int uSteps;
uniform float uEnergy;
uniform float uBass;
uniform float uHigh;
uniform vec3 uPortalPos;
uniform float uPortalR;
uniform float uPortalGlow;
uniform vec3 uEmerald;
uniform vec3 uBurgundy;
uniform vec3 uGold;
uniform float uFractal; // variant: depth of the recursive arcade (1..3)

varying vec2 vUv;

#define MAX_STEPS 160
#define FAR 70.0
#define P 3.2        // bay length
#define W 2.7        // half width of the nave
#define HS 3.4       // springing height of the vault
#define WALL 0.45

float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
float hash3(vec3 p) { return fract(sin(dot(p, vec3(17.1, 113.7, 271.9))) * 43758.5453); }

// Pointed (equilateral) arch opening: negative inside.
float sdArch(vec2 p, float w, float h) {
  p.x = abs(p.x);
  if (p.y < h) return max(p.x - w, -p.y - 50.0);
  return length(vec2(p.x + w, p.y - h)) - 2.0 * w;
}

// Window opening in the side wall (local z, y).
float windowShape(vec2 q, float scale) {
  return sdArch(vec2(q.x, q.y - 1.6 * scale), 0.62 * scale, 2.6 * scale);
}

// Material ids: 1 stone, 2 floor, 3 glass
vec2 map(vec3 p) {
  float zl = mod(p.z, P) - 0.5 * P;     // bay-local z, columns at zl = 0
  float ax = abs(p.x);

  // Vault shell + walls.
  float inner = sdArch(p.xy, W, HS);
  float outer = sdArch(p.xy, W + WALL, HS + 0.2);
  float shell = max(-inner, outer);

  // Lancet windows cut through the side walls between the piers.
  float zw = mod(p.z + 0.5 * P, P) - 0.5 * P; // window centred between piers
  float win = windowShape(vec2(zw, p.y), 1.0);
  shell = max(shell, -(max(win, W - 0.2 - ax)));

  // Recursive blind arcade under the windows: arches inside arches.
  float arcade = 1e5;
  float s = 1.0;
  vec2 aq = vec2(zw, p.y - 0.35);
  for (int i = 0; i < 3; i++) {
    if (float(i) >= uFractal) break;
    aq.x = mod(aq.x + 0.5 * P * s * 0.5, P * s * 0.5) - 0.25 * P * s;
    float a = abs(sdArch(aq, 0.28 * P * s * 0.5, 0.55 * s)) - 0.035 * s;
    arcade = min(arcade, a);
    s *= 0.5;
  }
  float arcadeSlab = max(arcade, abs(ax - (W - 0.04)) - 0.1);
  arcadeSlab = max(arcadeSlab, p.y - 1.25);

  // Clustered piers (four shafts round a core) at bay boundaries.
  vec2 pc = vec2(ax - (W - 0.12), zl);
  float pier = length(pc) - 0.34;
  float flutes = cos(atan(pc.y, pc.x) * 12.0) * 0.018;
  pier += flutes;
  for (int k = 0; k < 4; k++) {
    float ang = float(k) * 1.5708 + 0.785;
    pier = min(pier, length(pc - 0.3 * vec2(cos(ang), sin(ang))) - 0.12);
  }
  pier = max(pier, p.y - HS - 0.1);
  // Capital ring.
  float capital = max(length(pc) - 0.48, abs(p.y - HS + 0.05) - 0.08);
  pier = min(pier, capital);

  // Transverse rib following the vault, plus a diagonal (groin) rib hint.
  float rib = max(abs(sdArch(p.xy, W - 0.18, HS)) - 0.1, abs(zl) - 0.13);
  float diag = max(abs(sdArch(vec2(p.x, p.y), W - 0.25, HS)) - 0.06, abs(abs(zl) - abs(p.x) * (P * 0.5 / W)) - 0.07);
  diag = max(diag, HS - p.y);
  rib = min(rib, diag);

  float stone = min(min(shell, pier), min(rib, arcadeSlab));

  // Stained glass panes sit in the window openings.
  float glass = max(abs(ax - (W + WALL * 0.5)) - 0.02, win);

  float floorD = p.y;
  vec2 res = vec2(stone, 1.0);
  if (floorD < res.x) res = vec2(floorD, 2.0);
  if (glass < res.x) res = vec2(glass, 3.0);
  return res;
}

vec3 calcNormal(vec3 p) {
  vec2 e = vec2(0.002, 0.0);
  return normalize(vec3(
    map(p + e.xyy).x - map(p - e.xyy).x,
    map(p + e.yxy).x - map(p - e.yxy).x,
    map(p + e.yyx).x - map(p - e.yyx).x));
}

float ao(vec3 p, vec3 n) {
  float o = 0.0, w = 1.0;
  for (int i = 1; i <= 4; i++) {
    float h = 0.08 * float(i);
    o += w * (h - map(p + n * h).x);
    w *= 0.6;
  }
  return clamp(1.0 - 2.2 * o, 0.0, 1.0);
}

// Stained glass: leaded cells coloured emerald / burgundy / gold.
vec3 glassColor(vec3 p) {
  float zw = mod(p.z + 0.5 * P, P) - 0.5 * P;
  vec2 g = vec2(zw, p.y) * vec2(9.0, 7.0);
  vec2 cell = floor(g);
  float h = hash(cell + floor(p.z / P) * 7.0 + sign(p.x) * 3.0);
  vec3 c = h < 0.4 ? uEmerald : (h < 0.75 ? uBurgundy : uGold);
  c *= 0.6 + 0.8 * hash(cell * 1.3);
  vec2 f = fract(g) - 0.5;
  float lead = smoothstep(0.36, 0.46, max(abs(f.x), abs(f.y)));
  // Tracery roundel at the top of each lancet.
  vec2 rp = vec2(zw, p.y - 4.55);
  float ring = abs(length(rp) - 0.42);
  lead = max(lead, smoothstep(0.05, 0.02, ring));
  return c * (1.0 - lead * 0.95);
}

// Rose window: radial tracery in Locale colours.
vec3 roseColor(vec2 q) {
  float r = length(q);
  float a = atan(q.y, q.x) + uTime * 0.05;
  float petals = 12.0;
  float sa = mod(a, 6.28318 / petals) - 3.14159 / petals;
  vec2 k = vec2(cos(sa), sin(sa)) * r;
  float ring1 = abs(r - 0.32);
  float ring2 = abs(r - 0.7);
  float spoke = abs(k.y);
  float foil = abs(length(k - vec2(0.52, 0.0)) - 0.16);
  float lead = min(min(ring1, ring2), min(spoke, foil));
  float band = r < 0.32 ? 0.0 : (r < 0.7 ? 1.0 : 2.0);
  float h = hash(vec2(floor((a + 3.14159) / 6.28318 * petals), band));
  vec3 c = band == 0.0 ? uGold * 1.6 : (h < 0.5 ? uEmerald : uBurgundy) * 1.3;
  c = mix(c, uGold * 1.4, smoothstep(0.08, 0.0, r) );
  c *= 1.0 - smoothstep(0.035, 0.015, lead) * 0.9;
  c *= smoothstep(1.0, 0.96, r);
  c += uGold * smoothstep(0.03, 0.0, abs(r - 1.0)) * 0.6; // outer stone ring glints
  return c;
}

vec3 envColor(vec3 rd) {
  // What the polished floor reflects: warm haze and coloured window light.
  float side = abs(rd.x);
  return mix(vec3(0.02, 0.015, 0.01), mix(uEmerald, uBurgundy, 0.5 + 0.5 * sin(rd.z * 3.0)) * 0.5, smoothstep(0.3, 0.9, side)) + uGold * 0.15 * max(rd.y, 0.0);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;

  vec3 ro = uCamPos;
  vec3 fw = normalize(uCamTarget - ro);
  vec3 up0 = vec3(sin(uRoll), cos(uRoll), 0.0);
  vec3 rt = normalize(cross(fw, up0));
  vec3 up = cross(rt, fw);
  vec3 rd = normalize(fw * 1.35 + uv.x * rt + uv.y * up);

  // March.
  float t = 0.0;
  vec2 hit = vec2(-1.0);
  vec3 haze = vec3(0.0);
  for (int i = 0; i < MAX_STEPS; i++) {
    if (i >= uSteps) break;
    vec3 p = ro + rd * t;
    vec2 h = map(p);
    // Volumetric shafts: light near the windows and the rose window.
    float zw = mod(p.z + 0.5 * P, P) - 0.5 * P;
    float shaft = exp(-abs(zw) * 2.2) * smoothstep(0.5, 4.0, p.y) * smoothstep(0.0, W, abs(p.x) + p.y * 0.3);
    float roseGlow = exp(-length(p - uPortalPos) * 0.45);
    haze += (shaft * mix(uGold, uEmerald, 0.5 + 0.5 * sin(floor(p.z / P))) * 0.006 + roseGlow * uGold * 0.012 * (0.6 + uPortalGlow)) * max(h.x, 0.05);
    if (h.x < 0.0015 * t + 0.0005) { hit = vec2(t, h.y); break; }
    t += h.x * 0.85;
    if (t > FAR) break;
  }

  vec3 col;
  vec3 fogCol = vec3(0.01, 0.009, 0.007) + uGold * 0.012;
  if (hit.x > 0.0) {
    vec3 p = ro + rd * hit.x;
    vec3 n = calcNormal(p);
    float occ = ao(p, n);
    if (hit.y > 2.5) {
      col = glassColor(p) * (1.6 + uHigh * 0.8);
    } else {
      // Stone: warm limestone with grime; lit by windows, the rose and fill.
      float grime = 0.75 + 0.25 * hash3(floor(p * 6.0));
      vec3 albedo = vec3(0.30, 0.27, 0.22) * grime;
      if (hit.y > 1.5) {
        vec2 tile = floor(p.xz * 0.8);
        float chk = mod(tile.x + tile.y, 2.0);
        albedo = mix(vec3(0.015, 0.03, 0.022), vec3(0.24, 0.22, 0.18), chk);
      }
      float zw = mod(p.z + 0.5 * P, P) - 0.5 * P;
      vec3 winPos = vec3(sign(p.x + 1e-4) * (W + 0.2), 3.0, p.z - zw);
      vec3 winPosOpp = vec3(-winPos.x, 3.0, winPos.z);
      vec3 l1 = winPos - p;
      vec3 l2 = winPosOpp - p;
      vec3 c1 = mix(uEmerald, uGold, 0.5 + 0.5 * sin(floor(p.z / P) * 1.7));
      vec3 c2 = mix(uBurgundy, uGold, 0.5 + 0.5 * cos(floor(p.z / P) * 1.3));
      vec3 light = c1 * 1.4 * max(dot(n, normalize(l1)), 0.0) / (1.0 + dot(l1, l1) * 0.12);
      light += c2 * 1.4 * max(dot(n, normalize(l2)), 0.0) / (1.0 + dot(l2, l2) * 0.12);
      vec3 lr = uPortalPos - p;
      light += uGold * (1.2 + 3.0 * uPortalGlow) * max(dot(n, normalize(lr)), 0.0) / (1.0 + dot(lr, lr) * 0.04);
      light += vec3(0.02, 0.02, 0.018); // bounce
      col = albedo * light * occ;
      if (hit.y > 1.5) {
        vec3 rf = reflect(rd, n);
        float fres = pow(1.0 - max(dot(-rd, n), 0.0), 4.0);
        col += envColor(rf) * (0.15 + 0.6 * fres) + uGold * 0.4 * exp(-abs(rf.x) * 6.0) * fres;
      }
    }
    float fog = 1.0 - exp(-hit.x * 0.045);
    col = mix(col, fogCol, fog);
  } else {
    col = fogCol;
  }
  col += haze * (0.8 + uEnergy * 0.6 + uBass * 0.5);

  // Floating rose window (analytic disc, faces the camera's travel direction).
  float tp = (uPortalPos.z - ro.z) / rd.z;
  if (tp > 0.0 && (hit.x < 0.0 || tp < hit.x)) {
    vec3 pp = ro + rd * tp;
    vec2 q = (pp.xy - uPortalPos.xy) / uPortalR;
    float r = length(q);
    if (r < 1.06) {
      vec3 rose = roseColor(q) * (1.4 + uPortalGlow * 2.0 + uBass * 0.6);
      col = mix(col, rose, smoothstep(1.06, 1.0, r));
    }
  }
  gl_FragColor = vec4(col, 1.0);
}
