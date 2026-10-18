/** Normalised (0..1) audio features shared by every world. */
export interface AudioFeatures {
  level: number;
  bass: number;
  mid: number;
  high: number;
  /** Spectral-flux onset strength, 0..1. */
  onset: number;
  /** 1 on a beat, decays to 0. Already passed through the flash guard. */
  beat: number;
  /** Beat phase 0..1 from the active BPM (manual or estimated). */
  phase: number;
  bpm: number;
}
