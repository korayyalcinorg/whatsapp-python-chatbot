import type { PortalSpec, WorldDefinition, WorldId } from '../worlds/types';

export interface SelectionContext {
  current: WorldId;
  /** Most recent last. */
  history: readonly WorldId[];
  energy: number;
  random: () => number;
}

export interface WorldChoice {
  to: WorldId;
  portal: PortalSpec;
  score: number;
}

/** Penalty multipliers for worlds visited 1, 2, 3 ... steps ago. */
const RECENCY = [0.08, 0.35, 0.65, 0.85];

/**
 * Directed graph of worlds. Edges come from each world's exit portals; only
 * worlds that can actually render (have `create`) are reachable.
 */
export class WorldGraph {
  private readonly worlds = new Map<WorldId, WorldDefinition>();

  constructor(definitions: WorldDefinition[]) {
    for (const def of definitions) this.worlds.set(def.id, def);
  }

  get(id: WorldId): WorldDefinition | undefined {
    return this.worlds.get(id);
  }

  all(): WorldDefinition[] {
    return [...this.worlds.values()];
  }

  playable(): WorldDefinition[] {
    return this.all().filter((w) => w.status === 'prototype' && w.create);
  }

  isPlayable(id: WorldId): boolean {
    const w = this.worlds.get(id);
    return !!w && w.status === 'prototype' && !!w.create;
  }

  /** All (portal, target) edges leaving `id`, including not-yet-playable targets. */
  edges(id: WorldId): { portal: PortalSpec; to: WorldId }[] {
    const def = this.worlds.get(id);
    if (!def) return [];
    return def.exitPortals.flatMap((portal) => portal.leadsTo.map((to) => ({ portal, to })));
  }

  /** Portal of `from` that leads to `to`, or the first portal as a generic doorway. */
  portalTo(from: WorldId, to: WorldId): PortalSpec | undefined {
    const def = this.worlds.get(from);
    return def?.exitPortals.find((p) => p.leadsTo.includes(to)) ?? def?.exitPortals[0];
  }

  /** Score every playable candidate. Exposed for the control panel and tests. */
  candidates(ctx: SelectionContext): WorldChoice[] {
    const out: WorldChoice[] = [];
    // The director's history ends with the current world; recency counts from the one before.
    const past = ctx.history[ctx.history.length - 1] === ctx.current ? ctx.history.slice(0, -1) : ctx.history;
    for (const { portal, to } of this.edges(ctx.current)) {
      if (to === ctx.current || !this.isPlayable(to)) continue;
      const def = this.worlds.get(to)!;
      const preference = 1 + 0.15 * (portal.leadsTo.length - 1 - portal.leadsTo.indexOf(to));
      let recency = 1;
      for (let i = 0; i < RECENCY.length; i++) {
        if (past[past.length - 1 - i] === to) {
          recency = RECENCY[i];
          break;
        }
      }
      const [lo, hi] = def.rules.energyRange;
      const miss = ctx.energy < lo ? lo - ctx.energy : ctx.energy > hi ? ctx.energy - hi : 0;
      const energyFit = Math.max(0.2, 1 - miss * 2);
      const score = preference * recency * energyFit;
      const existing = out.find((c) => c.to === to);
      if (!existing) out.push({ to, portal, score });
      else if (score > existing.score) Object.assign(existing, { portal, score });
    }
    return out;
  }

  /** Weighted random pick of the next world, or null if the current world is a dead end. */
  chooseNext(ctx: SelectionContext): WorldChoice | null {
    const options = this.candidates(ctx);
    if (options.length === 0) {
      // Dead end (e.g. fallback world): jump to any playable world not just visited.
      const any = this.playable().filter((w) => w.id !== ctx.current);
      if (any.length === 0) return null;
      const pick = any[Math.floor(ctx.random() * any.length)];
      const portal = this.worlds.get(ctx.current)?.exitPortals[0] ?? {
        id: 'cut',
        object: 'screen',
        transition: 'infinite-zoom-in',
        leadsTo: [pick.id],
      };
      return { to: pick.id, portal, score: 0 };
    }
    const total = options.reduce((s, o) => s + o.score, 0);
    let roll = ctx.random() * total;
    for (const option of options) {
      roll -= option.score;
      if (roll <= 0) return option;
    }
    return options[options.length - 1];
  }
}
