import * as THREE from 'three';
import { log } from './Logger';
import type { DisplayProfile } from './profiles';

export interface EngineStats {
  fps: number;
  frameMs: number;
  width: number;
  height: number;
}

/**
 * Owns the WebGL renderer, the output size, the animation loop and WebGL
 * context-loss recovery. Everything visual is drawn by the Pipeline.
 */
export class Engine {
  readonly renderer: THREE.WebGLRenderer;
  readonly stats: EngineStats = { fps: 0, frameMs: 0, width: 0, height: 0 };
  contextLost = false;

  private readonly resizeListeners = new Set<(w: number, h: number) => void>();
  private readonly restoreListeners = new Set<() => void>();
  private frameCallback: ((time: number, delta: number) => void) | null = null;
  private visible = true;
  private lastNow = 0;
  private elapsed = 0;
  private fpsFrames = 0;
  private fpsTime = 0;

  constructor(
    private readonly container: HTMLElement,
    private profile: DisplayProfile,
  ) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: false, // the pipeline renders to offscreen targets; MSAA there is wasted
      powerPreference: 'high-performance',
      alpha: false,
      stencil: false,
    });
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    const canvas = this.renderer.domElement;
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault(); // allow the browser to restore the context
      this.contextLost = true;
      log.error('WebGL context lost, waiting for restore');
    });
    canvas.addEventListener('webglcontextrestored', () => {
      this.contextLost = false;
      log.warn('WebGL context restored, rebuilding GPU resources');
      for (const l of this.restoreListeners) l();
      this.handleResize();
    });

    window.addEventListener('resize', this.handleResize);
    document.addEventListener('visibilitychange', () => {
      this.visible = document.visibilityState === 'visible';
      this.lastNow = performance.now();
    });
    this.handleResize();
  }

  get canvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  setFixedSize(size: { width: number; height: number } | undefined): void {
    this.profile = { ...this.profile, fixedSize: size };
    this.handleResize();
  }

  onResize(listener: (w: number, h: number) => void): void {
    this.resizeListeners.add(listener);
    listener(this.stats.width, this.stats.height);
  }

  onContextRestored(listener: () => void): void {
    this.restoreListeners.add(listener);
  }

  start(onFrame: (time: number, delta: number) => void): void {
    this.frameCallback = onFrame;
    this.lastNow = performance.now();
    this.renderer.setAnimationLoop(this.tick);
  }

  private readonly tick = (): void => {
    if (!this.visible || this.contextLost || !this.frameCallback) return;
    const now = performance.now();
    const rawDelta = (now - this.lastNow) / 1000;
    // Clamp so a dropped frame or tab switch never causes a visual jump.
    const delta = Math.min(rawDelta, 1 / 20);
    this.lastNow = now;
    this.elapsed += delta;

    this.fpsFrames++;
    this.fpsTime += rawDelta;
    if (this.fpsTime >= 0.5) {
      this.stats.fps = this.fpsFrames / this.fpsTime;
      this.fpsFrames = 0;
      this.fpsTime = 0;
    }
    this.stats.frameMs += (rawDelta * 1000 - this.stats.frameMs) * 0.1;

    this.frameCallback(this.elapsed, delta);
  };

  private readonly handleResize = (): void => {
    const { fixedSize, maxPixelRatio } = this.profile;
    let width: number;
    let height: number;
    if (fixedSize) {
      // LED controllers expect an exact input resolution; CSS stretches the canvas to the window.
      width = fixedSize.width;
      height = fixedSize.height;
    } else {
      const dpr = Math.min(window.devicePixelRatio || 1, maxPixelRatio);
      width = Math.round((this.container.clientWidth || window.innerWidth) * dpr);
      height = Math.round((this.container.clientHeight || window.innerHeight) * dpr);
    }
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(width, height, false);
    this.stats.width = width;
    this.stats.height = height;
    for (const listener of this.resizeListeners) listener(width, height);
  };
}
