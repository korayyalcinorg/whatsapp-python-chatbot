import * as THREE from 'three';
import type { PortalScreen, WorldCreateContext, WorldFrame, WorldInstance } from '../types';
import { projectPortal } from '../portal';
import fullscreenVert from '../../shaders/fullscreen.vert.glsl?raw';
import liquidFrag from './liquid.frag.glsl?raw';
import bubbleVert from './bubble.vert.glsl?raw';
import bubbleFrag from './bubble.frag.glsl?raw';

interface Palette {
  deep: string;
  gold: string;
  foam: string;
}

/** Variant 0: Locale lager · 1: dark burgundy ale · 2: emerald night (green-lit glass). */
const PALETTES: Palette[] = [
  { deep: '#240a01', gold: '#b05208', foam: '#ffd28a' },
  { deep: '#120502', gold: '#6e2a0c', foam: '#f2c48e' },
  { deep: '#021209', gold: '#8a6a0a', foam: '#d8f5b0' },
];

const FIELD = { x: 7, yMin: -4.5, yMax: 4.5, zNear: 1.5, zFar: -34 };
const HERO_RADIUS = 1.0;

/**
 * Bubbleverse: the camera drifts upward-forward through a glass of beer.
 * One large "hero" bubble approaches; it is the portal to the next world.
 */
export class BubbleverseWorld implements WorldInstance {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(55, 16 / 9, 0.05, 80);

  private readonly liquid: THREE.ShaderMaterial;
  private readonly bubbleMaterial: THREE.ShaderMaterial;
  private readonly bubbles: THREE.InstancedMesh;
  private readonly hero: THREE.InstancedMesh;
  private readonly count: number;
  private readonly state: Float32Array; // x, y, z, radius, rise, phase per bubble
  private readonly heroPos = new THREE.Vector3(0, -0.4, -26);
  private readonly lookTarget = new THREE.Vector3();
  private readonly tmp = new THREE.Matrix4();
  private readonly rand: () => number;
  private beatScale = 0;

