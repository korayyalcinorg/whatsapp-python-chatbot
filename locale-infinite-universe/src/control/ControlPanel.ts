import { THEMES, type ThemeId } from '../brand/brand';
import { QUALITY_PRESETS, type QualityPreset } from '../core/quality';
import type { WorldId } from '../worlds/types';
import type { ControlBus } from './ControlBus';
import type { ControlState, OutputStatus } from './ControlState';
import './panel.css';

type Fader = { input: HTMLInputElement; output: HTMLOutputElement; format: (v: number) => string };

function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, ...children: (Node | string)[]): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else node.setAttribute(k, v);
  }
  node.append(...children);
  return node;
}

/**
 * DJ control surface. The same component runs embedded over the visuals
 * (phone / laptop preview) and standalone in control.html on a second screen.
 * It only sends commands and renders status; the output window owns the state.
 */
export class ControlPanel {
  readonly root: HTMLElement;
  private readonly faders = new Map<keyof ControlState, Fader>();
  private readonly toggles = new Map<keyof ControlState, HTMLButtonElement>();
  private readonly selects = new Map<keyof ControlState, HTMLSelectElement>();
  private readonly worldButtons = new Map<WorldId, HTMLButtonElement>();
  private readonly worldGrid = el('div', { class: 'lp-worlds' });
  private readonly now = el('div', { class: 'lp-now' });
  private readonly stats = el('dl', { class: 'lp-stats' });
  private readonly meters = el('div', { class: 'lp-meters' });
  private readonly meterBars = new Map<string, HTMLElement>();
  private readonly logBox = el('div', { class: 'lp-log', 'aria-live': 'polite' });
  private readonly bpmInput = el('input', { type: 'number', min: '60', max: '200', step: '0.5', id: 'lp-bpm', 'aria-label': 'Manual BPM' });
  private readonly bpmInfo = el('span', { class: 'lp-hint' });
  private readonly deviceSelect = el('select', { id: 'lp-device', 'aria-label': 'Audio input' });
  private readonly audioDot = el('span', { class: 'lp-status-dot' });
  private readonly ledW = el('input', { type: 'number', min: '320', max: '16384', id: 'lp-led-w', 'aria-label': 'LED width' });
  private readonly ledH = el('input', { type: 'number', min: '120', max: '16384', id: 'lp-led-h', 'aria-label': 'LED height' });
  private worldsKey = '';
  private lastStatus = 0;
  private readonly offline = el('div', { class: 'lp-offline', role: 'status' }, 'LED output is not running. Press “LED Fullscreen Output” or open the output page in this browser.');

  constructor(
    private readonly bus: ControlBus,
    private readonly mode: 'embedded' | 'standalone',
    private readonly onFullscreen: () => void,
  ) {
    // lang=en: control names are English DJ terms; also avoids Turkish dotted-İ in uppercase labels.
    this.root = el('div', { class: `lp lp-${mode}`, role: 'region', 'aria-label': 'Locale DJ control', lang: 'en' });
    this.build();
    bus.onStatus((s) => this.render(s));
    window.setInterval(() => (this.offline.hidden = performance.now() - this.lastStatus < 2000), 1000);
    bus.send({ type: 'request-status' });
    void this.refreshDevices();
  }

  setVisible(visible: boolean): void {
    this.root.hidden = !visible;
  }

  get visible(): boolean {
    return !this.root.hidden;
  }

  private set(patch: Partial<ControlState>): void {
    this.bus.send({ type: 'set', patch });
  }

  private build(): void {
    const head = el('div', { class: 'lp-head' }, el('div', { class: 'lp-brand' }, 'Locale · Infinite Universe'));
    if (this.mode === 'embedded') {
      const close = el('button', { type: 'button', 'aria-label': 'Paneli kapat', style: 'flex:0 0 auto' }, '✕');
      close.addEventListener('click', () => this.setVisible(false));
      head.append(close);
    }
    const grid = el('div', { class: 'lp-grid' });
    grid.append(this.journeyCard(), this.lookCard(), this.audioCard(), this.outputCard(), this.performanceCard());
    this.offline.hidden = this.mode === 'embedded';
    this.root.append(head, this.offline, this.now, grid);
  }

