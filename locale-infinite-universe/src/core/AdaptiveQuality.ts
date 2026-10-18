/**
 * Keeps the frame rate near the target by nudging a resolution multiplier.
 * Drops fast (a stutter on the LED wall is worse than slight softness) and
 * recovers slowly so it does not oscillate.
 */
export class AdaptiveQuality {
  scale = 1;
  enabled = true;
  private avgMs = 1000 / 60;
  private sinceChange = 0;

  constructor(
    private readonly targetFps = 60,
    private readonly minScale = 0.5,
  ) {}

  /** Feed one frame; returns true when `scale` changed. */
  sample(frameMs: number, delta: number): boolean {
    this.avgMs += (frameMs - this.avgMs) * 0.05;
    this.sinceChange += delta;
    if (!this.enabled) return false;
    const budget = 1000 / this.targetFps;
    if (this.avgMs > budget * 1.2 && this.sinceChange > 1.5 && this.scale > this.minScale) {
      this.scale = Math.max(this.minScale, +(this.scale - 0.1).toFixed(2));
      this.sinceChange = 0;
      return true;
    }
    // Frame intervals are vsync-bound, so "at target" is the best signal we get for headroom.
    if (this.avgMs < budget * 1.05 && this.sinceChange > 8 && this.scale < 1) {
      this.scale = Math.min(1, +(this.scale + 0.05).toFixed(2));
      this.sinceChange = 0;
      return true;
    }
    return false;
  }

  get averageFrameMs(): number {
    return this.avgMs;
  }
}
