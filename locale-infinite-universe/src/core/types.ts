import type * as THREE from 'three';

/** Normalised (0..1) audio features shared by every scene. */
export interface AudioFeatures {
  level: number;
  bass: number;
  mid: number;
  high: number;
  /** 1 on a detected beat, decays towards 0 afterwards. */
  beat: number;
}

export interface FrameContext {
  /** Seconds since start (paused while the tab is hidden). */
  time: number;
  /** Seconds since last frame, clamped. */
  delta: number;
  audio: AudioFeatures;
  /** Global speed multiplier controlled from the HUD / keyboard. */
  speed: number;
}

/** A visual "universe". Each scene owns its Three.js scene graph and camera. */
export interface VisualScene {
  readonly id: string;
  readonly title: string;
  readonly scene: THREE.Scene;
  readonly camera: THREE.Camera;
  resize(width: number, height: number): void;
  update(frame: FrameContext): void;
  dispose(): void;
}

export type SceneFactory = () => VisualScene;