  private card(title: string, ...children: Node[]): HTMLElement {
    return el('section', { class: 'lp-card' }, el('h3', {}, title), ...children);
  }

  private toggle(key: keyof ControlState, label: string, extraClass = ''): HTMLButtonElement {
    const button = el('button', { type: 'button', 'aria-pressed': 'false', class: extraClass, id: `lp-${key}` }, label);
    button.addEventListener('click', () => {
      const on = button.getAttribute('aria-pressed') !== 'true';
      button.setAttribute('aria-pressed', String(on));
      this.set({ [key]: on } as Partial<ControlState>);
    });
    this.toggles.set(key, button);
    return button;
  }

  private fader(key: keyof ControlState, label: string, min: number, max: number, step: number, format: (v: number) => string): HTMLElement {
    const input = el('input', { type: 'range', min: String(min), max: String(max), step: String(step), id: `lp-${key}` });
    const output = el('output', { for: `lp-${key}` });
    input.addEventListener('input', () => {
      output.textContent = format(Number(input.value));
      this.set({ [key]: Number(input.value) } as Partial<ControlState>);
    });
    this.faders.set(key, { input, output, format });
    return el('div', { class: 'lp-fader' }, el('span', {}, label), output, input);
  }

  private select<T extends string>(key: keyof ControlState, label: string, options: [T, string][]): HTMLElement {
    const select = el('select', { id: `lp-${key}` });
    for (const [value, text] of options) select.append(el('option', { value }, text));
    select.addEventListener('change', () => this.set({ [key]: select.value } as Partial<ControlState>));
    this.selects.set(key, select);
    return el('div', { class: 'lp-row' }, el('label', { for: `lp-${key}` }, label), select);
  }

  private journeyCard(): HTMLElement {
    const next = el('button', { type: 'button', class: 'lp-primary', id: 'lp-next' }, 'Next Portal ⟶');
    next.addEventListener('click', () => this.bus.send({ type: 'next-portal' }));
    return this.card(
      'Journey',
      el('div', { class: 'lp-row' }, this.toggle('autoJourney', 'Auto Journey'), next),
      el('div', { class: 'lp-hint' }, 'Manual World — dünyaya dokun, bir sonraki portal oraya açılır:'),
      this.worldGrid,
      this.fader('transitionIntensity', 'Transition Intensity', 0, 1, 0.01, (v) => `${Math.round(v * 100)}%`),
    );
  }

  private lookCard(): HTMLElement {
    const energyAuto = el('button', { type: 'button', 'aria-pressed': 'true', id: 'lp-energy-auto' }, 'Energy: Auto (müzik)');
    energyAuto.addEventListener('click', () => {
      const auto = energyAuto.getAttribute('aria-pressed') !== 'true';
      energyAuto.setAttribute('aria-pressed', String(auto));
      this.set({ energyMode: auto ? 'auto' : 'manual' });
    });
    this.toggles.set('energyMode', energyAuto);
    return this.card(
      'Look',
      el('div', { class: 'lp-row' }, energyAuto),
      this.fader('energy', 'Energy', 0, 1, 0.01, (v) => `${Math.round(v * 100)}%`),
      this.fader('speed', 'Visual Speed', 0.25, 2.5, 0.05, (v) => `${v.toFixed(2)}×`),
      this.select<ThemeId>('theme', 'Color Theme', Object.values(THEMES).map((t) => [t.id, t.title])),
      this.fader('logoFrequency', 'Logo Frequency', 0, 1, 0.05, (v) => (v === 0 ? 'off' : `${Math.round(v * 100)}%`)),
      el('div', { class: 'lp-row' }, this.toggle('blackout', 'Blackout', 'lp-danger')),
    );
  }

