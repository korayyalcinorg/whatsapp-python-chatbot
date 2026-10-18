import type { WorldDefinition } from '../types';

/** Planned (Phase 4). Definition only: the director never selects it until `create` exists. */
export const stadiumBeyond: WorldDefinition = {
  id: 'stadium-beyond',
  title: 'Stadium Beyond',
  status: 'planned',
  concept: 'A stadium at night seen from inside a football; floodlights, crowd waves and big screens.',
  assets: [],
  cameraPath: { description: 'Fly over the pitch, through the goal net, into the centre circle.', cruiseSeconds: 30 },
  entryPortal: { object: 'arrival', transition: 'scale-revelation' },
  exitPortals: [{ id: 'centre-circle', object: 'Centre circle', transition: 'scale-revelation', leadsTo: ['eight-ball-universe', 'dart-singularity', 'island-within'] }],
  rules: { minDwell: 18, maxDwell: 40, energyRange: [0.6, 1.0], transitionSeconds: 5 },
  variants: ['Match Night', 'Penalty Shootout'],
  performance: { cost: 4, renderScale: 1 },
  brand: { appearance: 'portal-reveal', maxPerVisit: 1 },
};
