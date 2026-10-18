export type QualityPreset = 'low' | 'medium' | 'high' | 'ultra';

export interface QualitySettings {
  preset: QualityPreset;
  /** Fraction of the output resolution worlds render at (before adaptive scaling). */
  renderScale: number;
  bloom: boolean;
  /** Bloom buffer resolution relative to the output. */
  bloomScale: number;
  /** Raymarch step budget for SDF worlds. */
  marchSteps: number;
  /** Instanced particle budget (bubbles, sparks). */
  particles: number;
  shadows: boolean;
  /** Edge size of generated textures (dartboard etc.). */
  textureSize: number;
}

export const QUALITY_PRESETS: Record<QualityPreset, QualitySettings> = {
  low: { preset: 'low', renderScale: 0.6, bloom: false, bloomScale: 0.25, marchSteps: 48, particles: 120, shadows: false, textureSize: 1024 },
  medium: { preset: 'medium', renderScale: 0.8, bloom: true, bloomScale: 0.5, marchSteps: 72, particles: 260, shadows: false, textureSize: 2048 },
  high: { preset: 'high', renderScale: 1, bloom: true, bloomScale: 0.5, marchSteps: 96, particles: 420, shadows: true, textureSize: 2048 },
  ultra: { preset: 'ultra', renderScale: 1, bloom: true, bloomScale: 0.5, marchSteps: 128, particles: 700, shadows: true, textureSize: 4096 },
};

export function isQualityPreset(value: unknown): value is QualityPreset {
  return typeof value === 'string' && value in QUALITY_PRESETS;
}
