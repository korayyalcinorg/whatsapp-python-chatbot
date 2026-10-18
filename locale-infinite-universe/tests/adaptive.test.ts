import { describe, expect, it } from 'vitest';
import { AdaptiveQuality } from '../src/core/AdaptiveQuality';

describe('AdaptiveQuality', () => {
  it('lowers the scale when frames are slow and recovers when at target', () => {
    const aq = new AdaptiveQuality(60, 0.5);
    for (let i = 0; i < 600; i++) aq.sample(33, 1 / 30); // 20 s at 30 fps
    expect(aq.scale).toBe(0.5);
    for (let i = 0; i < 60 * 120; i++) aq.sample(16.7, 1 / 60); // 2 min at 60 fps
    expect(aq.scale).toBe(1);
  });
});
