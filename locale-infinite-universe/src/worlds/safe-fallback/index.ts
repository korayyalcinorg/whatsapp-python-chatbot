import * as THREE from 'three';
import fullscreenVert from '../../shaders/fullscreen.vert.glsl?raw';
import { BRAND } from '../../brand/brand';
import type { PortalScreen, WorldDefinition, WorldFrame, WorldInstance } from '../types';
import fragmentShader from './safeFallback.frag.glsl?raw';

const LAYERS = 7; // must match LAYERS in the shader

/**
 * The cheapest possible world: one shader, no textures. Used when another
 * world fails to build or crashes, so the wall is never black.
 */
class SafeFallbackWorld implements WorldInstance {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly material: THREE.ShaderMaterial;
  private readonly mesh: THREE.Mesh;
  private zoom = 0;

  constructor() {
    this.material = new THREE.ShaderMaterial({
      vertexShader: fullscreenVert,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uResolution: { value: new THREE.Vector2(1, 1) },
        uTime: { value: 0 },
        uZoom: { value: 0 },
        uBass: { value: 0 },
        uMid: { value: 0 },
        uHigh: { value: 0 },
        uBeat: { value: 0 },
        uHue: { value: 0.33 },
        uTintA: { value: new THREE.Color(BRAND.emeraldNeon) },
        uTintB: { value: new THREE.Color(BRAND.beerGold) },
      },
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
  }

  resize(width: number, height: number): void {
    this.material.uniforms.uResolution.value.set(width, height);
  }

  update({ time, delta, audio, speed }: WorldFrame): void {
    this.zoom = (this.zoom + delta * 0.3 * speed * (1 + audio.bass * 0.8)) % (LAYERS * 64);
    const u = this.material.uniforms;
    u.uTime.value = time;
    u.uZoom.value = this.zoom;
    u.uBass.value = audio.bass;
    u.uMid.value = audio.mid;
    u.uHigh.value = audio.high;
    u.uBeat.value = audio.beat;
  }

  exitPortal(): PortalScreen {
    return { center: new THREE.Vector2(0.5, 0.5), radius: 0.02 };
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}

export const safeFallback: WorldDefinition = {
  id: 'safe-fallback',
  title: 'Safe Fallback',
  status: 'fallback',
  concept: 'Nested ring universes; shown only if a world fails.',
  assets: [],
  cameraPath: { description: 'Constant infinite zoom.', cruiseSeconds: 10 },
  entryPortal: { object: 'screen', transition: 'infinite-zoom-in' },
  exitPortals: [{ id: 'centre', object: 'Centre', transition: 'infinite-zoom-in', leadsTo: [] }],
  rules: { minDwell: 8, maxDwell: 12, energyRange: [0, 1], transitionSeconds: 4 },
  variants: [],
  performance: { cost: 1, renderScale: 0.75 },
  brand: { appearance: 'none', maxPerVisit: 0 },
  create: () => new SafeFallbackWorld(),
};