  private audioCard(): HTMLElement {
    this.deviceSelect.addEventListener('change', () => {
      const v = this.deviceSelect.value;
      this.bus.send({ type: 'audio-input', deviceId: v === 'auto' ? null : v });
      if (v !== 'auto') window.setTimeout(() => void this.refreshDevices(), 1500);
    });
    this.bpmInput.addEventListener('change', () => this.set({ manualBpm: Number(this.bpmInput.value) || 124 }));
    const tap = el('button', { type: 'button', id: 'lp-tap' }, 'Tap');
    tap.addEventListener('click', () => this.bus.send({ type: 'tap-tempo' }));
    for (const name of ['bass', 'mid', 'high', 'onset', 'beat']) {
      const bar = el('i');
      this.meterBars.set(name, bar);
      this.meters.append(el('span', {}, name), el('div', { class: 'lp-meter' }, bar));
    }
    return this.card(
      'Audio',
      el('div', { class: 'lp-row' }, this.audioDot, this.deviceSelect),
      this.fader('audioSensitivity', 'Audio Sensitivity', 0.2, 4, 0.05, (v) => `${v.toFixed(2)}×`),
      el('div', { class: 'lp-row' }, el('label', { for: 'lp-bpm' }, 'Manual BPM'), this.bpmInput, tap, this.toggle('lockBpm', 'Lock')),
      this.bpmInfo,
      this.meters,
    );
  }

  private outputCard(): HTMLElement {
    const full = el('button', { type: 'button', class: 'lp-primary', id: 'lp-fullscreen' }, this.mode === 'standalone' ? 'LED Fullscreen Output ↗' : 'Fullscreen');
    full.addEventListener('click', () => this.onFullscreen());
    const apply = el('button', { type: 'button', id: 'lp-led-apply' }, 'Apply');
    apply.addEventListener('click', () => {
      const width = Number(this.ledW.value);
      const height = Number(this.ledH.value);
      this.bus.send({ type: 'led-size', size: width > 0 && height > 0 ? { width, height } : null });
    });
    return this.card(
      'Output',
      el('div', { class: 'lp-row' }, full),
      el('div', { class: 'lp-row' }, el('label', {}, 'LED px'), this.ledW, el('span', {}, '×'), this.ledH, apply),
      el('div', { class: 'lp-hint' }, 'Boş bırak + Apply = pencere boyutu. Değer bu tarayıcıda saklanır.'),
      this.select<QualityPreset>('quality', 'Quality', Object.keys(QUALITY_PRESETS).map((q) => [q as QualityPreset, q])),
      el('div', { class: 'lp-row' }, this.toggle('adaptiveQuality', 'Adaptive quality')),
    );
  }

  private performanceCard(): HTMLElement {
    return this.card('Performance', this.stats, el('h3', {}, 'Log'), this.logBox);
  }

  private async refreshDevices(): Promise<void> {
    const current = this.deviceSelect.value || 'auto';
    let devices: MediaDeviceInfo[] = [];
    try {
      devices = (await navigator.mediaDevices?.enumerateDevices?.()) ?? [];
    } catch {
      devices = [];
    }
    const inputs = devices.filter((d) => d.kind === 'audioinput');
    this.deviceSelect.replaceChildren(el('option', { value: 'auto' }, 'Auto visual mode (no input)'));
    if (inputs.length === 0 || inputs.every((d) => !d.label)) {
      this.deviceSelect.append(el('option', { value: 'default' }, 'Mikrofon / ses kartı (izin iste)'));
    }
    inputs.forEach((d, i) => {
      if (d.label) this.deviceSelect.append(el('option', { value: d.deviceId }, d.label || `Input ${i + 1}`));
    });
    this.deviceSelect.value = [...this.deviceSelect.options].some((o) => o.value === current) ? current : 'auto';
  }

