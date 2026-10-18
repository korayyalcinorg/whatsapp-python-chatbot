import type { AudioInput } from '../audio/AudioInput';
import type { Engine } from '../core/Engine';
import type { DisplayProfile } from '../core/profiles';

export interface HudState {
  speed: number;
}

/**
 * Minimal touch-friendly control overlay. Tap anywhere on the visuals to
 * show / hide it; on desktop H toggles it as well.
 */
export class Hud {
  private readonly root: HTMLDivElement;
  private readonly info: HTMLDivElement;
  private readonly micButton: HTMLButtonElement;
  private visible: boolean;

  constructor(
    private readonly engine: Engine,
    private readonly audio: AudioInput,
    private readonly profile: DisplayProfile,
    private readonly state: HudState,
  ) {
    this.visible = profile.showHud;
    this.root = document.createElement('div');
    this.root.className = 'hud';
    this.root.innerHTML = `
      <div class="hud-title">LOCALE · INFINITE UNIVERSE</div>
      <div class="hud-info"></div>
      <div class="hud-row">
        <button data-action="fullscreen">⛶ Tam ekran</button>
        <button data-action="mic">🎤 Mikrofon</button>
      </div>
      <div class="hud-row">
        <button data-action="slower">− Hız</button>
        <button data-action="faster">+ Hız</button>
        <button data-action="audio-off">Ses: kapat/demo</button>
      </div>
      <div class="hud-hint">Gizlemek için ekrana dokun · Klavye: H, F, M, ←/→</div>`;
    this.info = this.root.querySelector('.hud-info')!;
    this.micButton = this.root.querySelector('[data-action="mic"]')!;
    document.body.appendChild(this.root);
    injectStyles();

    this.root.addEventListener('click', this.handleClick);
    this.root.addEventListener('pointerdown', (e) => e.stopPropagation());
    engine.canvas.addEventListener('pointerdown', () => this.toggle());
    window.addEventListener('keydown', this.handleKey);
    this.applyVisibility();
    window.setInterval(() => this.refresh(), 500);
  }

  toggle(force?: boolean): void {
    this.visible = force ?? !this.visible;
    this.applyVisibility();
  }

  private applyVisibility(): void {
    this.root.style.display = this.visible ? 'block' : 'none';
    document.body.style.cursor = this.visible ? 'default' : 'none';
    if (this.visible) this.refresh();
  }

  private refresh(): void {
    if (!this.visible) return;
    const { fps, width, height } = this.engine.stats;
    this.info.textContent =
      `${fps.toFixed(0)} FPS · ${width}×${height} · profil: ${this.profile.id} · ` +
      `hız: ${this.state.speed.toFixed(2)}× · ses: ${this.audio.source}`;
    this.micButton.textContent = this.audio.source === 'mic' ? '🎤 Mikrofonu kapat' : '🎤 Mikrofon';
  }

  private readonly handleClick = (event: MouseEvent): void => {
    const action = (event.target as HTMLElement).closest('button')?.dataset.action;
    if (action) void this.run(action);
  };

  private readonly handleKey = (event: KeyboardEvent): void => {
    const map: Record<string, string> = {
      h: 'toggle', f: 'fullscreen', m: 'mic', ArrowLeft: 'slower', ArrowRight: 'faster',
    };
    const action = map[event.key] ?? map[event.key.toLowerCase()];
    if (action) void this.run(action);
  };

  private async run(action: string): Promise<void> {
    switch (action) {
      case 'toggle':
        this.toggle();
        break;
      case 'fullscreen':
        await toggleFullscreen();
        break;
      case 'mic':
        if (this.audio.source === 'mic') {
          this.audio.disableMic();
        } else {
          try {
            await this.audio.enableMic();
          } catch (err) {
            alert(`Mikrofon açılamadı: ${(err as Error).message}`);
          }
        }
        break;
      case 'slower':
        this.state.speed = Math.max(0, +(this.state.speed - 0.25).toFixed(2));
        break;
      case 'faster':
        this.state.speed = Math.min(4, +(this.state.speed + 0.25).toFixed(2));
        break;
      case 'audio-off':
        if (this.audio.source === 'mic') this.audio.disableMic();
        this.audio.source = this.audio.source === 'off' ? 'demo' : 'off';
        break;
    }
    this.refresh();
  }
}

async function toggleFullscreen(): Promise<void> {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    // Keep phones and the LED PC from dimming / sleeping during a set.
    await (navigator as Navigator & { wakeLock?: { request(type: 'screen'): Promise<unknown> } })
      .wakeLock?.request('screen');
  } catch {
    // iOS Safari has no Fullscreen API for pages; "Add to Home Screen" is the workaround.
  }
}

function injectStyles(): void {
  const style = document.createElement('style');
  style.textContent = `
    .hud { position: fixed; left: max(12px, env(safe-area-inset-left)); top: max(12px, env(safe-area-inset-top));
      max-width: min(420px, calc(100vw - 24px)); padding: 12px 14px; border-radius: 12px;
      background: rgba(8, 6, 20, 0.72); color: #e9e4ff; backdrop-filter: blur(8px);
      font: 13px/1.4 system-ui, -apple-system, sans-serif; z-index: 10; }
    .hud-title { font-weight: 700; letter-spacing: 0.12em; font-size: 12px; color: #ff7ad9; }
    .hud-info { margin: 6px 0 8px; font-variant-numeric: tabular-nums; opacity: 0.9; }
    .hud-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 6px; }
    .hud button { flex: 1 1 auto; min-height: 40px; padding: 8px 10px; border: 1px solid rgba(255,255,255,0.18);
      border-radius: 8px; background: rgba(255,255,255,0.08); color: inherit; font: inherit; cursor: pointer; }
    .hud button:active { background: rgba(255,122,217,0.3); }
    .hud-hint { font-size: 11px; opacity: 0.6; }
  `;
  document.head.appendChild(style);
}
