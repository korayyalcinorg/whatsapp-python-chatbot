import type { WorldDefinition } from '../types';

/** Planned (Phase 4). Definition only: the director never selects it until `create` exists. */
export const mirrorParadox: WorldDefinition = {
  id: 'mirror-paradox',
  title: 'Mirror Paradox',
  status: 'planned',
  concept: 'Two facing bar mirrors create an infinite corridor; one reflection does not match.',
  assets: [],
  cameraPath: { description: 'Track along the corridor of reflections, then step into the wrong reflection.', cruiseSeconds: 30 },
  entryPortal: { object: 'arrival', transition: 'mirror-passage' },
  exitPortals: [{ id: 'mirror', object: 'The mismatched reflection', transition: 'mirror-passage', leadsTo: ['impossible-locale', 'eye-of-infinity', 'liquid-multiverse'] }],
  rules: { minDwell: 18, maxDwell: 40, energyRange: [0.2, 0.8], transitionSeconds: 5 },
  variants: ['Silver', 'Smoked Glass'],
  performance: { cost: 4, renderScale: 1 },
  brand: { appearance: 'portal-reveal', maxPerVisit: 1 },
};
