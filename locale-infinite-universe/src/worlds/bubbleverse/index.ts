import type { WorldDefinition } from '../types';
import { BubbleverseWorld } from './BubbleverseWorld';

export const bubbleverse: WorldDefinition = {
  id: 'bubbleverse',
  title: 'Bubbleverse',
  status: 'prototype',
  concept: 'Inside a pint of beer. Light pours through the foam, CO2 bubbles stream past; one huge bubble holds the next universe.',
  assets: ['procedural liquid shader', 'instanced bubble lens shader'],
  cameraPath: { description: 'Slow upward drift through the glass with a lazy sway, then a dive into the hero bubble.', cruiseSeconds: 30 },
  entryPortal: { object: 'foam light', transition: 'object-interior' },
  exitPortals: [
    { id: 'hero-bubble', object: 'Hero bubble', transition: 'object-interior', leadsTo: ['dart-singularity', 'fractal-cathedral', 'eight-ball-universe', 'liquid-multiverse'] },
  ],
  rules: { minDwell: 18, maxDwell: 40, energyRange: [0.15, 0.7], transitionSeconds: 5 },
  variants: ['Locale Lager', 'Burgundy Ale', 'Emerald Night'],
  performance: { cost: 2, renderScale: 1 },
  brand: { appearance: 'portal-reveal', maxPerVisit: 1 },
  create: (ctx) => new BubbleverseWorld(ctx),
};