  private render(s: OutputStatus): void {
    this.lastStatus = performance.now();
    this.offline.hidden = true;
    const st = s.state;
    for (const [key, f] of this.faders) {
      if (document.activeElement === f.input) continue;
      f.input.value = String(st[key]);
      f.output.textContent = f.format(Number(st[key]));
    }
    for (const [key, b] of this.toggles) {
      const on = key === 'energyMode' ? st.energyMode === 'auto' : Boolean(st[key]);
      b.setAttribute('aria-pressed', String(on));
    }
    for (const [key, sel] of this.selects) if (document.activeElement !== sel) sel.value = String(st[key]);
    if (document.activeElement !== this.bpmInput) this.bpmInput.value = String(st.manualBpm);
    const energyFader = this.faders.get('energy');
    if (energyFader) energyFader.input.disabled = st.energyMode === 'auto';

    const phase = s.phase === 'transition' ? `→ ${s.next} ${Math.round(s.transitionProgress * 100)}%` : s.phase === 'preparing' ? `(next: ${s.next})` : '';
    this.now.innerHTML = '';
    this.now.append('Now: ', el('b', {}, s.worldTitle), ` ${phase}`);

    const key = s.playable.map((w) => w.id).join() + '|' + s.planned.map((w) => w.id).join();
    if (key !== this.worldsKey) {
      this.worldsKey = key;
      this.worldGrid.replaceChildren();
      this.worldButtons.clear();
      for (const w of [...s.playable, ...s.planned]) {
        const playable = s.playable.some((p) => p.id === w.id);
        const b = el('button', { type: 'button', title: playable ? w.title : `${w.title} — planned` }, w.title);
        if (!playable) b.disabled = true;
        b.addEventListener('click', () => this.bus.send({ type: 'go-to-world', world: w.id }));
        this.worldButtons.set(w.id, b);
        this.worldGrid.append(b);
      }
    }
    for (const [id, b] of this.worldButtons) b.classList.toggle('lp-active', id === s.world || id === s.next);

    const a = s.audio;
    this.audioDot.classList.toggle('live', a.mode === 'input');
    for (const [name, bar] of this.meterBars) bar.style.width = `${Math.round(Math.min(1, (a as unknown as Record<string, number>)[name]) * 100)}%`;
    this.bpmInfo.textContent =
      a.mode === 'input'
        ? `Active ${a.bpm.toFixed(1)} BPM · estimate ${a.bpmEstimate ? a.bpmEstimate.toFixed(1) : '—'} (confidence ${Math.round(a.confidence * 100)}%)`
        : `Auto visual mode · ${a.bpm.toFixed(1)} BPM`;

    const rows: [string, string][] = [
      ['FPS', `${s.fps.toFixed(0)} (${s.frameMs.toFixed(1)} ms)`],
      ['Output', s.outputSize],
      ['Render scale', `${Math.round(s.renderScale * 100)}%`],
      ['Draw calls / tris', `${s.drawCalls} / ${(s.triangles / 1000).toFixed(0)}k`],
      ['GPU geometries / textures', `${s.geometries} / ${s.textures}`],
      ['JS heap', s.heapMb === null ? 'n/a' : `${s.heapMb.toFixed(0)} MB`],
      ['History', s.history.slice(-5).join(' → ')],
    ];
    this.stats.replaceChildren(...rows.flatMap(([k, v]) => [el('dt', {}, k), el('dd', {}, v)]));
    if (document.activeElement !== this.ledW && document.activeElement !== this.ledH) {
      const [w, h] = s.outputSize.split('×');
      if (!this.ledW.value) this.ledW.placeholder = w;
      if (!this.ledH.value) this.ledH.placeholder = h;
    }
    this.logBox.replaceChildren(
      ...s.logs.slice(-30).reverse().map((l) => el('div', { class: l.level }, `${l.time.slice(11, 19)} ${l.message}`)),
    );
  }
}
