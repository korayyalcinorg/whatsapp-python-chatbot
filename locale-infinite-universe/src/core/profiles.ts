/**
 * Display profiles. The same build runs on a phone (preview), a laptop
 * (rehearsal / VJ control) and the wide LED wall behind the DJ booth; the
 * profile decides how hard we push the GPU and how the HUD behaves.
 */
export type ProfileId = 'mobile' | 'desktop' | 'led';

export interface DisplayProfile {
  id: ProfileId;
  /** Upper bound for devicePixelRatio. */
  maxPixelRatio: number;
  /** Fraction of CSS pixels actually rendered (before pixel ratio). */
  renderScale: number;
  antialias: boolean;
  /** Whether the HUD is visible at start. */
  showHud: boolean;
  /** Fixed drawing-buffer size (LED controller's native input), if any. */
  fixedSize?: { width: number; height: number };
}

const PRESETS: Record<ProfileId, DisplayProfile> = {
  mobile: { id: 'mobile', maxPixelRatio: 1.5, renderScale: 0.75, antialias: false, showHud: true },
  desktop: { id: 'desktop', maxPixelRatio: 2, renderScale: 1, antialias: true, showHud: true },
  led: { id: 'led', maxPixelRatio: 1, renderScale: 1, antialias: true, showHud: false },
};

function detectProfile(): ProfileId {
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const small = Math.min(window.screen.width, window.screen.height) < 820;
  return coarse && small ? 'mobile' : 'desktop';
}

function positiveInt(value: string | null): number | undefined {
  if (!value) return undefined;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/**
 * Resolve the profile from the URL, e.g.
 *   ?profile=led&w=3840&h=1080   LED wall with a fixed native resolution
 *   ?profile=mobile               force phone settings
 *   ?scale=0.5                    override render scale
 *   ?hud=0 / ?hud=1               hide / show HUD at start
 */
export function resolveProfile(params: URLSearchParams): DisplayProfile {
  const requested = params.get('profile') as ProfileId | null;
  const id: ProfileId = requested && requested in PRESETS ? requested : detectProfile();
  const profile: DisplayProfile = { ...PRESETS[id] };

  const width = positiveInt(params.get('w'));
  const height = positiveInt(params.get('h'));
  if (width && height) profile.fixedSize = { width, height };

  const scale = Number.parseFloat(params.get('scale') ?? '');
  if (Number.isFinite(scale) && scale > 0) profile.renderScale = Math.min(scale, 2);

  const hud = params.get('hud');
  if (hud === '0') profile.showHud = false;
  if (hud === '1') profile.showHud = true;

  return profile;
}
