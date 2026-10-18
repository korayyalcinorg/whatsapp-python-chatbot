/**
 * BPM estimation from an onset-strength envelope via autocorrelation.
 * Deliberately simple; the control panel always offers manual BPM / tap tempo
 * as the authority when confidence is low.
 */
export interface TempoEstimate {
  bpm: number;
  confidence: number;
}

export class TempoEstimator {
  static readonly RATE = 50; // envelope samples per second
  private readonly buffer: Float32Array;
  private write = 0;
  private filled = 0;
  private carry = 0;
  private accum = 0;
  private accumCount = 0;

  constructor(
    seconds = 8,
    private readonly minBpm = 75,
    private readonly maxBpm = 180,
  ) {
    this.buffer = new Float32Array(Math.round(seconds * TempoEstimator.RATE));
  }

  /** Push the current onset strength; `delta` seconds have elapsed since the last push. */
  push(onset: number, delta: number): void {
    this.accum += onset;
    this.accumCount++;
    this.carry += delta * TempoEstimator.RATE;
    if (this.carry < 1) return;
    const value = this.accum / this.accumCount;
    while (this.carry >= 1) {
      this.carry -= 1;
      this.buffer[this.write] = value;
      this.write = (this.write + 1) % this.buffer.length;
      this.filled = Math.min(this.filled + 1, this.buffer.length);
    }
    this.accum = 0;
    this.accumCount = 0;
  }

  estimate(): TempoEstimate {
    const n = this.filled;
    if (n < this.buffer.length * 0.5) return { bpm: 0, confidence: 0 };
    const x = new Float32Array(n);
    let mean = 0;
    for (let i = 0; i < n; i++) {
      x[i] = this.buffer[(this.write - n + i + this.buffer.length) % this.buffer.length];
      mean += x[i];
    }
    mean /= n;
    let energy = 0;
    for (let i = 0; i < n; i++) {
      x[i] -= mean;
      energy += x[i] * x[i];
    }
    if (energy < 1e-6) return { bpm: 0, confidence: 0 };

    const rate = TempoEstimator.RATE;
    const minLag = Math.floor((60 * rate) / this.maxBpm);
    const maxLag = Math.ceil((60 * rate) / this.minBpm);
    const corr = new Float32Array(maxLag + 2);
    for (let lag = minLag - 1; lag <= maxLag + 1; lag++) {
      let s = 0;
      for (let i = lag; i < n; i++) s += x[i] * x[i - lag];
      corr[lag] = s / energy;
    }
    let best = minLag;
    for (let lag = minLag; lag <= maxLag; lag++) if (corr[lag] > corr[best]) best = lag;
    // Parabolic interpolation for sub-sample lag precision.
    const a = corr[best - 1];
    const b = corr[best];
    const c = corr[best + 1];
    const denom = a - 2 * b + c;
    const offset = denom !== 0 ? (0.5 * (a - c)) / denom : 0;
    const lag = best + Math.max(-0.5, Math.min(0.5, offset));
    let bpm = (60 * rate) / lag;
    // Fold into the club-typical 90..180 range.
    while (bpm < 90) bpm *= 2;
    while (bpm > 180) bpm /= 2;
    return { bpm: Math.round(bpm * 10) / 10, confidence: Math.max(0, Math.min(1, b)) };
  }
}
