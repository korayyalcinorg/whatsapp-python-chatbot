import type * as THREE from 'three';
import type { AudioFeatures } from '../core/types';
import type { QualitySettings } from '../core/quality';
import type { AssetCache } from '../core/AssetCache';

export type WorldId =
  | 'bubbleverse'
  | 'dart-singularity'
  | 'eight-ball-universe'
  | 'impossible-locale'
  | 'eye-of-infinity'
  | 'mirror-paradox'
  | 'stadium-beyond'
  | 'liquid-multiverse'
  | 'fractal-cathedral'
  | 'time-machine'
  | 'island-within'
  | 'locale-origin'
  | 'safe-fallback';

export type TransitionType =
  | 'hole-to-universe'
  | 'object-interior'
  | 'infinite-zoom-in'
  | 'infinite-zoom-out'
  | 'mirror-passage'
  | 'impossible-architecture'
  | 'fractal-recursion'
  | 'scale-revelation';

/** A doorway inside a world that leads to other worlds. */
export interface PortalSpec {
  id: string;
  /** The physical object the camera enters ("hero bubble", "bullseye", ...). */
  object: string;
  transition: TransitionType;
  /** Worlds this portal may open into, in order of preference. */
  leadsTo: WorldId[];
}

export interface CameraPathSpec {
  /** Short description of the movement, used in docs and the control panel. */
  description: string;
  /** Typical seconds before the camera starts heading for an exit portal. */
  cruiseSeconds: number;
}

export interface TransitionRules {
  /** Seconds a visit lasts in auto journey, scaled down by energy. */
  minDwell: number;
  maxDwell: number;
  /** Music energy (0..1) this world fits best. */
  energyRange: [number, number];
  /** Seconds the portal transition takes at intensity 0.5. */
  transitionSeconds: number;
}

export interface PerformanceProfile {
  /** Relative GPU cost 1 (cheap) .. 5 (heavy). */
  cost: 1 | 2 | 3 | 4 | 5;
  /** Multiplier applied to the global render scale for this world. */
  renderScale: number;
}

export interface BrandRules {
  /** How the logo may appear in this world. Never as a permanent watermark. */
  appearance: 'portal-reveal' | 'object-surface' | 'none';
  maxPerVisit: number;
}

export interface WorldDefinition {
  id: WorldId;
  title: string;
  status: 'prototype' | 'planned' | 'fallback';
  /** Moodboard-level description of the world. */
  concept: string;
  /** Assets the world needs (procedural ones are listed for documentation). */
  assets: string[];
  cameraPath: CameraPathSpec;
  entryPortal: { object: string; transition: TransitionType };
  exitPortals: PortalSpec[];
  rules: TransitionRules;
  variants: string[];
  performance: PerformanceProfile;
  brand: BrandRules;
  /** Present only for worlds that can actually be rendered. */
  create?: (ctx: WorldCreateContext) => WorldInstance;
}

export interface WorldCreateContext {
  renderer: THREE.WebGLRenderer;
  quality: QualitySettings;
  assets: AssetCache;
  variant: number;
  seed: number;
}

/** Screen-space position of the exit portal, uv (0..1) with radius in screen-height units. */
export interface PortalScreen {
  center: THREE.Vector2;
  radius: number;
}

export interface WorldFrame {
  /** Seconds since this world became visible (pre-roll included). */
  time: number;
  delta: number;
  audio: AudioFeatures;
  /** 0..1, from audio or the DJ's Energy fader. */
  energy: number;
  speed: number;
  /** 0..1 while the camera dives into the exit portal, otherwise null. */
  exitProgress: number | null;
}

export interface WorldInstance {
  readonly scene: THREE.Scene;
  readonly camera: THREE.Camera;
  /** Optional custom render (multi-pass worlds); default renders scene/camera. */
  render?(renderer: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget): void;
  resize(width: number, height: number): void;
  update(frame: WorldFrame): void;
  exitPortal(): PortalScreen;
  dispose(): void;
}
