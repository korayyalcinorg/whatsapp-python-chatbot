import type * as THREE from 'three';
import type { FrameContext, SceneFactory, VisualScene } from './types';

/**
 * Registry of scenes plus the currently active one. Crossfade / hypnotic
 * transitions between scenes will be added here (see roadmap, Phase 3).
 */
export class SceneManager {
  private readonly factories = new Map<string, SceneFactory>();
  private active: VisualScene | null = null;
  private width = 1;
  private height = 1;

  constructor(private readonly renderer: THREE.WebGLRenderer) {}

  register(id: string, factory: SceneFactory): void {
    this.factories.set(id, factory);
  }

  get ids(): string[] {
    return [...this.factories.keys()];
  }

  get current(): VisualScene | null {
    return this.active;
  }

  show(id: string): void {
    const factory = this.factories.get(id) ?? this.factories.values().next().value;
    if (!factory) throw new Error('No scenes registered');
    this.active?.dispose();
    this.active = factory();
    this.active.resize(this.width, this.height);
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.active?.resize(width, height);
  }

  render(frame: FrameContext): void {
    if (!this.active) return;
    this.active.update(frame);
    this.renderer.render(this.active.scene, this.active.camera);
  }
}
