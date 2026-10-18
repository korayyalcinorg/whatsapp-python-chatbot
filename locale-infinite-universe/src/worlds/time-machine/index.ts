import type { WorldDefinition } from '../types';

/** Planned (Phase 4). Definition only: the director never selects it until `create` exists. */
export const timeMachine: WorldDefinition = {
  id: 'time-machine',
  title: 'Time Machine',
  status: 'planned',
  concept: 'Clockwork of beer taps and bar stools; time rewinds the night in loops.',
  assets: [],
  cameraPath: { description: 'Spiral down a clock tunnel; the hands align and open.', cruiseSeconds: 30 },
  entryPortal: { object: 'arrival', transition: 'infinite-zoom-out' },
  exitPortals: [{ id: 'clock-face', object: 'Clock centre', transition: 'infinite-zoom-out', leadsTo: ['locale-origin', 'fractal-cathedral', 'eye-of-infinity'] }],
  rules: { minDwell: 18, maxDwell: 40, energyRange: [0.3, 0.8], transitionSeconds: 5 },
  variants: ['Brass', 'Neon'],
  performance: { cost: 3, renderScale: 1 },
  brand: { appearance: 'portal-reveal', maxPerVisit: 1 },
};
