import type { ThemeId } from '../brand/brand';
import type { QualityPreset } from '../core/quality';
import type { WorldId } from '../worlds/types';

/** Everything the DJ can change. Shared between the output and control windows. */
export interface ControlState {
  autoJourney: boolean;
  /** 'auto' follows the audio; otherwise the fader value 0..1 is used. */
  energyMode: 'auto' | 'manual';
  energy: number;
  speed: number;
  theme: ThemeId;
  logoFrequency: number;
  audioSensitivity: number;
  transitionIntensity: number;
  blackout: boolean;
  manualBpm: number;
  lockBpm: boolean;
  quality: QualityPreset;
  adaptiveQuality: boolean;
}

export const DEFAULT_CONTROL_STATE: ControlState = {
  autoJourney: true,
  energyMode: 'auto',
  energy: 0.5,
  speed: 1,
  theme: 'locale-classic',
  logoFrequency: 0.35,
  audioSensitivity: 1.2,
  transitionIntensity: 0.6,
  blackout: false,
  manualBpm: 124,
  lockBpm: false,
  quality: 'high',
  adaptiveQuality: true,
};

export type ControlCommand =
  | { type: 'set'; patch: Partial<ControlState> }
  | { type: 'next-portal' }
  | { type: 'go-to-world'; world: WorldId }
  | { type: 'audio-input'; deviceId: string | null }
  | { type: 'tap-tempo' }
  | { type: 'led-size'; size: { width: number; height: number } | null }
  | { type: 'request-status' };

/** Live status the output window reports back ~4x per second. */
export interface OutputStatus {
  state: ControlState;
  world: WorldId;
  worldTitle: string;
  next: WorldId | null;
  phase: 'cruise' | 'preparing' | 'transition';
  transitionProgress: number;
  history: WorldId[];
  fps: number;
  frameMs: number;
  outputSize: string;
  renderScale: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  heapMb: number | null;
  audio: { mode: string; device: string; level: number; bass: number; mid: number; high: number; onset: number; beat: number; bpm: number; bpmEstimate: number; confidence: number };
  playable: { id: WorldId; title: string }[];
  planned: { id: WorldId; title: string }[];
  logs: { time: string; level: string; message: string }[];
}
