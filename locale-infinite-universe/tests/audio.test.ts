import { describe, expect, it } from 'vitest';
import { FlashGuard } from '../src/audio/FlashGuard';
import { TempoEstimator } from '../src/audio/TempoEstimator';

describe('FlashGuard', () => {
  it('allows at most 3 pulses per second even if every frame requests one', () => {
    const guard = new FlashGuard(3, 0.6);
    let pulses = 0;
    let prev = 0;
    for (let frame = 0; frame < 600; frame++) {
      const v = guard.update(1, 1 / 60); // 10 s of constant triggering
      if (v > prev + 0.05) pulses++;
      prev = v;
    }
    expect(pulses).toBeLessThanOrEqual(31);
  });

  it('caps amplitude', () => {
    const guard = new FlashGuard(3, 0.6);
    expect(guard.update(5, 0.016)).toBeLessThanOrEqual(0.6);
  });
});

describe('TempoEstimator', () => {
  for (const bpm of [100, 124, 128, 140, 174]) {
    it(`finds ${bpm} BPM in a synthetic kick envelope`, () => {
      const est = new TempoEstimator();
      const dt = 1 / 60;
      for (let t = 0; t < 10; t += dt) {
        const phase = (t * bpm) / 60;
        const onset = Math.exp(-(phase - Math.floor(phase)) * 25); // sharp kick
        est.push(onset + Math.random() * 0.05, dt);
      }
      const r = est.estimate();
      expect(Math.abs(r.bpm - bpm)).toBeLessThan(bpm * 0.03);
      expect(r.confidence).toBeGreaterThan(0.35);
    });
  }

  it('reports low confidence for noise', () => {
    const est = new TempoEstimator();
    for (let i = 0; i < 600; i++) est.push(Math.random(), 1 / 60);
    expect(est.estimate().confidence).toBeLessThan(0.35);
  });
});
