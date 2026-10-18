import type { WorldDefinition } from '../types';
import { DartSingularityWorld } from './DartSingularityWorld';

export const dartSingularity: WorldDefinition = {
  id: 'dart-singularity',
  title: 'Dart Singularity',
  status: 'prototype',
  concept: 'A neon ring tunnel ends at a turning dartboard. Darts land on the beat; the bullseye is a singularity that swallows the camera.',
  assets: ['generated regulation dartboard texture (Locale colours)', 'procedural darts', 'RoomEnvironment IBL'],
  cameraPath: { description: 'Spiral approach down the neon tunnel, then a straight dive into the bull.', cruiseSeconds: 28 },
  entryPortal: { object: 'end of neon tunnel', transition: 'infinite-zoom-in' },
  exitPortals: [
    { id: 'bullseye', object: 'Bullseye', transition: 'hole-to-universe', leadsTo: ['fractal-cathedral', 'bubbleverse', 'eye-of-infinity', 'stadium-beyond'] },
  ],
  rules: { minDwell: 16, maxDwell: 36, energyRange: [0.4, 1], transitionSeconds: 4.5 },
  variants: ['Locale Classic', 'Emerald Arena', 'Gold Rush'],
  performance: { cost: 3, renderScale: 1 },
  brand: { appearance: 'portal-reveal', maxPerVisit: 1 },
  create: (ctx) => new DartSingularityWorld(ctx),
};