  constructor(ctx: WorldCreateContext) {
    let s = ctx.seed || 1;
    this.rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const pal = PALETTES[ctx.variant % PALETTES.length];
    const deep = new THREE.Color(pal.deep);
    const gold = new THREE.Color(pal.gold);
    const foam = new THREE.Color(pal.foam);

    this.liquid = new THREE.ShaderMaterial({
      vertexShader: fullscreenVert,
      fragmentShader: liquidFrag,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uAspect: { value: 16 / 9 },
        uEnergy: { value: 0.5 },
        uBass: { value: 0 },
        uDeep: { value: deep },
        uGold: { value: gold },
        uFoam: { value: foam },
        uLook: { value: new THREE.Vector2() },
      },
    });
    const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.liquid);
    backdrop.frustumCulled = false;
    backdrop.renderOrder = -1;
    this.scene.add(backdrop);

    this.bubbleMaterial = new THREE.ShaderMaterial({
      vertexShader: bubbleVert,
      fragmentShader: bubbleFrag,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uGold: { value: gold },
        uFoam: { value: foam },
        uDeep: { value: deep },
        uHigh: { value: 0 },
        uFogColor: { value: gold.clone().lerp(deep, 0.35) },
        uFogDensity: { value: 0.055 },
      },
    });

    this.count = ctx.quality.particles;
    const geometry = new THREE.SphereGeometry(1, 28, 18);
    const seeds = new Float32Array(this.count).map(() => this.rand());
    geometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
    this.bubbles = new THREE.InstancedMesh(geometry, this.bubbleMaterial, this.count);
    this.bubbles.frustumCulled = false;
    this.state = new Float32Array(this.count * 6);
    for (let i = 0; i < this.count; i++) this.spawn(i, true);
    this.scene.add(this.bubbles);

    const heroGeometry = new THREE.SphereGeometry(1, 64, 40);
    heroGeometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(new Float32Array([0.5]), 1));
    this.hero = new THREE.InstancedMesh(heroGeometry, this.bubbleMaterial, 1);
    this.hero.frustumCulled = false;
    this.hero.renderOrder = 1;
    this.scene.add(this.hero);
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.liquid.uniforms.uAspect.value = width / height;
  }

  update({ time, delta, audio, energy, speed, exitProgress }: WorldFrame): void {
    const forward = (1.6 + energy * 2.2 + audio.bass * 1.5) * speed;
    const p = exitProgress ?? 0;

    // Ambient bubbles stream past the camera and rise.
    for (let i = 0; i < this.count; i++) {
      const o = i * 6;
      const st = this.state;
      st[o + 2] += forward * delta * (1 - p * 0.7);
      st[o + 1] += st[o + 4] * delta * speed;
      const wobble = Math.sin(time * 3 + st[o + 5]) * 0.15 * st[o + 3];
      if (st[o + 2] > FIELD.zNear || st[o + 1] > FIELD.yMax) this.spawn(i, false);
      const r = st[o + 3];
      this.tmp.makeScale(r, r * 1.03, r).setPosition(st[o] + wobble, st[o + 1], st[o + 2]);
      this.bubbles.setMatrixAt(i, this.tmp);
    }
    this.bubbles.instanceMatrix.needsUpdate = true;

    // Hero bubble approaches until it hovers ahead, gently rising and swaying.
    const approach = 1 - Math.exp(-time * 0.12 * speed);
    this.heroPos.set(
      Math.sin(time * 0.31) * 0.35,
      -0.6 + approach * 0.5 + Math.sin(time * 0.53) * 0.12,
      THREE.MathUtils.lerp(-26, -5.5, approach),
    );
    this.beatScale = Math.max(audio.beat * 0.06, this.beatScale - delta * 0.4);
    const heroR = HERO_RADIUS * (1 + this.beatScale + Math.sin(time * 2.1) * 0.015);
    this.tmp.makeScale(heroR, heroR * 1.02, heroR).setPosition(this.heroPos);
    this.hero.setMatrixAt(0, this.tmp);
    this.hero.instanceMatrix.needsUpdate = true;

    // Camera: gentle sway while cruising, then a dive into the hero bubble.
    const sway = new THREE.Vector3(Math.sin(time * 0.21) * 0.25, Math.sin(time * 0.17) * 0.15, 0);
    const dive = p * p * (3 - 2 * p);
    this.camera.position.copy(sway).lerp(this.heroPos, dive * 0.97);
    this.lookTarget.set(sway.x * 0.5, sway.y * 0.5 + 0.1, -10).lerp(this.heroPos, Math.min(1, p * 3 + 0.25));
    this.camera.lookAt(this.lookTarget);
    this.camera.rotateZ(Math.sin(time * 0.13) * 0.04);

    const u = this.liquid.uniforms;
    u.uTime.value = time * speed;
    u.uEnergy.value = energy;
    u.uBass.value = audio.bass;
    u.uLook.value.set(this.camera.rotation.y * -0.6, this.camera.rotation.x * 0.6);
    this.bubbleMaterial.uniforms.uHigh.value = audio.high;
  }

  exitPortal(): PortalScreen {
    return projectPortal(this.camera, this.heroPos, HERO_RADIUS * 0.92);
  }

  dispose(): void {
    this.bubbles.geometry.dispose();
    this.hero.geometry.dispose();
    this.bubbleMaterial.dispose();
    this.liquid.dispose();
    this.bubbles.dispose();
    this.hero.dispose();
  }

  private spawn(i: number, initial: boolean): void {
    const o = i * 6;
    const st = this.state;
    const small = this.rand();
    const r = 0.025 + small * small * small * small * 0.55;
    st[o] = (this.rand() * 2 - 1) * FIELD.x;
    st[o + 1] = initial || this.rand() < 0.5 ? THREE.MathUtils.lerp(FIELD.yMin, FIELD.yMax, this.rand()) : FIELD.yMin;
    st[o + 2] = initial ? THREE.MathUtils.lerp(FIELD.zFar, FIELD.zNear, this.rand()) : FIELD.zFar + this.rand() * 4;
    st[o + 3] = r;
    st[o + 4] = 0.25 + r * 2.5; // bigger bubbles rise faster
    st[o + 5] = this.rand() * Math.PI * 2;
  }
}
