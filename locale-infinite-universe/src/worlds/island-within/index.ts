import type { WorldDefinition } from '../types';

/** Planned (Phase 4). Definition only: the director never selects it until `create` exists. */
export const islandWithin: WorldDefinition = {
  id: 'island-within',
  title: 'Island Within',
  status: 'planned',
  concept: 'Northern Cyprus coastline at night, Long Beach lights; the island sits inside a glass.',
  assets: [],
  cameraPath: { description: 'Sweep over the sea at dusk towards the shore lights; zoom out to find it is inside a pint glass.', cruiseSeconds: 30 },
  entryPortal: { object: 'arrival', transition: 'scale-revelation' },
  exitPortals: [{ id: 'shore-light', object: 'A shore light', transition: 'scale-revelation', leadsTo: ['bubbleverse', 'liquid-multiverse', 'locale-origin'] }],
  rules: { minDwell: 18, maxDwell: 40, energyRange: [0.0, 0.5], transitionSeconds: 5 },
  variants: ['Sunset', 'Moonlight'],
  performance: { cost: 4, renderScale: 1 },
  brand: { appearance: 'portal-reveal', maxPerVisit: 1 },
};
