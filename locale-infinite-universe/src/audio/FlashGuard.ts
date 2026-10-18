/**
 * Photosensitivity guard. Every beat-driven brightness pulse goes through
 * here so the wall can never flash more than `maxPerSecond` times a second
 * (WCAG 2.3.1 general flash threshold is 3) and never jumps to full white.
 */
export class FlashGuard {
  private value = 0;
  private sinceLast = Infinity;

  constructor(
    public maxPerSecond = 3,
    public maxAmplitude = 0.6,
    private readonly decayPerSecond = 4,
  ) {}

  /** `trigger` is a requested pulse strength (0 = none). Returns the safe pulse value. */
  update(trigger: number, delta: number): number {
    this.sinceLast += delta;
    this.value = Math.max(0, this.value - delta * this.decayPerSecond);
    if (trigger > 0 && this.sinceLast >= 1 / this.maxPerSecond) {
      this.value = Math.max(this.value, Math.min(trigger, 1) * this.maxAmplitude);
      this.sinceLast = 0;
    }
    return this.value;
  }
}
