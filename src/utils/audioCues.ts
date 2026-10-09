/**
 * Web Audio API Acoustic & Haptic Cues
 * Used for eye-free and arm's-length sensory testing
 */

class SoundEngine {
  private ctx: AudioContext | null = null;

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
   * Play a short sine tone at given frequency and duration
   */
  playTone(freq = 440, durationMs = 120, type: OscillatorType = 'sine', gainVal = 0.15) {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
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
   * Countdown tick (3, 2, 1...)
   */
  tick() {
    this.playTone(520, 80, 'sine', 0.12);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(30);
    }
  }

  /**
   * Test start signal (action trigger)
   */
  startPing() {
    this.playTone(880, 240, 'triangle', 0.2);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([60, 40, 60]);
    }
  }

  /**
   * Transition alert (e.g. "Close your eyes now")
   */
  phaseTransition() {
    this.playTone(660, 160, 'sine', 0.18);
    setTimeout(() => {
      this.playTone(440, 300, 'sine', 0.18);
    }, 180);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([100, 80, 150]);
    }
  }

  /**
   * Test completion chime
   */
  completeFanfare() {
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone(freq, 220, 'triangle', 0.18);
      }, i * 110);
    });
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([80, 50, 120]);
    }
  }
}

export const soundEngine = new SoundEngine();
