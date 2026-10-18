import type { AudioFeatures } from '../core/types';
import { log } from '../core/Logger';
import { FlashGuard } from './FlashGuard';
import { TempoEstimator } from './TempoEstimator';

export type AudioMode = 'auto' | 'input';

export interface AudioSettings {
  sensitivity: number;
  /** Manual BPM used when the estimate is not trusted or `lockBpm` is set. */
  manualBpm: number;
  lockBpm: boolean;
}

/**
 * Web Audio analysis of the DJ mixer feed (USB sound card / line-in) or a mic.
 * With no input it runs "auto" mode: a gentle synthetic groove so the wall
 * never looks dead.
 */
export class AudioEngine {
  mode: AudioMode = 'auto';
  deviceLabel = '';
  readonly features: AudioFeatures = { level: 0, bass: 0, mid: 0, high: 0, onset: 0, beat: 0, phase: 0, bpm: 124 };
  estimate = { bpm: 0, confidence: 0 };

  private context: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private stream: MediaStream | null = null;
  private bins: Uint8Array<ArrayBuffer> = new Uint8Array(0);
  private prevBins: Float32Array = new Float32Array(0);
  private fluxAverage = 0.05;
  private sinceOnset = 1;
  private estimateTimer = 0;
  private readonly tempo = new TempoEstimator();
  private readonly guard = new FlashGuard();
  private silentFor = 0;

  constructor(private readonly settings: AudioSettings) {}

  static async listInputs(): Promise<MediaDeviceInfo[]> {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === 'audioinput');
  }

  async enableInput(deviceId?: string): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('getUserMedia yok (HTTPS veya localhost gerekli)');
    this.disableInput();
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });
    this.context = new AudioContext();
    await this.context.resume();
    const source = this.context.createMediaStreamSource(this.stream);
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.5;
    source.connect(this.analyser);
    this.bins = new Uint8Array(this.analyser.frequencyBinCount);
    this.prevBins = new Float32Array(this.analyser.frequencyBinCount);
    this.mode = 'input';
    this.deviceLabel = this.stream.getAudioTracks()[0]?.label ?? 'input';
    log.info(`Audio input: ${this.deviceLabel}`);
  }

  disableInput(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    void this.context?.close();
    this.stream = null;
    this.context = null;
    this.analyser = null;
    this.mode = 'auto';
    this.deviceLabel = '';
  }

  /** Resume a suspended context (browsers require a user gesture). */
  resume(): void {
    void this.context?.resume();
  }

  update(time: number, delta: number): AudioFeatures {
    const f = this.features;
    let beatTrigger = 0;
    const live = this.mode === 'input' && this.analyser && this.context?.state === 'running';

    if (live) {
      beatTrigger = this.analyse(delta);
      this.silentFor = f.level < 0.02 ? this.silentFor + delta : 0;
    }

    // Tempo: manual when locked or the estimate is weak.
    this.estimateTimer += delta;
    if (live && this.estimateTimer > 1) {
      this.estimateTimer = 0;
      this.estimate = this.tempo.estimate();
    }
    const trusted = live && !this.settings.lockBpm && this.estimate.confidence > 0.35;
    f.bpm = trusted ? this.estimate.bpm : this.settings.manualBpm;
    const prevPhase = f.phase;
    f.phase = (f.phase + (delta * f.bpm) / 60) % 1;
    const wrapped = f.phase < prevPhase;

    if (!live || this.silentFor > 3) {
      // Auto mode: synthesised groove locked to the manual BPM.
      const kick = Math.exp(-f.phase * 6);
      f.bass = 0.15 + 0.45 * kick;
      f.mid = 0.3 + 0.15 * Math.sin(time * 0.7);
      f.high = 0.2 + 0.15 * Math.exp(-((f.phase * 2) % 1) * 8);
      f.level = (f.bass + f.mid + f.high) / 3;
      f.onset = kick * 0.5;
      beatTrigger = wrapped ? 0.6 : 0;
    } else if (wrapped && trusted) {
      beatTrigger = Math.max(beatTrigger, 0.8);
    }

    f.beat = this.guard.update(beatTrigger, delta);
    return f;
  }

  private analyse(delta: number): number {
    const analyser = this.analyser!;
    analyser.getByteFrequencyData(this.bins);
    const gain = this.settings.sensitivity;
    const hzPerBin = this.context!.sampleRate / analyser.fftSize;
    const band = (lo: number, hi: number): number => {
      const a = Math.max(1, Math.floor(lo / hzPerBin));
      const b = Math.min(this.bins.length - 1, Math.ceil(hi / hzPerBin));
      let sum = 0;
      for (let i = a; i <= b; i++) sum += this.bins[i];
      return Math.min(1, (sum / ((b - a + 1) * 255)) * gain);
    };
    const f = this.features;
    const k = Math.min(1, delta * 20);
    f.bass += (band(30, 150) - f.bass) * k;
    f.mid += (band(150, 2000) - f.mid) * k;
    f.high += (band(2000, 11000) - f.high) * k;
    f.level = (f.bass + f.mid + f.high) / 3;

    // Spectral flux (positive changes only), weighted towards lows for kicks.
    let flux = 0;
    const limit = Math.min(this.bins.length, Math.ceil(4000 / hzPerBin));
    for (let i = 1; i < limit; i++) {
      const v = this.bins[i] / 255;
      const d = v - this.prevBins[i];
      if (d > 0) flux += d * (i * hzPerBin < 200 ? 3 : 1);
      this.prevBins[i] = v;
    }
    flux = (flux / limit) * gain;
    this.fluxAverage += (flux - this.fluxAverage) * Math.min(1, delta * 1.5);
    const onset = Math.max(0, flux - this.fluxAverage * 1.4);
    f.onset = Math.min(1, onset * 12);
    this.tempo.push(f.onset, delta);

    this.sinceOnset += delta;
    if (f.onset > 0.35 && this.sinceOnset > 0.2) {
      this.sinceOnset = 0;
      return f.onset;
    }
    return 0;
  }
}
