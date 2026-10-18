import * as THREE from 'three';
import type { FrameContext, VisualScene } from '../core/types';
import vertexShader from '../shaders/fullscreen.vert.glsl?raw';
import fragmentShader from '../shaders/infiniteZoom.frag.glsl?raw';

/** Must match LAYERS in infiniteZoom.frag.glsl. */
const LAYERS = 7;
const ZOOM_WRAP = LAYERS * 64;

/** Phase-1 demo: a single full-screen shader zooming endlessly through nested universes. */
export class InfiniteZoomScene implements VisualScene {
  readonly id = 'infinite-zoom';
  readonly title = 'Infinite Zoom';
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  private readonly material: THREE.ShaderMaterial;
  private readonly mesh: THREE.Mesh;
  private zoom = 0;
  private hue = 0;

  constructor() {
    this.material = new THREE.ShaderMaterial({
      vertexShader,
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
        uHue: { value: 0 },
      },
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
  }

  resize(width: number, height: number): void {
    this.material.uniforms.uResolution.value.set(width, height);
  }

  update({ time, delta, audio, speed }: FrameContext): void {
    // Bass pushes the camera forward; a beat gives a short extra surge.
    const zoomSpeed = 0.35 * speed * (1 + audio.bass * 0.8 + audio.beat * 0.6);
    this.zoom = (this.zoom + delta * zoomSpeed) % ZOOM_WRAP;
    this.hue = (this.hue + delta * 0.01 * speed * (1 + audio.mid)) % 1;

    const u = this.material.uniforms;
    u.uTime.value = time;
    u.uZoom.value = this.zoom;
    u.uBass.value = audio.bass;
    u.uMid.value = audio.mid;
    u.uHigh.value = audio.high;
    u.uBeat.value = audio.beat;
    u.uHue.value = this.hue;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
