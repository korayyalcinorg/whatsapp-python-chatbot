import type { WorldDefinition } from '../types';

/** Planned (Phase 4). Definition only: the director never selects it until `create` exists. */
export const localeOrigin: WorldDefinition = {
  id: 'locale-origin',
  title: 'Locale Origin',
  status: 'planned',
  concept: 'The brand world: the Locale logo assembled from all other worlds; reserved for peak moments.',
  assets: [],
  cameraPath: { description: 'Pull back from the beer in the logo to reveal the whole badge, then dive into the dartboard inside it.', cruiseSeconds: 30 },
  entryPortal: { object: 'arrival', transition: 'scale-revelation' },
  exitPortals: [{ id: 'logo-dartboard', object: 'Dartboard inside the logo', transition: 'scale-revelation', leadsTo: ['dart-singularity', 'bubbleverse', 'eight-ball-universe'] }],
  rules: { minDwell: 18, maxDwell: 40, energyRange: [0.5, 1.0], transitionSeconds: 5 },
  variants: ['Neon Sign', 'Gold Leaf'],
  performance: { cost: 3, renderScale: 1 },
  brand: { appearance: 'object-surface', maxPerVisit: 1 },
};
