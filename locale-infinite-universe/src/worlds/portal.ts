import * as THREE from 'three';
import type { PortalScreen } from './types';

const tmpCenter = new THREE.Vector3();
const tmpEdge = new THREE.Vector3();
const tmpRight = new THREE.Vector3();

/**
 * Project a spherical portal (world-space centre + radius) to screen space:
 * uv centre (0..1) and radius in screen-height units. When the camera is
 * inside or behind the sphere the portal is reported as covering the screen.
 */
export function projectPortal(camera: THREE.Camera, center: THREE.Vector3, radius: number): PortalScreen {
  camera.updateMatrixWorld();
  const toCenter = tmpCenter.copy(center).applyMatrix4(camera.matrixWorldInverse);
  if (toCenter.z > -radius * 0.5) return { center: new THREE.Vector2(0.5, 0.5), radius: 10 };
  tmpRight.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
  tmpEdge.copy(center).addScaledVector(tmpRight, radius).project(camera);
  const c = tmpCenter.copy(center).project(camera);
  const aspect = camera instanceof THREE.PerspectiveCamera ? camera.aspect : 1;
  const dx = (tmpEdge.x - c.x) * 0.5 * aspect;
  const dy = (tmpEdge.y - c.y) * 0.5;
  return { center: new THREE.Vector2(c.x * 0.5 + 0.5, c.y * 0.5 + 0.5), radius: Math.hypot(dx, dy) };
}
