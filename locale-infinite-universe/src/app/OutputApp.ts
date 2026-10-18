import * as THREE from 'three';
import { AudioEngine, type AudioSettings } from '../audio/AudioEngine';
import { LOGO_URL, THEMES } from '../brand/brand';
import { ControlBus } from '../control/ControlBus';
import { ControlPanel } from '../control/ControlPanel';
import { DEFAULT_CONTROL_STATE, type ControlCommand, type ControlState, type OutputStatus } from '../control/ControlState';
import { AdaptiveQuality } from '../core/AdaptiveQuality';
import { AssetCache } from '../core/AssetCache';
import { Engine } from '../core/Engine';
import { log } from '../core/Logger';
import { resolveProfile, storeLedSize } from '../core/profiles';
import { QUALITY_PRESETS, isQualityPreset } from '../core/quality';
import { JourneyDirector } from '../journey/JourneyDirector';
import { Pipeline } from '../render/Pipeline';
import { createWorldGraph } from '../worlds/registry';
import type { WorldId } from '../worlds/types';

const STATE_KEY = 'locale-universe:state';

function loadState(): ControlState {
  try {
    const saved = JSON.parse(localStorage.getItem(STATE_KEY) ?? '{}') as Partial<ControlState>;
    return { ...DEFAULT_CONTROL_STATE, ...saved, blackout: false };
  } catch {
    return { ...DEFAULT_CONTROL_STATE };
  }
}

/** The LED output: owns rendering, audio and the authoritative control state. */
export class OutputApp {
  private readonly params = new URLSearchParams(window.location.search);
  private readonly profile = resolveProfile(this.params);
  readonly engine: Engine;
  private readonly state: ControlState;
  private readonly audio: AudioEngine;
  private readonly assets = new AssetCache();
  private readonly graph = createWorldGraph();
  readonly director: JourneyDirector;
  private pipeline: Pipeline;
  private readonly adaptive = new AdaptiveQuality(60);
  private readonly bus = new ControlBus();
  private readonly panel: ControlPanel;
  private readonly logo: THREE.Texture;
  private readonly taps: number[] = [];
  private energy = 0.5;
  private time = 0;
  /** ?simstep=0.1 → fixed simulated seconds per frame (headless screenshots / tests). */
  private readonly simStep = Number.parseFloat(this.params.get('simstep') ?? '') || null;

  constructor(container: HTMLElement) {
    log.installGlobalHandlers();
    this.state = loadState();
    const q = this.params.get('quality');
    if (isQualityPreset(q) || !localStorage.getItem(STATE_KEY)) this.state.quality = this.profile.quality;
    const logo = Number.parseFloat(this.params.get('logo') ?? '');
    if (Number.isFinite(logo)) this.state.logoFrequency = THREE.MathUtils.clamp(logo, 0, 1);

    this.engine = new Engine(container, this.profile);
    const renderer = this.engine.renderer;
    renderer.info.autoReset = false;

    const state = this.state;
    const settings: AudioSettings = {
      get sensitivity() { return state.audioSensitivity; },
      get manualBpm() { return state.manualBpm; },
      get lockBpm() { return state.lockBpm; },
    };
    this.audio = new AudioEngine(settings);

    this.logo = this.assets.load('logo', LOGO_URL);
    const start = (this.params.get('world') as WorldId | null) ?? 'bubbleverse';
    this.director = new JourneyDirector(this.graph, renderer, this.assets, QUALITY_PRESETS[this.state.quality], start);
    const variant = Number.parseInt(this.params.get('variant') ?? '', 10);
    if (Number.isFinite(variant)) {
      this.director.forceVariant = variant;
      this.director.rebuildCurrent();
    }
    const hold = Number.parseFloat(this.params.get('hold') ?? '');
    if (Number.isFinite(hold)) {
      this.director.holdAt = hold;
      this.state.autoJourney = false;
      const target = this.params.get('to') as WorldId | null;
      window.setTimeout(() => (target ? this.director.goTo(target) : this.director.nextPortal()), 1500);
    }
    this.pipeline = new Pipeline(renderer, QUALITY_PRESETS[this.state.quality], this.logo);
    this.adaptive.enabled = this.state.adaptiveQuality;

    this.engine.onResize((w, h) => {
      this.pipeline.resize(w, h);
      this.director.resize(w, h);
    });
    this.engine.onContextRestored(() => {
      this.pipeline.dispose();
      this.pipeline = new Pipeline(renderer, QUALITY_PRESETS[this.state.quality], this.logo);
      this.director.rebuildCurrent();
    });

    this.panel = new ControlPanel(this.bus, 'embedded', () => void this.toggleFullscreen());
    this.panel.setVisible(this.profile.showPanel);
    document.body.append(this.panel.root);
    this.bus.onCommand((c) => this.handle(c));
    this.installInput();
    window.setInterval(() => this.publish(), 250);

    log.info(`Output started: profile ${this.profile.id}, quality ${this.state.quality}`);
    this.engine.start((time, delta) => {
      if (this.simStep) this.frame(this.time + this.simStep, this.simStep);
      else this.frame(time, delta);
    });
  }

