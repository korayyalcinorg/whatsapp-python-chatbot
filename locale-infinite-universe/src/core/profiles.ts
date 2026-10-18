import type { QualityPreset } from './quality';
import { isQualityPreset } from './quality';

/**
 * Display profiles. The same build runs on a phone (preview), a laptop
 * (rehearsal / DJ control) and the wide LED wall behind the DJ booth.
 */
export type ProfileId = 'mobile' | 'desktop' | 'led';

export interface DisplayProfile {
  id: ProfileId;
  maxPixelRatio: number;
  quality: QualityPreset;
  /** Whether the embedded control panel is visible at start. */
  showPanel: boolean;
  /** Fixed output size (LED controller's native input), if any. */
  fixedSize?: { width: number; height: number };
}

const PRESETS: Record<ProfileId, DisplayProfile> = {
  mobile: { id: 'mobile', maxPixelRatio: 1.5, quality: 'low', showPanel: false },
  desktop: { id: 'desktop', maxPixelRatio: 1.5, quality: 'high', showPanel: false },
  led: { id: 'led', maxPixelRatio: 1, quality: 'high', showPanel: false },
};

const LED_SIZE_KEY = 'locale-universe:led-size';

function detectProfile(): ProfileId {
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const small = Math.min(window.screen.width, window.screen.height) < 820;
  return coarse && small ? 'mobile' : 'desktop';
}

function positiveInt(value: string | null | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 && n <= 16384 ? n : undefined;
}

export function storedLedSize(): { width: number; height: number } | undefined {
  try {
    const [w, h] = (localStorage.getItem(LED_SIZE_KEY) ?? '').split('x');
    const width = positiveInt(w);
    const height = positiveInt(h);
    return width && height ? { width, height } : undefined;
  } catch {
    return undefined;
  }
}

export function storeLedSize(size: { width: number; height: number } | null): void {
  try {
    if (size) localStorage.setItem(LED_SIZE_KEY, `${size.width}x${size.height}`);
    else localStorage.removeItem(LED_SIZE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Resolve the profile from the URL:
 *   ?profile=led&w=3840&h=1080   LED wall at a fixed native resolution
 *   ?quality=low|medium|high|ultra
 *   ?panel=1                      show the embedded control panel at start
 */
export function resolveProfile(params: URLSearchParams): DisplayProfile {
  const requested = params.get('profile') as ProfileId | null;
  const id: ProfileId = requested && requested in PRESETS ? requested : detectProfile();
  const profile: DisplayProfile = { ...PRESETS[id] };

  const width = positiveInt(params.get('w'));
  const height = positiveInt(params.get('h'));
  if (width && height) profile.fixedSize = { width, height };
  else if (id === 'led') profile.fixedSize = storedLedSize();

  const quality = params.get('quality');
  if (isQualityPreset(quality)) profile.quality = quality;
  if (params.get('panel') === '1') profile.showPanel = true;
  return profile;
}
