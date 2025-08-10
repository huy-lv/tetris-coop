/*
  Minimal Web Audio sound service for game SFX.
  - Strict TypeScript, no any
  - Lazy initializes AudioContext on first play
*/

import { AUDIO_SETTINGS } from "../constants";

class SoundService {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private enabled: boolean = AUDIO_SETTINGS.ENABLE_SFX;
  private volume: number = AUDIO_SETTINGS.VOLUME; // 0..1

  private ensureContext(): void {
    if (!this.audioContext) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.audioContext = new Ctx();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.audioContext.destination);
    }

    // Some browsers require explicit resume after user gesture
    if (this.audioContext.state === "suspended") {
      void this.audioContext.resume();
    }
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.value = this.volume;
    }
  }

  private playTone(options: {
    frequency: number;
    durationMs: number;
    type?: OscillatorType;
    gain?: number;
    glideToFrequency?: number; // Optional frequency glide target
  }): void {
    // Gate by global audio settings only to reflect latest toggle
    if (!AUDIO_SETTINGS.ENABLE_SFX) return;

    this.ensureContext();
    if (!this.audioContext || !this.masterGain) return;

    const {
      frequency,
      durationMs,
      type = "sine",
      gain = 1.0,
      glideToFrequency,
    } = options;

    // Ensure master gain reflects latest global volume and local volume
    const targetVol =
      typeof AUDIO_SETTINGS.VOLUME === "number"
        ? AUDIO_SETTINGS.VOLUME
        : this.volume;
    this.masterGain.gain.value = targetVol;

    const osc = this.audioContext.createOscillator();
    const env = this.audioContext.createGain();

    osc.type = type;
    osc.frequency.value = frequency;

    // Simple envelope (attack-decay)
    const now = this.audioContext.currentTime;
    const attack = 0.005;
    const decay = Math.max(0.03, durationMs / 1000 - attack);

    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(gain, now + attack);
    env.gain.linearRampToValueAtTime(0.0001, now + attack + decay);

    if (typeof glideToFrequency === "number") {
      osc.frequency.setValueAtTime(frequency, now);
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(1, glideToFrequency),
        now + attack + decay
      );
    }

    osc.connect(env);
    env.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + attack + decay + 0.005);
  }

  public playMove(): void {
    // Subtle tick for horizontal movement
    this.playTone({
      frequency: 520,
      durationMs: 45,
      type: "square",
      gain: 0.15,
    });
  }

  public playRotate(): void {
    this.playTone({
      frequency: 700,
      durationMs: 70,
      type: "triangle",
      gain: 0.2,
    });
  }

  public playHardDrop(): void {
    // Short downward glide
    this.playTone({
      frequency: 420,
      glideToFrequency: 180,
      durationMs: 90,
      type: "sawtooth",
      gain: 0.25,
    });
  }

  public playLineClear(lines: number): void {
    // Slightly different pitch by lines cleared
    const base = 880;
    const freq = base * (1 + (lines - 1) * 0.15);
    this.playTone({
      frequency: freq,
      durationMs: 140,
      type: "sine",
      gain: 0.25,
    });
  }
}

const soundService = new SoundService();
export default soundService;
