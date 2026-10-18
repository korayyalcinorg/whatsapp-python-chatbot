import * as THREE from 'three';
import { BRAND } from '../../brand/brand';
import { projectPortal } from '../portal';
import type { PortalScreen, WorldCreateContext, WorldFrame, WorldInstance } from '../types';
import fullscreenVert from '../../shaders/fullscreen.vert.glsl?raw';
import cathedralFrag from './cathedral.frag.glsl?raw';

/** Must match the shader's focal length (rd = fw * 1.35 + uv). */
const FOV = THREE.MathUtils.radToDeg(2 * Math.atan(0.5 / 1.35));
const ROSE_RADIUS = 1.7;
const ROSE_HEIGHT = 3.9;
const ROSE_AHEAD = 15;

/** Variants change the depth of the recursive arcade and the glass palette balance. */
const VARIANTS = [
  { fractal: 3, emerald: BRAND.emerald, burgundy: BRAND.burgundy, gold: BRAND.beerGold },
  { fractal: 2, emerald: BRAND.emerald, burgundy: BRAND.burgundy, gold: BRAND.warmWhite },
  { fractal: 3, emerald: BRAND.emeraldNeon, burgundy: BRAND.burgundy, gold: BRAND.beerGold },
];

/**
 * Fractal Cathedral: a raymarched gothic nave that never ends. A rose window
 * floats ahead, always the same distance away, until the camera is allowed
 * to reach it — it is the portal.
 */
export class FractalCathedralWorld implements WorldInstance {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(FOV, 16 / 9, 0.05, 100);

  private readonly material: THREE.ShaderMaterial;
  private readonly mesh: THREE.Mesh;
  private readonly portalPos = new THREE.Vector3();
  private readonly target = new THREE.Vector3();
  private travel = 0;

  constructor(ctx: WorldCreateContext) {
    const v = VARIANTS[ctx.variant % VARIANTS.length];
    const linear = (hex: string): THREE.Color => new THREE.Color(hex);
    this.material = new THREE.ShaderMaterial({
      vertexShader: fullscreenVert,
      fragmentShader: cathedralFrag,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uResolution: { value: new THREE.Vector2(1, 1) },
        uTime: { value: 0 },
        uCamPos: { value: new THREE.Vector3() },
        uCamTarget: { value: new THREE.Vector3() },
        uRoll: { value: 0 },
        uSteps: { value: ctx.quality.marchSteps },
        uEnergy: { value: 0.5 },
        uBass: { value: 0 },
        uHigh: { value: 0 },
        uPortalPos: { value: this.portalPos },
        uPortalR: { value: ROSE_RADIUS },
        uPortalGlow: { value: 0 },
        uEmerald: { value: linear(v.emerald) },
        uBurgundy: { value: linear(v.burgundy) },
        uGold: { value: linear(v.gold) },
        uFractal: { value: v.fractal },
      },
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
    this.travel = (ctx.seed % 50) * 3.2; // start in a different bay each visit
  }

  resize(width: number, height: number): void {
    this.material.uniforms.uResolution.value.set(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  update({ time, delta, audio, energy, speed, exitProgress }: WorldFrame): void {
    const p = exitProgress ?? 0;
    const dive = p * p * (3 - 2 * p);
    this.travel += delta * (1.1 + energy * 1.6 + audio.bass * 0.6) * speed * (1 - dive * 0.5);
    const z = -this.travel;

    const cruise = new THREE.Vector3(Math.sin(time * 0.11) * 0.7, 1.75 + Math.sin(time * 0.17) * 0.25, z);
    const ahead = THREE.MathUtils.lerp(ROSE_AHEAD, 0.2, dive);
    this.portalPos.set(0, ROSE_HEIGHT, z - ahead);
    const pos = cruise.clone().lerp(new THREE.Vector3(0, ROSE_HEIGHT, z), dive);
    this.target.set(Math.sin(time * 0.09) * 0.8, 2.6 + Math.sin(time * 0.13) * 0.4, z - 8).lerp(this.portalPos, Math.min(1, 0.15 + p * 2));
    const roll = Math.sin(time * 0.07) * 0.06 + dive * 0.4;

    this.camera.position.copy(pos);
    this.camera.up.set(Math.sin(roll), Math.cos(roll), 0);
    this.camera.lookAt(this.target);

    const u = this.material.uniforms;
    u.uTime.value = time;
    u.uCamPos.value.copy(pos);
    u.uCamTarget.value.copy(this.target);
    u.uRoll.value = roll;
    u.uEnergy.value = energy;
    u.uBass.value = audio.bass;
    u.uHigh.value = audio.high;
    u.uPortalGlow.value = p + audio.beat * 0.3;
  }

  exitPortal(): PortalScreen {
    return projectPortal(this.camera, this.portalPos, ROSE_RADIUS);
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