  private frame(time: number, delta: number): void {
    this.time = time;
    const renderer = this.engine.renderer;
    renderer.info.reset();
    const audio = this.audio.update(time, delta);

    // Energy: follow the music (slow envelope) or the DJ's fader.
    const target =
      this.state.energyMode === 'manual'
        ? this.state.energy
        : this.audio.mode === 'input'
          ? THREE.MathUtils.clamp(audio.level * 1.5 + audio.onset * 0.3, 0, 1)
          : 0.5 + 0.2 * Math.sin(time / 47);
    this.energy += (target - this.energy) * Math.min(1, delta * (this.state.energyMode === 'manual' ? 4 : 0.5));
    if (this.state.energyMode === 'auto') this.state.energy = this.energy;

    this.director.update({
      delta,
      audio,
      energy: this.energy,
      speed: this.state.speed,
      autoJourney: this.state.autoJourney,
      logoFrequency: this.state.logoFrequency,
      transitionIntensity: this.state.transitionIntensity,
    });
    this.pipeline.render(this.director, {
      time,
      delta,
      beat: audio.beat,
      bass: audio.bass,
      theme: THEMES[this.state.theme] ?? THEMES['locale-classic'],
      blackout: this.state.blackout,
      transitionIntensity: this.state.transitionIntensity,
    });

    if (this.adaptive.sample(this.engine.stats.frameMs, delta)) {
      this.pipeline.adaptiveScale = this.adaptive.scale;
      log.info(`Adaptive render scale ${Math.round(this.adaptive.scale * 100)}%`);
    }
  }

  private handle(command: ControlCommand): void {
    switch (command.type) {
      case 'set': {
        const prevQuality = this.state.quality;
        Object.assign(this.state, command.patch);
        if (this.state.quality !== prevQuality && isQualityPreset(this.state.quality)) {
          const q = QUALITY_PRESETS[this.state.quality];
          this.pipeline.setQuality(q);
          this.director.setQuality(q);
          log.info(`Quality preset: ${this.state.quality}`);
        }
        this.adaptive.enabled = this.state.adaptiveQuality;
        if (!this.adaptive.enabled) this.pipeline.adaptiveScale = this.adaptive.scale = 1;
        this.save();
        break;
      }
      case 'next-portal':
        this.director.nextPortal();
        break;
      case 'go-to-world':
        this.director.goTo(command.world);
        break;
      case 'audio-input':
        if (command.deviceId === null) {
          this.audio.disableInput();
          log.info('Audio: auto visual mode');
        } else {
          this.audio
            .enableInput(command.deviceId === 'default' ? undefined : command.deviceId)
            .catch((err) => log.error('Audio input failed', err));
        }
        break;
      case 'tap-tempo':
        this.tap();
        break;
      case 'led-size':
        storeLedSize(command.size);
        this.engine.setFixedSize(command.size ?? undefined);
        log.info(command.size ? `LED output ${command.size.width}×${command.size.height}` : 'LED output follows window');
        break;
      case 'request-status':
        this.publish();
        break;
    }
    this.publish();
  }

