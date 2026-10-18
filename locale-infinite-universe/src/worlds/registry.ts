import { WorldGraph } from '../journey/WorldGraph';
import { bubbleverse } from './bubbleverse';
import { dartSingularity } from './dart-singularity';
import { eightBallUniverse } from './eight-ball-universe';
import { impossibleLocale } from './impossible-locale';
import { eyeOfInfinity } from './eye-of-infinity';
import { mirrorParadox } from './mirror-paradox';
import { stadiumBeyond } from './stadium-beyond';
import { liquidMultiverse } from './liquid-multiverse';
import { fractalCathedral } from './fractal-cathedral';
import { timeMachine } from './time-machine';
import { islandWithin } from './island-within';
import { localeOrigin } from './locale-origin';
import { safeFallback } from './safe-fallback';
import type { WorldDefinition } from './types';

/** The 12-world library in canonical order, plus the safety net. */
export const WORLD_LIBRARY: WorldDefinition[] = [
  bubbleverse,
  dartSingularity,
  eightBallUniverse,
  impossibleLocale,
  eyeOfInfinity,
  mirrorParadox,
  stadiumBeyond,
  liquidMultiverse,
  fractalCathedral,
  timeMachine,
  islandWithin,
  localeOrigin,
  safeFallback,
];

export function createWorldGraph(): WorldGraph {
  return new WorldGraph(WORLD_LIBRARY);
}
