import type { WorldDefinition } from '../types';

/** Planned (Phase 4). Definition only: the director never selects it until `create` exists. */
export const eightBallUniverse: WorldDefinition = {
  id: 'eight-ball-universe',
  title: 'Eight Ball Universe',
  status: 'planned',
  concept: 'The number 8 on a pool ball opens into a planet-sized eight ball; its galaxy is a rack of planets.',
  assets: [],
  cameraPath: { description: 'Orbiting a giant glossy 8-ball, then sliding into the white circle around the 8.', cruiseSeconds: 30 },
  entryPortal: { object: 'arrival', transition: 'object-interior' },
  exitPortals: [{ id: 'number-8 circle', object: 'The 8 on the ball', transition: 'object-interior', leadsTo: ['impossible-locale', 'stadium-beyond', 'bubbleverse'] }],
  rules: { minDwell: 18, maxDwell: 40, energyRange: [0.4, 0.9], transitionSeconds: 5 },
  variants: ['Midnight Felt', 'Chrome', 'Burgundy Rack'],
  performance: { cost: 3, renderScale: 1 },
  brand: { appearance: 'portal-reveal', maxPerVisit: 1 },
};
