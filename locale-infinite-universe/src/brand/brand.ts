import * as THREE from 'three';

/**
 * Locale Sports Bar brand tokens.
 * `logo*` values were sampled from public/brand/locale-logo-original.jpg
 * (see docs/LOGO_ANALYSIS.md); `display*` values are the brighter versions
 * used for light on the LED wall, where the logo's print colours look muddy.
 */
export const BRAND = {
  logoEmerald: '#132517',
  logoBurgundy: '#2b130f',
  logoGold: '#fec907',
  logoCream: '#ffe9c6',

  emerald: '#0f6b3a',
  emeraldNeon: '#19c46a',
  burgundy: '#7a1426',
  burgundyNeon: '#e0284f',
  beerGold: '#ffb21a',
  warmWhite: '#fff1dc',
  nightBlack: '#050806',
} as const;

export const LOGO_URL = `${import.meta.env.BASE_URL}brand/locale-logo-alpha.png`;

export function brandColor(key: keyof typeof BRAND): THREE.Color {
  return new THREE.Color(BRAND[key]);
}

export type ThemeId = 'locale-classic' | 'emerald-night' | 'burgundy-fire' | 'golden-hour';

export interface ColorTheme {
  id: ThemeId;
  title: string;
  /** Added to shadows (linear RGB). */
  lift: [number, number, number];
  /** Multiplies highlights. */
  gain: [number, number, number];
  saturation: number;
}

export const THEMES: Record<ThemeId, ColorTheme> = {
  'locale-classic': { id: 'locale-classic', title: 'Locale Classic', lift: [0.003, 0.0015, 0.0], gain: [1, 1, 1], saturation: 1.05 },
  'emerald-night': { id: 'emerald-night', title: 'Emerald Night', lift: [0.0, 0.012, 0.006], gain: [0.85, 1.08, 0.92], saturation: 1.0 },
  'burgundy-fire': { id: 'burgundy-fire', title: 'Burgundy Fire', lift: [0.012, 0.0, 0.003], gain: [1.12, 0.9, 0.88], saturation: 1.1 },
  'golden-hour': { id: 'golden-hour', title: 'Golden Hour', lift: [0.008, 0.005, 0.0], gain: [1.1, 1.0, 0.8], saturation: 1.0 },
};
