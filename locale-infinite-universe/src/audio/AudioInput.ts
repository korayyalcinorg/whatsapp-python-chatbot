import type { AudioFeatures } from '../core/types';

export type AudioSource = 'off' | 'demo' | 'mic';

/**
 * Turns sound into AudioFeatures.
 *  - 'mic':  live input (phone mic in preview, line-in / DJ booth feed on the LED PC)
 *  - 'demo': synthetic 124 BPM pulse so the visuals move without any audio
 *  - 'off':  everything stays at 0
 */
export class AudioInput {
  source: AudioSource = 'demo';
  bpm = 124;
  readonly features: AudioFeatures = { level: 0, bass: 0, mid: 0, high: 0, beat: 0 };

  private context: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private stream: MediaStream | null = null;
  private bins: Uint8Array<ArrayBuffer> = new Uint8Array(0);
  private bassAverage = 0;
  private sinceBeat = 1;

  /** Must be called from a user gesture (tap / click) on mobile browsers. */
  async enableMic(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Bu tarayıcı mikrofon erişimini desteklemiyor (HTTPS gerekli).');
    }
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    this.context = new AudioContext();
    await this.context.resume();
    const input = this.context.createMediaStreamSource(this.stream);
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.6;
    input.connect(this.analyser);
    this.bins = new Uint8Array(this.analyser.frequencyBinCount);
    this.source = 'mic';
  }

  disableMic(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    void this.context?.close();
    this.stream = null;
    this.context = null;
    this.analyser = null;
    this.source = 'demo';
  }

  update(time: number, delta: number): AudioFeatures {
    const f = this.features;
    if (this.source === 'mic' && this.analyser && this.context) {
      this.readAnalyser(delta);
    } else if (this.source === 'demo') {
      const phase = (time * this.bpm) / 60;
      const t = phase - Math.floor(phase);
      const kick = Math.exp(-t * 7);
      f.bass = kick;
      f.mid = 0.35 + 0.25 * Math.sin(time * 1.3);
      f.high = 0.3 + 0.3 * Math.exp(-((t * 2) % 1) * 10);
      f.level = (f.bass + f.mid + f.high) / 3;
      f.beat = kick;
    } else {
      f.level = f.bass = f.mid = f.high = 0;
      f.beat = Math.max(0, f.beat - delta * 4);
    }
    return f;
  }

  private readAnalyser(delta: number): void {
    const analyser = this.analyser!;
    analyser.getByteFrequencyData(this.bins);
    const hzPerBin = this.context!.sampleRate / analyser.fftSize;
    const band = (lo: number, hi: number): number => {
      const a = Math.max(1, Math.floor(lo / hzPerBin));
      const b = Math.min(this.bins.length - 1, Math.ceil(hi / hzPerBin));
      let sum = 0;
      for (let i = a; i <= b; i++) sum += this.bins[i];
      return sum / ((b - a + 1) * 255);
    };
    const f = this.features;
    const smooth = (prev: number, next: number): number => prev + (next - prev) * Math.min(1, delta * 18);
    f.bass = smooth(f.bass, band(30, 150));
    f.mid = smooth(f.mid, band(150, 2000));
    f.high = smooth(f.high, band(2000, 10000));
    f.level = (f.bass + f.mid + f.high) / 3;

    // Simple energy beat detector: bass jumps well above its running average.
    this.bassAverage += (f.bass - this.bassAverage) * Math.min(1, delta * 2);
    this.sinceBeat += delta;
    if (f.bass > this.bassAverage * 1.35 && f.bass > 0.25 && this.sinceBeat > 0.25) {
      f.beat = 1;
      this.sinceBeat = 0;
    } else {
      f.beat = Math.max(0, f.beat - delta * 5);
    }
  }
}
