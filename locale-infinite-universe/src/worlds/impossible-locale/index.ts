import type { WorldDefinition } from '../types';

/** Planned (Phase 4). Definition only: the director never selects it until `create` exists. */
export const impossibleLocale: WorldDefinition = {
  id: 'impossible-locale',
  title: 'Impossible Locale',
  status: 'planned',
  concept: 'The bar itself as Escher architecture: stairs, taps and screens loop back on themselves.',
  assets: [],
  cameraPath: { description: 'Glide through bar interior; the camera turns a corner and arrives where it started, one level deeper.', cruiseSeconds: 30 },
  entryPortal: { object: 'arrival', transition: 'impossible-architecture' },
  exitPortals: [{ id: 'tv-screen', object: 'A TV screen above the bar', transition: 'impossible-architecture', leadsTo: ['stadium-beyond', 'mirror-paradox', 'locale-origin'] }],
  rules: { minDwell: 18, maxDwell: 40, energyRange: [0.3, 0.8], transitionSeconds: 5 },
  variants: ['Happy Hour', 'Closing Time'],
  performance: { cost: 4, renderScale: 1 },
  brand: { appearance: 'portal-reveal', maxPerVisit: 1 },
};
