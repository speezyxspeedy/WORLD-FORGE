/**
 * 100% Procedural Web Audio API synthesizer for WORLD FORGE.
 * Zero external audio assets or 404 dependencies.
 */
class ProceduralAudioEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private volume = 0.45;

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  playTone(freq: number, duration: number, type: OscillatorType = 'triangle', gainScale = 0.25, slideTo?: number): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const jitter = 0.94 + Math.random() * 0.12;

    osc.type = type;
    osc.frequency.setValueAtTime(freq * jitter, now);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo * jitter), now + duration);
    }

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(this.volume * gainScale, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  playPlaceObject(): void {
    this.playTone(220, 0.09, 'triangle', 0.22, 330);
  }

  playJump(): void {
    this.playTone(190, 0.16, 'sine', 0.26, 440);
  }

  playLand(): void {
    this.playTone(120, 0.11, 'triangle', 0.28, 55);
  }

  playPickup(): void {
    this.playTone(523.25, 0.12, 'sine', 0.24, 784);
    setTimeout(() => this.playTone(784, 0.16, 'triangle', 0.22, 1046.5), 70);
  }

  playDoorOpen(): void {
    this.playTone(160, 0.28, 'sawtooth', 0.16, 280);
  }

  playButton(): void {
    this.playTone(440, 0.08, 'square', 0.16, 620);
  }

  playDamage(): void {
    this.playTone(150, 0.22, 'sawtooth', 0.3, 62);
  }

  playVictory(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, idx) => {
      setTimeout(() => this.playTone(f, 0.24, 'triangle', 0.25), idx * 95);
    });
  }

  playClick(): void {
    this.playTone(340, 0.045, 'sine', 0.12, 420);
  }

  private ambientStopper: (() => void) | null = null;

  stopAmbient(): void {
    if (this.ambientStopper) {
      this.ambientStopper();
      this.ambientStopper = null;
    }
  }

  playAmbientPreview(mood: 'none' | 'wind' | 'synth_pad' | 'arena_pulse'): void {
    this.stopAmbient();
    if (mood === 'none') return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(this.volume * 0.14, now + 0.35);
    gain.connect(ctx.destination);

    const nodes: AudioNode[] = [gain];
    if (mood === 'wind') {
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(420, now);
      filter.Q.setValueAtTime(1.8, now);
      noise.connect(filter);
      filter.connect(gain);
      noise.start(now);
      nodes.push(noise, filter);
      this.ambientStopper = () => {
        try {
          noise.stop();
          nodes.forEach((n) => n.disconnect());
        } catch {
          // ignore
        }
      };
    } else {
      const freqs = mood === 'synth_pad' ? [130.81, 196.0, 261.63] : [98.0, 146.83];
      const oscs = freqs.map((f) => {
        const osc = ctx.createOscillator();
        osc.type = mood === 'synth_pad' ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(f, now);
        osc.connect(gain);
        osc.start(now);
        return osc;
      });
      this.ambientStopper = () => {
        try {
          oscs.forEach((o) => o.stop());
          gain.disconnect();
        } catch {
          // ignore
        }
      };
    }

    // Auto-stop audition after 4.5s so it never loops indefinitely in studio
    window.setTimeout(() => {
      this.stopAmbient();
    }, 4500);
  }
}

export const audioSynth = new ProceduralAudioEngine();
