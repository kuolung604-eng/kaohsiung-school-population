/**
 * Dual-Mode Audio Engine for Production / Published Web Apps:
 * 1. Generates a real 16-bit PCM WAV audio file in memory (Upbeat Marimba & Rhodes Groove)
 *    so that an HTML5 <audio autoPlay loop playsInline> element can autoplay natively in production browsers.
 * 2. Provides Web Audio API real-time data sonification (Yearly progression chimes, Rank overtake bells, 2041 completion fanfare).
 * 3. Detects browser Autoplay Policy locks in published environments and notifies the UI so music + animation never desync.
 */

function generateUpbeatBgmWavBlobUrl(): string {
  const sampleRate = 22050;
  // 8-bar loop at ~117.6 BPM (step = 0.255s, 32 eighth-note steps = 8.16 seconds)
  const stepSec = 0.255;
  const totalSteps = 32;
  const durationSec = stepSec * totalSteps;
  const numSamples = Math.floor(sampleRate * durationSec);
  const buffer = new Float32Array(numSamples);

  const chords = [
    [261.63, 329.63, 392.0, 493.88], // Cmaj7
    [220.0, 261.63, 329.63, 392.0], // Am7
    [174.61, 220.0, 261.63, 349.23], // Fmaj7
    [196.0, 246.94, 293.66, 392.0], // G6
  ];

  const melodyPattern = [
    523.25, 659.25, 783.99, 659.25, 880.0, 783.99, 659.25, 587.33,
    523.25, 659.25, 783.99, 880.0, 783.99, 659.25, 587.33, 523.25,
    587.33, 659.25, 783.99, 659.25, 1046.5, 880.0, 783.99, 659.25,
    587.33, 659.25, 783.99, 587.33, 523.25, 587.33, 659.25, 783.99,
  ];

  const addNote = (startSec: number, durSec: number, freq: number, amp: number, isPad: boolean) => {
    const startIdx = Math.floor(startSec * sampleRate);
    const len = Math.floor(durSec * sampleRate);
    for (let i = 0; i < len; i++) {
      const idx = (startIdx + i) % numSamples;
      const t = i / sampleRate;
      const attack = isPad ? 0.04 : 0.008;
      const env =
        t < attack
          ? t / attack
          : Math.exp((-t / durSec) * (isPad ? 3.2 : 5.5));
      // Warm harmonic overtone for marimba/Rhodes feel
      const wave =
        Math.sin(2 * Math.PI * freq * t) * 0.75 +
        Math.sin(2 * Math.PI * freq * 2 * t) * (isPad ? 0.15 : 0.22) +
        Math.sin(2 * Math.PI * freq * 3 * t) * 0.05;
      buffer[idx] += wave * amp * env;
    }
  };

  const addWoodblock = (startSec: number, amp: number) => {
    const startIdx = Math.floor(startSec * sampleRate);
    const len = Math.floor(0.045 * sampleRate);
    for (let i = 0; i < len; i++) {
      const idx = (startIdx + i) % numSamples;
      const t = i / sampleRate;
      const freq = 1150 * Math.exp(-t * 28);
      const env = Math.exp(-t * 65);
      buffer[idx] += Math.sin(2 * Math.PI * freq * t) * amp * env;
    }
  };

  for (let step = 0; step < totalSteps; step++) {
    const t0 = step * stepSec;
    const chordIdx = Math.floor(step / 8);
    const chord = chords[chordIdx];

    if (step % 8 === 0 || step % 8 === 4) {
      chord.forEach((freq, i) => {
        addNote(t0, 0.95, freq, i === 0 ? 0.09 : 0.065, true);
      });
    }

    const melFreq = melodyPattern[step];
    if (melFreq && (step % 2 === 0 || step % 4 === 3)) {
      addNote(t0, 0.28, melFreq, 0.14, false);
    }

    if (step % 4 === 2) {
      addWoodblock(t0, 0.06);
    }
  }

  // Encode mono Float32Array into 16-bit PCM WAV Blob
  const wavBytes = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(wavBytes);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, 1, true); // NumChannels (1)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate
  view.setUint16(32, 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample
  writeStr(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  for (let i = 0; i < numSamples; i++) {
    const clamped = Math.max(-0.95, Math.min(0.95, buffer[i]));
    view.setInt16(44 + i * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  }

  const blob = new Blob([wavBytes], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private bgmAudioEl: HTMLAudioElement | null = null;
  private bgmWavUrl: string | null = null;
  private bgmEnabled: boolean = true;
  private sfxEnabled: boolean = true;
  private volume: number = 0.55;
  private isAutoplayBlocked: boolean = false;
  private onAutoplayStatusChangeCallbacks: Set<(blocked: boolean) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      this.initHtml5BgmAudio();
      this.bindGlobalUnlockListeners();
    }
  }

  private initHtml5BgmAudio() {
    try {
      this.bgmWavUrl = generateUpbeatBgmWavBlobUrl();
      const audio = new Audio(this.bgmWavUrl);
      audio.loop = true;
      audio.autoplay = true;
      audio.preload = 'auto';
      audio.volume = this.volume;
      audio.setAttribute('playsinline', 'true');
      this.bgmAudioEl = audio;
    } catch {
      // Fallback if Blob/Audio fails
    }
  }

  public subscribeAutoplayStatus(cb: (blocked: boolean) => void): () => void {
    this.onAutoplayStatusChangeCallbacks.add(cb);
    cb(this.isAutoplayBlocked);
    return () => {
      this.onAutoplayStatusChangeCallbacks.delete(cb);
    };
  }

  private setAutoplayBlockedState(blocked: boolean) {
    if (this.isAutoplayBlocked !== blocked) {
      this.isAutoplayBlocked = blocked;
      this.onAutoplayStatusChangeCallbacks.forEach((cb) => cb(blocked));
    }
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private bindGlobalUnlockListeners() {
    const unlock = () => {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      } else {
        this.ensureContext();
      }

      if (this.bgmEnabled && this.bgmAudioEl && this.bgmAudioEl.paused) {
        this.bgmAudioEl
          .play()
          .then(() => {
            this.setAutoplayBlockedState(false);
          })
          .catch(() => {});
      } else {
        this.setAutoplayBlockedState(false);
      }
    };

    const gestureEvents = ['pointerdown', 'mousedown', 'touchstart', 'keydown', 'click'];
    gestureEvents.forEach((evt) => {
      window.addEventListener(evt, unlock, { capture: true, passive: true });
    });
  }

  public setBgmEnabled(enabled: boolean) {
    this.bgmEnabled = enabled;
    if (!enabled) {
      this.stopBgm();
    } else {
      this.startBgm();
    }
  }

  public getBgmEnabled(): boolean {
    return this.bgmEnabled;
  }

  public setSfxEnabled(enabled: boolean) {
    this.sfxEnabled = enabled;
  }

  public getSfxEnabled(): boolean {
    return this.sfxEnabled;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.bgmAudioEl) {
      this.bgmAudioEl.volume = this.volume;
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  /**
   * Starts playing the HTML5 WAV BGM immediately.
   * Returns a promise resolving to true if immediate playback succeeded, or false if blocked by browser autoplay policy.
   */
  public async startBgm(): Promise<boolean> {
    if (!this.bgmEnabled) return true;
    this.ensureContext();

    if (!this.bgmAudioEl) {
      this.initHtml5BgmAudio();
    }

    if (this.bgmAudioEl) {
      this.bgmAudioEl.volume = this.volume;
      try {
        await this.bgmAudioEl.play();
        this.setAutoplayBlockedState(false);
        return true;
      } catch {
        // Browser blocked unmuted autoplay before first user gesture
        this.setAutoplayBlockedState(true);
        return false;
      }
    }
    return false;
  }

  public stopBgm() {
    if (this.bgmAudioEl && !this.bgmAudioEl.paused) {
      this.bgmAudioEl.pause();
    }
  }

  /**
   * Sonifies yearly progression (2026 -> 2041).
   */
  public playYearStepSound(year: number, deltaPct: number) {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || ctx.state !== 'running') return;

    const progress = Math.max(0, Math.min(15, year - 2026));
    const scale = [
      523.25, 587.33, 659.25, 783.99, 880.0,
      1046.5, 1174.66, 1318.51, 1567.98, 1760.0,
    ];
    const baseFreq = scale[progress % scale.length] * (1 + deltaPct * 0.002);

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.015, now + 0.09);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.085 * this.volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  /**
   * Plays a joyful double-bell chime when a district overtakes another in rank
   */
  public playRankOvertakeSound() {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || ctx.state !== 'running') return;

    const notes = [659.25, 987.77]; // E5 -> B5 fifth interval
    notes.forEach((freq, idx) => {
      const now = ctx.currentTime + idx * 0.075;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.115 * this.volume, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.3);
    });
  }

  /**
   * Plays a pleasant resolving chord arpeggio when 2041 simulation finishes and stops
   */
  public playSimulationCompleteSound() {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || ctx.state !== 'running') return;

    const arpeggio = [523.25, 659.25, 783.99, 1046.5, 1318.51]; // C5 E5 G5 C6 E6
    arpeggio.forEach((freq, idx) => {
      const now = ctx.currentTime + idx * 0.085;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.125 * this.volume, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.55);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.58);
    });
  }

  /**
   * Subtle acoustic pluck for UI interactions
   */
  public playClickPluck(pitchMultiplier = 1) {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || ctx.state !== 'running') return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440 * pitchMultiplier, now);
    osc.frequency.exponentialRampToValueAtTime(660 * pitchMultiplier, now + 0.06);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.075 * this.volume, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.1);
  }
}

export const soundEngine = new SoundEngine();
