/**
 * Web Audio API Acoustic & Haptic Cues
 * Used for eye-free, arm's-length sensory testing and 8-bit arcade audio feedback
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  public is8BitMode: boolean = true;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Play a tone at given frequency and duration
   */
  playTone(freq = 440, durationMs = 120, type: OscillatorType = 'sine', gainVal = 0.15) {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = this.is8BitMode ? (type === 'sine' ? 'square' : type) : type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(gainVal, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + durationMs / 1000);
    } catch {
      // Audio autoplay policy or silent mode
    }
  }

  /**
   * Countdown tick (3, 2, 1...) / UI click
   */
  tick() {
    this.playTone(580, 50, 'square', 0.1);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(25);
    }
  }

  /**
   * Authentic 8-bit coin insert / credit cue
   */
  coinInsert() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      this.playTone(987.77, 80, 'square', 0.15); // B5
      setTimeout(() => {
        this.playTone(1318.51, 280, 'square', 0.18); // E6
      }, 70);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([40, 30, 80]);
      }
    } catch {}
  }

  /**
   * Test start signal (action trigger)
   */
  startPing() {
    this.playTone(880, 180, 'square', 0.2);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([60, 40, 60]);
    }
  }

  /**
   * Transition alert (e.g. "Close your eyes now")
   */
  phaseTransition() {
    this.playTone(660, 120, 'square', 0.16);
    setTimeout(() => {
      this.playTone(440, 220, 'square', 0.16);
    }, 140);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([100, 80, 150]);
    }
  }

  /**
   * Test completion / high-score fanfare
   */
  completeFanfare() {
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 160, 'square', 0.16);
      }, i * 90);
    });
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([80, 50, 120]);
    }
  }

  /**
   * Error buzz / fault trigger
   */
  errorBuzz() {
    this.playTone(130, 200, 'sawtooth', 0.22);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(180);
    }
  }
}

export const soundEngine = new SoundEngine();
