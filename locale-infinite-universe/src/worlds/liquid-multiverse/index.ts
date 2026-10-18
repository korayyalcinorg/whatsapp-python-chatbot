import type { WorldDefinition } from '../types';

/** Planned (Phase 4). Definition only: the director never selects it until `create` exists. */
export const liquidMultiverse: WorldDefinition = {
  id: 'liquid-multiverse',
  title: 'Liquid Multiverse',
  status: 'planned',
  concept: 'Emerald, burgundy and gold liquids twist like galaxies (moodboard: liquid swirl).',
  assets: [],
  cameraPath: { description: 'Drift through slow-motion liquid ribbons; a droplet becomes a world.', cruiseSeconds: 30 },
  entryPortal: { object: 'arrival', transition: 'object-interior' },
  exitPortals: [{ id: 'droplet', object: 'A suspended droplet', transition: 'object-interior', leadsTo: ['bubbleverse', 'island-within', 'locale-origin'] }],
  rules: { minDwell: 18, maxDwell: 40, energyRange: [0.3, 0.9], transitionSeconds: 5 },
  variants: ['Pour', 'Splash'],
  performance: { cost: 4, renderScale: 1 },
  brand: { appearance: 'portal-reveal', maxPerVisit: 1 },
};
