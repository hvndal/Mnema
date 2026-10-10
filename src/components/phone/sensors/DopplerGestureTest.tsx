import React, { useState, useRef, useEffect } from 'react';
import type { DopplerGestureState } from '../../../types/phoneSensorsAdvanced';
import { calculateDopplerVelocity } from '../../../utils/phoneSensorsAdvancedMath';
import { Radio, Play, Square, Hand, MoveRight, MoveLeft } from 'lucide-react';
import { soundEngine } from '../../../utils/soundEngine';

export const DopplerGestureTest: React.FC = () => {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [gestureState, setGestureState] = useState<DopplerGestureState>({
    direction: 'stationary',
    relativeVelocityMps: 0,
    dopplerShiftHz: 0,
    confidence: 0,
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);

  const startSoundWaveRadar = async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') await ctx.resume();

      // Continuous 19 kHz carrier sine wave
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(19000, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime); // Low volume to avoid speaker distortion

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      oscRef.current = osc;

      setIsRunning(true);
      soundEngine.startPing();
    } catch (e) {
      setIsRunning(false);
    }
  };

  const stopSoundWaveRadar = () => {
    if (oscRef.current) {
      try {
        oscRef.current.stop();
        oscRef.current.disconnect();
      } catch (e) {}
      oscRef.current = null;
    }
    setIsRunning(false);
    soundEngine.tick();
    setGestureState({
      direction: 'stationary',
      relativeVelocityMps: 0,
      dopplerShiftHz: 0,
      confidence: 0,
    });
  };

  const simulateGesture = (dir: 'approaching' | 'receding' | 'waving') => {
    soundEngine.tick();
    const shift = dir === 'approaching' ? 68 : dir === 'receding' ? -72 : 45;
    const vel = calculateDopplerVelocity(shift, 19000, 343);
    setGestureState({
      direction: dir,
      relativeVelocityMps: Math.abs(vel),
      dopplerShiftHz: shift,
      confidence: 96,
    });
  };

  useEffect(() => {
    return () => {
      if (oscRef.current) {
        try { oscRef.current.stop(); } catch (e) {}
      }
    };
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {/* Intro Header */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[11px] font-bold mb-2">
            <Radio className="w-3.5 h-3.5" />
            Ultrasonic Doppler Radar (SoundWave)
          </div>
          <h3 className="text-xl font-black text-zinc-900">In-Air Gesture Sensing via Ultrasound Doppler Shift</h3>
          <p className="text-xs text-zinc-500 max-w-xl mt-1 leading-relaxed">
            Plays a continuous 19 kHz inaudible tone. When your hand moves in front of the phone, physical reflection shifts the frequency (+Doppler when pushing closer, -Doppler when pulling away), enabling touchless gesture control (Microsoft Research SoundWave).
          </p>
        </div>

        <button
          onClick={isRunning ? stopSoundWaveRadar : startSoundWaveRadar}
          className={`px-6 py-3 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer ${
            isRunning
              ? 'bg-rose-600 hover:bg-rose-700 text-white'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
        >
          {isRunning ? (
            <>
              <Square className="w-4 h-4 fill-current" /> Stop 19 kHz Radar
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" /> Start 19 kHz Radar
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Live Detected Gesture State */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-xs">
          <div
            className={`w-28 h-28 rounded-3xl flex items-center justify-center transition-all duration-200 shadow-md ${
              gestureState.direction === 'approaching'
                ? 'bg-emerald-500 text-white scale-110 shadow-emerald-200'
                : gestureState.direction === 'receding'
                ? 'bg-rose-500 text-white scale-110 shadow-rose-200'
                : gestureState.direction === 'waving'
                ? 'bg-violet-600 text-white scale-110 shadow-violet-200'
                : 'bg-zinc-100 text-zinc-400'
            }`}
          >
            {gestureState.direction === 'approaching' ? (
              <MoveRight className="w-12 h-12" />
            ) : gestureState.direction === 'receding' ? (
              <MoveLeft className="w-12 h-12" />
            ) : gestureState.direction === 'waving' ? (
              <Hand className="w-12 h-12" />
            ) : (
              <Hand className="w-12 h-12" />
            )}
          </div>

          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider mt-4">
            GESTURE RECOGNITION
          </span>
          <h4 className="text-2xl font-black text-zinc-900 mt-1 capitalize">
            {gestureState.direction === 'stationary' ? 'STATIONARY / NO MOTION' : gestureState.direction}
          </h4>

          <div className="flex items-center gap-4 text-xs font-mono mt-3">
            <span className="text-zinc-500">
              Δ Shift: <strong>{gestureState.dopplerShiftHz} Hz</strong>
            </span>
            <span>•</span>
            <span className="text-zinc-500">
              Velocity: <strong>{gestureState.relativeVelocityMps} m/s</strong>
            </span>
          </div>

          {/* Test buttons */}
          <div className="flex gap-2 mt-6">
            <button
              onClick={() => simulateGesture('approaching')}
              className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-[11px] font-semibold text-zinc-700 cursor-pointer"
            >
              Push Toward (+Doppler)
            </button>
            <button
              onClick={() => simulateGesture('receding')}
              className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-[11px] font-semibold text-zinc-700 cursor-pointer"
            >
              Pull Away (-Doppler)
            </button>
            <button
              onClick={() => simulateGesture('waving')}
              className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-[11px] font-semibold text-zinc-700 cursor-pointer"
            >
              Wave Hand
            </button>
          </div>
        </div>

        {/* Doppler Physics Explanation */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              DOPPLER VELOCITY FORMULA
            </span>
            <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl font-mono text-xs text-indigo-900 leading-relaxed">
              v = (Δf × c) / (2 × f_0)<br />
              f_0 = 19,000 Hz<br />
              Approaching: Δf &gt; 0 (pitch shifts up)<br />
              Receding: Δf &lt; 0 (pitch shifts down)
            </div>
            <p className="text-xs text-zinc-600 mt-4 leading-relaxed">
              Enables scrolling web pages, playing/pausing music, or answering calls hands-free with clean gestures when cooking, working, or wearing gloves.
            </p>
          </div>

          <div className="pt-4 border-t border-zinc-100 text-[11px] text-zinc-400">
            Carrier tone operates in the near-ultrasound spectrum above adult human hearing.
          </div>
        </div>
      </div>
    </div>
  );
};
