// Instanced bubble: per-instance offset/scale come from instanceMatrix.
varying vec3 vNormalV;
varying vec3 vViewPos;
varying float vSeed;

attribute float aSeed;

void main() {
  vSeed = aSeed;
  vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vec4 view = viewMatrix * world;
  vViewPos = view.xyz;
  vNormalV = normalize(mat3(viewMatrix) * mat3(modelMatrix) * mat3(instanceMatrix) * normal);
  gl_Position = projectionMatrix * view;
}