  private tap(): void {
    const now = performance.now();
    if (this.taps.length && now - this.taps[this.taps.length - 1] > 2000) this.taps.length = 0;
    this.taps.push(now);
    if (this.taps.length > 6) this.taps.shift();
    if (this.taps.length >= 3) {
      const span = (this.taps[this.taps.length - 1] - this.taps[0]) / (this.taps.length - 1);
      this.state.manualBpm = Math.round((60000 / span) * 2) / 2;
      this.save();
    }
  }

  private save(): void {
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(this.state));
    } catch {
      // ignore
    }
  }

  private publish(): void {
    const r = this.engine.renderer.info;
    const d = this.director;
    const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
    const a = this.audio.features;
    const status: OutputStatus = {
      state: { ...this.state },
      world: d.current.def.id,
      worldTitle: `${d.current.def.title}${d.current.def.variants.length ? ` · ${d.current.def.variants[d.current.variant % d.current.def.variants.length]}` : ''}`,
      next: d.next?.def.id ?? null,
      phase: d.phase,
      transitionProgress: d.transition?.progress ?? 0,
      history: [...d.history],
      fps: this.engine.stats.fps,
      frameMs: this.engine.stats.frameMs,
      outputSize: `${this.engine.stats.width}×${this.engine.stats.height}`,
      renderScale: this.pipeline.renderScale,
      drawCalls: r.render.calls,
      triangles: r.render.triangles,
      geometries: r.memory.geometries,
      textures: r.memory.textures,
      heapMb: mem ? mem.usedJSHeapSize / 1048576 : null,
      audio: {
        mode: this.audio.mode,
        device: this.audio.deviceLabel,
        level: a.level,
        bass: a.bass,
        mid: a.mid,
        high: a.high,
        onset: a.onset,
        beat: a.beat,
        bpm: a.bpm,
        bpmEstimate: this.audio.estimate.bpm,
        confidence: this.audio.estimate.confidence,
      },
      playable: this.graph.playable().map((w) => ({ id: w.id, title: w.title })),
      planned: this.graph.all().filter((w) => w.status === 'planned').map((w) => ({ id: w.id, title: w.title })),
      logs: log.recent.slice(-30).map((l) => ({ ...l })),
    };
    this.bus.publish(status);
  }

  private installInput(): void {
    this.engine.canvas.addEventListener('pointerdown', () => {
      this.audio.resume();
      if (this.profile.id === 'led' && !document.fullscreenElement) void this.toggleFullscreen();
      else this.panel.setVisible(!this.panel.visible);
    });
    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      const key = e.key.toLowerCase();
      if (key === 'p' || key === 'h') this.panel.setVisible(!this.panel.visible);
      else if (key === 'f') void this.toggleFullscreen();
      else if (key === 'n' || e.key === ' ') this.handle({ type: 'next-portal' });
      else if (key === 'b') this.handle({ type: 'set', patch: { blackout: !this.state.blackout } });
      else if (key === 't') this.handle({ type: 'tap-tempo' });
    });
  }

  private async toggleFullscreen(): Promise<void> {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      await (navigator as Navigator & { wakeLock?: { request(type: 'screen'): Promise<unknown> } }).wakeLock?.request('screen');
    } catch (err) {
      log.warn(`Fullscreen unavailable: ${(err as Error).message ?? err}`);
    }
  }

  /** Seconds since start, for debugging from the console. */
  get elapsed(): number {
    return this.time;
  }
}
