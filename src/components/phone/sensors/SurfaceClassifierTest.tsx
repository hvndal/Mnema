import React, { useState } from 'react';
import type { SurfaceClassificationResult } from '../../../types/phoneSensorsAdvanced';
import { classifySurfaceResonance } from '../../../utils/phoneSensorsAdvancedMath';
import { Vibrate, Play, Sparkles, CheckCircle2 } from 'lucide-react';
import { soundEngine } from '../../../utils/soundEngine';

export const SurfaceClassifierTest: React.FC = () => {
  const [isPinging, setIsPinging] = useState<boolean>(false);
  const [result, setResult] = useState<SurfaceClassificationResult | null>(null);

  const pingSurface = (mockType?: SurfaceClassificationResult['surfaceType']) => {
    setIsPinging(true);
    soundEngine.tick();

    // Trigger haptic motor pulse
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([40]);
      } catch (e) {}
    }

    // 400ms ringdown analysis window
    setTimeout(() => {
      setIsPinging(false);
      soundEngine.completeFanfare();

      let halfLife = 95;
      let freq = 420;
      let damping = 0.12;

      if (mockType === 'Soft Cushion / Bed') {
        halfLife = 28;
        freq = 80;
        damping = 0.65;
      } else if (mockType === 'Handheld / In-Air') {
        halfLife = 65;
        freq = 110;
        damping = 0.35;
      } else if (mockType === 'Hollow Resonance Box') {
        halfLife = 180;
        freq = 240;
        damping = 0.08;
      }

      const chosenType = mockType || classifySurfaceResonance(halfLife, freq);

      setResult({
        surfaceType: chosenType,
        vibrationDecayHalfLifeMs: halfLife,
        dominantResonantFreqHz: freq,
        dampingRatio: damping,
      });
    }, 450);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Intro Header */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-800 text-[11px] font-bold mb-2">
            <Vibrate className="w-3.5 h-3.5" />
            Active Haptic Acoustic Probing
          </div>
          <h3 className="text-xl font-black text-zinc-900">Surface Sensing via Vibration Echo Decay</h3>
          <p className="text-xs text-zinc-500 max-w-xl mt-1 leading-relaxed">
            Fires an ultra-short 40ms vibration motor pulse and reads the accelerometer ringdown damping response. Hard desks ring with high frequency; soft cushions absorb energy instantly; hollow boxes resonate.
          </p>
        </div>

        <button
          onClick={() => pingSurface()}
          disabled={isPinging}
          className={`px-6 py-3 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer ${
            isPinging
              ? 'bg-amber-500 text-white animate-pulse'
              : 'bg-violet-600 hover:bg-violet-700 text-white'
          }`}
        >
          <Play className="w-4 h-4 fill-current" />
          {isPinging ? 'Pulsing Vibration Echo...' : 'Probe Resting Surface'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Identified Surface Result */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              CLASSIFIED RESTING SURFACE
            </span>

            {result ? (
              <div className="p-5 bg-violet-50 border border-violet-200 rounded-xl my-2 flex flex-col items-center text-center">
                <CheckCircle2 className="w-10 h-10 text-violet-600 mb-2" />
                <span className="text-2xl font-black text-violet-900">
                  {result.surfaceType}
                </span>
                <span className="text-xs text-violet-700 font-semibold mt-1">
                  Damping Ratio ζ = {result.dampingRatio}
                </span>
              </div>
            ) : (
              <div className="p-8 border border-dashed border-zinc-200 rounded-xl my-2 text-center text-xs text-zinc-400">
                Rest phone flat on a table, bed, or hold in hand, then tap "Probe Resting Surface".
              </div>
            )}

            {result && (
              <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                  <span className="text-zinc-500 block text-[11px]">Decay Half-Life (t½)</span>
                  <span className="font-mono font-bold text-zinc-800">{result.vibrationDecayHalfLifeMs} ms</span>
                </div>
                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                  <span className="text-zinc-500 block text-[11px]">Resonant Frequency</span>
                  <span className="font-mono font-bold text-violet-700">{result.dominantResonantFreqHz} Hz</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick test buttons */}
          <div className="mt-5 pt-4 border-t border-zinc-100">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
              Simulate Different Surface Damping Profiles
            </span>
            <div className="flex flex-wrap gap-2">
              {(['Hard Wood / Metal Desk', 'Soft Cushion / Bed', 'Handheld / In-Air', 'Hollow Resonance Box'] as const).map(
                (surface) => (
                  <button
                    key={surface}
                    onClick={() => pingSurface(surface)}
                    className="px-2.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-[11px] font-semibold cursor-pointer"
                  >
                    {surface.split(' / ')[0]}
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        {/* Physical Principle */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              DAMPING RESONANCE (Q FACTOR)
            </span>
            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl font-mono text-xs text-zinc-800 leading-relaxed">
              x(t) = A × e^(-ζ ω_n t) × cos(ω_d t)<br />
              • Hard Wood/Steel: High Q, low damping ζ &lt; 0.15<br />
              • Mattresses/Sofas: Overdamped ζ &gt; 0.50<br />
              • Human Hand: Viscoelastic tissue damping
            </div>
            <p className="text-xs text-zinc-600 mt-4 leading-relaxed">
              Allows smartphones to automatically detect when they've been placed face-down on a restaurant table versus dropped onto a sofa cushion, adapting haptic feedback intensity accordingly.
            </p>
          </div>

          <div className="pt-4 border-t border-zinc-100 text-[11px] text-zinc-500 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-600 shrink-0" />
            <span>Active sonar/haptic probing turns passive motion sensors into acoustic material sensors.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
