import * as THREE from 'three';
import type { AssetCache } from '../core/AssetCache';
import { log } from '../core/Logger';
import type { QualitySettings } from '../core/quality';
import type { AudioFeatures } from '../core/types';
import type { PortalSpec, TransitionType, WorldDefinition, WorldId, WorldInstance } from '../worlds/types';
import type { WorldGraph } from './WorldGraph';

export interface LiveWorld {
  def: WorldDefinition;
  instance: WorldInstance;
  /** Seconds this world has been running (including pre-roll inside a portal). */
  time: number;
  variant: number;
}

export interface Transition {
  to: WorldId;
  portal: PortalSpec;
  type: TransitionType;
  progress: number;
  duration: number;
  brandReveal: boolean;
}

export interface DirectorInput {
  delta: number;
  audio: AudioFeatures;
  energy: number;
  speed: number;
  autoJourney: boolean;
  logoFrequency: number;
  transitionIntensity: number;
}

const PREPARE_LEAD = 3; // seconds before a portal opens that the next world is built
const BEAT_WAIT_MAX = 1.5;
const FALLBACK: WorldId = 'safe-fallback';

/**
 * Runs the endless journey: decides when to leave a world, which world comes
 * next (via WorldGraph), builds it ahead of time, drives the portal transition
 * and swaps worlds. Rendering is done by the Pipeline.
 */
export class JourneyDirector {
  current!: LiveWorld;
  next: LiveWorld | null = null;
  transition: Transition | null = null;
  phase: 'cruise' | 'preparing' | 'transition' = 'cruise';
  readonly history: WorldId[] = [];
  /** Debug / screenshot aid: freeze a running transition at this progress. */
  holdAt: number | null = null;
  /** Debug: force a visual variant for every world built. */
  forceVariant: number | null = null;

  private elapsed = 0;
  private dwell = 30;
  private waitedForBeat = 0;
  private pendingTarget: WorldId | null = null;
  private advanceNow = false;
  private brandShownThisVisit = 0;
  private readonly broken = new Set<WorldId>();
  private readonly lastVariant = new Map<WorldId, number>();
  private width = 1;
  private height = 1;

  constructor(
    private readonly graph: WorldGraph,
    private readonly renderer: THREE.WebGLRenderer,
    private readonly assets: AssetCache,
    private quality: QualitySettings,
    start: WorldId,
    private readonly random: () => number = Math.random,
  ) {
    const first = graph.isPlayable(start) ? start : graph.playable()[0]?.id ?? FALLBACK;
    this.current = this.build(first) ?? this.build(FALLBACK)!;
    this.enterWorld();
  }

  setQuality(quality: QualitySettings): void {
    this.quality = quality;
    this.rebuildCurrent();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.current.instance.resize(width, height);
    this.next?.instance.resize(width, height);
  }

  /** Jump towards a specific world through a portal (manual DJ choice). */
  goTo(world: WorldId): void {
    if (!this.graph.isPlayable(world)) {
      log.warn(`World ${world} is not playable yet`);
      return;
    }
    if (world === this.current.def.id && !this.transition) return;
    this.pendingTarget = world;
    this.advanceNow = true;
    if (this.phase === 'preparing' && this.next?.def.id !== world) this.dropNext();
  }

  /** Open the next portal as soon as possible. */
  nextPortal(): void {
    this.advanceNow = true;
  }

  /** After a WebGL context loss, rebuild GPU resources of the visible world. */
  rebuildCurrent(): void {
    this.dropNext();
    this.transition = null;
    this.phase = 'cruise';
    const id = this.current.def.id;
    this.safeDispose(this.current);
    this.current = this.build(id) ?? this.build(FALLBACK)!;
    this.current.instance.resize(this.width, this.height);
  }

  update(input: DirectorInput): void {
    const { delta } = input;
    this.elapsed += delta;

    if (this.phase === 'cruise') {
      const due = input.autoJourney && this.elapsed > this.dwell - PREPARE_LEAD;
      if (due || this.advanceNow) this.prepareNext(input.energy);
    }

    if (this.phase === 'preparing') {
      const due = this.advanceNow || (input.autoJourney && this.elapsed >= this.dwell);
      if (due) {
        this.waitedForBeat += delta;
        const onBeat = input.audio.beat > 0.3 || input.audio.phase < 0.08;
        if (onBeat || this.waitedForBeat > BEAT_WAIT_MAX || this.advanceNow) this.startTransition(input);
      }
    }

    // Update worlds.
    const exitProgress = this.transition ? this.transition.progress : null;
    this.step(this.current, input, exitProgress);
    if (this.transition && this.next) this.step(this.next, input, null);

    if (this.transition) {
      this.transition.progress = Math.min(1, this.transition.progress + delta / this.transition.duration);
      if (this.holdAt !== null) this.transition.progress = Math.min(this.transition.progress, this.holdAt);
      if (this.transition.progress >= 1) this.completeTransition();
    }
  }

