import type { WorldDefinition } from '../types';
import { FractalCathedralWorld } from './FractalCathedralWorld';

export const fractalCathedral: WorldDefinition = {
  id: 'fractal-cathedral',
  title: 'Fractal Cathedral',
  status: 'prototype',
  concept: 'An endless gothic nave whose arcades contain smaller arcades. Stained glass in Locale colours; a rose window floats ahead, never closer, until it opens.',
  assets: ['raymarched SDF shader (no meshes)'],
  cameraPath: { description: 'Steady procession down the nave with slow sway; final ascent into the rose window.', cruiseSeconds: 32 },
  entryPortal: { object: 'rose window light', transition: 'fractal-recursion' },
  exitPortals: [
    { id: 'rose-window', object: 'Rose window', transition: 'fractal-recursion', leadsTo: ['bubbleverse', 'dart-singularity', 'mirror-paradox', 'time-machine'] },
  ],
  rules: { minDwell: 20, maxDwell: 45, energyRange: [0, 0.6], transitionSeconds: 6 },
  variants: ['Emerald Vespers', 'White Gold', 'Burgundy Mass'],
  performance: { cost: 4, renderScale: 0.75 },
  brand: { appearance: 'portal-reveal', maxPerVisit: 1 },
  create: (ctx) => new FractalCathedralWorld(ctx),
};
