import { describe, expect, it } from 'vitest';
import { WorldGraph } from '../src/journey/WorldGraph';
import { WORLD_LIBRARY } from '../src/worlds/registry';
import type { WorldId } from '../src/worlds/types';

const graph = new WorldGraph(WORLD_LIBRARY);

function seeded(seed: number): () => number {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

describe('world library', () => {
  it('defines all 12 worlds with unique ids, plus the fallback', () => {
    const ids = WORLD_LIBRARY.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.filter((id) => id !== 'safe-fallback')).toHaveLength(12);
  });

  it('only links to worlds that exist', () => {
    for (const w of WORLD_LIBRARY) {
      for (const p of w.exitPortals) for (const to of p.leadsTo) expect(graph.get(to), `${w.id} → ${to}`).toBeDefined();
    }
  });

  it('has exactly the three phase-2 worlds playable', () => {
    expect(graph.playable().map((w) => w.id).sort()).toEqual(['bubbleverse', 'dart-singularity', 'fractal-cathedral']);
  });

  it('connects the three prototypes into a cycle in both directions', () => {
    const proto: WorldId[] = ['bubbleverse', 'dart-singularity', 'fractal-cathedral'];
    for (const a of proto) for (const b of proto) if (a !== b) expect(graph.edges(a).some((e) => e.to === b), `${a} → ${b}`).toBe(true);
  });
});

describe('next world selection', () => {
  it('never picks the current world or a planned world', () => {
    const random = seeded(3);
    for (let i = 0; i < 200; i++) {
      const choice = graph.chooseNext({ current: 'bubbleverse', history: ['bubbleverse'], energy: random(), random });
      expect(choice).not.toBeNull();
      expect(choice!.to).not.toBe('bubbleverse');
      expect(graph.isPlayable(choice!.to)).toBe(true);
    }
  });

  it('avoids going straight back to the world just visited', () => {
    const random = seeded(11);
    let back = 0;
    const runs = 1000;
    for (let i = 0; i < runs; i++) {
      const c = graph.chooseNext({ current: 'dart-singularity', history: ['bubbleverse', 'dart-singularity'], energy: 0.5, random });
      if (c!.to === 'bubbleverse') back++;
    }
    expect(back / runs).toBeLessThan(0.2);
  });

  it('prefers worlds whose energy range matches the music', () => {
    // From the cathedral at very high energy, the dart world (0.4..1) should beat bubbleverse (0.15..0.7)... after recency is equal.
    const random = seeded(5);
    let dart = 0;
    for (let i = 0; i < 1000; i++) {
      const c = graph.chooseNext({ current: 'fractal-cathedral', history: ['fractal-cathedral'], energy: 1, random });
      if (c!.to === 'dart-singularity') dart++;
    }
    expect(dart).toBeGreaterThan(500);
  });

  it('escapes the fallback world, which has no exits', () => {
    const c = graph.chooseNext({ current: 'safe-fallback', history: [], energy: 0.5, random: seeded(1) });
    expect(c && graph.isPlayable(c.to)).toBe(true);
  });
});