  private prepareNext(energy: number): void {
    let target = this.pendingTarget;
    if (!target) {
      for (let attempt = 0; attempt < 4 && !target; attempt++) {
        const choice = this.graph.chooseNext({
          current: this.current.def.id,
          history: this.history,
          energy,
          random: this.random,
        });
        if (choice && !this.broken.has(choice.to)) target = choice.to;
      }
    }
    if (!target) {
      this.elapsed = 0; // nowhere to go; stay and retry after another dwell
      this.advanceNow = false;
      return;
    }
    const next = this.build(target);
    if (!next) {
      this.pendingTarget = null;
      return;
    }
    next.instance.resize(this.width, this.height);
    this.next = next;
    this.phase = 'preparing';
    this.waitedForBeat = 0;
  }

  private startTransition(input: DirectorInput): void {
    if (!this.next) return;
    const to = this.next.def.id;
    const portal = this.graph.portalTo(this.current.def.id, to) ?? {
      id: 'cut',
      object: 'screen',
      transition: 'infinite-zoom-in' as const,
      leadsTo: [to],
    };
    const speed = THREE.MathUtils.clamp(input.speed, 0.5, 2);
    const duration = (this.current.def.rules.transitionSeconds * (1.3 - 0.6 * input.transitionIntensity)) / speed;
    const brand = this.current.def.brand;
    const brandReveal =
      brand.appearance === 'portal-reveal' &&
      this.brandShownThisVisit < brand.maxPerVisit &&
      this.random() < input.logoFrequency;
    if (brandReveal) this.brandShownThisVisit++;
    this.transition = { to, portal, type: portal.transition, progress: 0, duration, brandReveal };
    this.phase = 'transition';
    this.advanceNow = false;
    this.pendingTarget = null;
    log.info(`Portal: ${this.current.def.id} → ${to} (${portal.transition}${brandReveal ? ', logo' : ''})`);
  }

  private completeTransition(): void {
    if (!this.next) return;
    this.safeDispose(this.current);
    this.current = this.next;
    this.next = null;
    this.transition = null;
    this.enterWorld();
  }

  private enterWorld(): void {
    this.history.push(this.current.def.id);
    if (this.history.length > 24) this.history.shift();
    this.phase = 'cruise';
    this.elapsed = 0;
    this.brandShownThisVisit = 0;
    const r = this.current.def.rules;
    this.dwell = THREE.MathUtils.lerp(r.maxDwell, r.minDwell, 0.5);
  }

  /** Called each frame so dwell reacts to the room's energy while cruising. */
  private refreshDwell(energy: number, speed: number): void {
    const r = this.current.def.rules;
    this.dwell = THREE.MathUtils.lerp(r.maxDwell, r.minDwell, energy) / THREE.MathUtils.clamp(speed, 0.5, 2);
  }

  private step(world: LiveWorld, input: DirectorInput, exitProgress: number | null): void {
    world.time += input.delta;
    if (world === this.current && this.phase === 'cruise') this.refreshDwell(input.energy, input.speed);
    try {
      world.instance.update({
        time: world.time,
        delta: input.delta,
        audio: input.audio,
        energy: input.energy,
        speed: input.speed,
        exitProgress,
      });
    } catch (err) {
      this.fail(world, err);
    }
  }

  private fail(world: LiveWorld, err: unknown): void {
    log.error(`World ${world.def.id} crashed`, err);
    this.broken.add(world.def.id);
    if (world === this.next) {
      this.dropNext();
      this.transition = null;
      this.phase = 'cruise';
      return;
    }
    this.dropNext();
    this.transition = null;
    this.safeDispose(this.current);
    this.current = this.build(FALLBACK)!;
    this.current.instance.resize(this.width, this.height);
    this.enterWorld();
  }

  private build(id: WorldId): LiveWorld | null {
    const def = this.graph.get(id);
    if (!def?.create) return null;
    const variants = Math.max(1, def.variants.length);
    let variant = Math.floor(this.random() * variants);
    if (variants > 1 && variant === this.lastVariant.get(id)) variant = (variant + 1) % variants;
    if (this.forceVariant !== null) variant = this.forceVariant % variants;
    this.lastVariant.set(id, variant);
    try {
      const instance = def.create({
        renderer: this.renderer,
        quality: this.quality,
        assets: this.assets,
        variant,
        seed: Math.floor(this.random() * 1e6),
      });
      // Compile shaders now so the portal does not stutter when it opens.
      this.renderer.compile(instance.scene, instance.camera);
      return { def, instance, time: 0, variant };
    } catch (err) {
      log.error(`Could not build world ${id}`, err);
      this.broken.add(id);
      return null;
    }
  }

  private dropNext(): void {
    if (this.next) this.safeDispose(this.next);
    this.next = null;
    if (this.phase === 'preparing') this.phase = 'cruise';
  }

  private safeDispose(world: LiveWorld): void {
    try {
      world.instance.dispose();
    } catch (err) {
      log.error(`Dispose ${world.def.id}`, err);
    }
  }
}
