import * as THREE from 'three';
import type { DisplayProfile } from './profiles';

export interface EngineStats {
  fps: number;
  width: number;
  height: number;
}

/**
 * Owns the WebGL renderer, the canvas size and the animation loop.
 * Scenes never touch the renderer directly; they are drawn by SceneManager.
 */
export class Engine {
  readonly renderer: THREE.WebGLRenderer;
  readonly stats: EngineStats = { fps: 0, width: 0, height: 0 };

  private readonly container: HTMLElement;
  private readonly profile: DisplayProfile;
  private readonly resizeListeners = new Set<(w: number, h: number) => void>();
  private frameCallback: ((time: number, delta: number) => void) | null = null;
  private running = false;
  private lastNow = 0;
  private elapsed = 0;
  private fpsFrames = 0;
  private fpsTime = 0;

  constructor(container: HTMLElement, profile: DisplayProfile) {
    this.container = container;
    this.profile = profile;
    this.renderer = new THREE.WebGLRenderer({
      antialias: profile.antialias,
      powerPreference: 'high-performance',
      alpha: false,
      preserveDrawingBuffer: false,
    });
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    window.addEventListener('resize', this.handleResize);
    document.addEventListener('visibilitychange', this.handleVisibility);
    this.handleResize();
  }

  get canvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  onResize(listener: (w: number, h: number) => void): void {
    this.resizeListeners.add(listener);
    listener(this.stats.width, this.stats.height);
  }

  start(onFrame: (time: number, delta: number) => void): void {
    this.frameCallback = onFrame;
    this.running = true;
    this.lastNow = performance.now();
    this.renderer.setAnimationLoop(this.tick);
  }

  private readonly tick = (): void => {
    if (!this.running || !this.frameCallback) return;
    const now = performance.now();
    // Clamp so a dropped frame or a tab switch never causes a visual jump.
    const delta = Math.min((now - this.lastNow) / 1000, 1 / 20);
    this.lastNow = now;
    this.elapsed += delta;

    this.fpsFrames++;
    this.fpsTime += delta;
    if (this.fpsTime >= 0.5) {
      this.stats.fps = this.fpsFrames / this.fpsTime;
      this.fpsFrames = 0;
      this.fpsTime = 0;
    }

    this.frameCallback(this.elapsed, delta);
  };

  private readonly handleResize = (): void => {
    const { fixedSize, renderScale, maxPixelRatio } = this.profile;
    let width: number;
    let height: number;
    if (fixedSize) {
      // LED controllers expect an exact input resolution; CSS stretches the canvas to the window.
      this.renderer.setPixelRatio(1);
      width = fixedSize.width;
      height = fixedSize.height;
    } else {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPixelRatio) * renderScale);
      width = this.container.clientWidth || window.innerWidth;
      height = this.container.clientHeight || window.innerHeight;
    }
    this.renderer.setSize(width, height, false);
    const buffer = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    this.stats.width = buffer.x;
    this.stats.height = buffer.y;
    for (const listener of this.resizeListeners) listener(buffer.x, buffer.y);
  };

  private readonly handleVisibility = (): void => {
    // Pause the clock while hidden so the zoom continues seamlessly on return.
    this.running = document.visibilityState === 'visible';
    this.lastNow = performance.now();
  };
}
