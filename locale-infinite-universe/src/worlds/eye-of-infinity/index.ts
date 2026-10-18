import type { WorldDefinition } from '../types';

/** Planned (Phase 4). Definition only: the director never selects it until `create` exists. */
export const eyeOfInfinity: WorldDefinition = {
  id: 'eye-of-infinity',
  title: 'Eye of Infinity',
  status: 'planned',
  concept: 'A macro iris; the pupil is a black hole lined with emerald and gold fibres.',
  assets: [],
  cameraPath: { description: 'Extreme macro push-in towards the pupil while the iris dilates on the beat.', cruiseSeconds: 30 },
  entryPortal: { object: 'arrival', transition: 'hole-to-universe' },
  exitPortals: [{ id: 'pupil', object: 'The pupil', transition: 'hole-to-universe', leadsTo: ['mirror-paradox', 'fractal-cathedral', 'time-machine'] }],
  rules: { minDwell: 18, maxDwell: 40, energyRange: [0.2, 0.7], transitionSeconds: 5 },
  variants: ['Emerald Iris', 'Golden Iris'],
  performance: { cost: 3, renderScale: 1 },
  brand: { appearance: 'portal-reveal', maxPerVisit: 1 },
};
