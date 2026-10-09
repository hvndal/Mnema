import React, { useState, useEffect, useRef } from 'react';
import type { OrientationSample } from '../../types/phoneSensors';
import type { InternalMetronomeResult } from '../../types/gyroLab';
import { computeInternalMetronome } from '../../utils/gyroLabCalculations';
import { soundEngine } from '../../utils/audioCues';
import { saveSession } from '../../utils/sessionStorage';
import { Music, Play, RotateCcw, Award, CheckCircle2 } from 'lucide-react';

interface InternalMetronomeTestProps {
  latestOrientation: OrientationSample | null;
  sensorHz: number;
  isSimulated: boolean;
}

export const InternalMetronomeTest: React.FC<InternalMetronomeTestProps> = ({
  latestOrientation,
  sensorHz,
  isSimulated,
}) => {
  const [phase, setPhase] = useState<'idle' | 'pacing_sound' | 'unpaced_silent' | 'results'>('idle');
  const [pacedBeatsLeft, setPacedBeatsLeft] = useState<number>(5);
  const [silentTimeLeft, setSilentTimeLeft] = useState<number>(10);
  const [rockCount, setRockCount] = useState<number>(0);
  const [result, setResult] = useState<InternalMetronomeResult | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const targetBpm = 100;
  const rockTimesRef = useRef<number[]>([]);
  const lastRockTimeRef = useRef<number>(0);
  const prevRollRef = useRef<number>(0);

  // Rock detection: zero-crossings of roll tilt
  useEffect(() => {
    if (!latestOrientation) return;

    const roll = latestOrientation.gamma;
    const prevRoll = prevRollRef.current;
    prevRollRef.current = roll;

    // Detect direction reversal peak
    if ((roll > 10 && prevRoll <= 10) || (roll < -10 && prevRoll >= -10)) {
      const now = performance.now();
      if (now - lastRockTimeRef.current > 300) {
        lastRockTimeRef.current = now;
        if (phase === 'unpaced_silent') {
          rockTimesRef.current.push(now);
          setRockCount((c) => c + 1);
        }
      }
    }
  }, [phase, latestOrientation]);

  const startTest = () => {
    rockTimesRef.current = [];
    setRockCount(0);
    setResult(null);
    setIsSaved(false);
    setPhase('pacing_sound');
    setPacedBeatsLeft(5);

    // Play 5 metronome clicks at 100 BPM (every 600ms)
    let beats = 5;
    const beatInterval = setInterval(() => {
      soundEngine.tick();
      beats--;
      setPacedBeatsLeft(beats);

      if (beats <= 0) {
        clearInterval(beatInterval);
        startSilentPhase();
      }
    }, 600);
  };

  const startSilentPhase = () => {
    setPhase('unpaced_silent');
    setSilentTimeLeft(10);
    soundEngine.startPing();

    const start = performance.now();
    const timer = setInterval(() => {
      const elapsed = (performance.now() - start) / 1000;
      const rem = Math.max(0, Math.ceil(10 - elapsed));
      setSilentTimeLeft(rem);

      if (elapsed >= 10) {
        clearInterval(timer);
        finishTest();
      }
    }, 100);
  };

  const finishTest = () => {
    soundEngine.completeFanfare();
    const computed = computeInternalMetronome([...rockTimesRef.current], targetBpm);
    setResult(computed);
    setPhase('results');

    saveSession({
      id: `internal-metronome-${Date.now()}`,
      timestamp: new Date().toISOString(),
      experimentType: 'phone_steadiness',
      protocolVersion: '5.0-internal-metronome-pacing-drift',
      hardwareName: isSimulated ? 'Phone Sensor Simulator' : 'Smartphone Gyro',
      controllerId: 'Phone Built-In IMU',
      settingsSummary: { targetBpm: 100 },
      sampleCount: rockTimesRef.current.length,
      hasInterruptedTrials: false,
      dataQualityWarnings: [],
    }).then(() => setIsSaved(true)).catch(console.error);
  };

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex justify-between items-center pb-3 border-b border-zinc-100">
        <div>
          <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
            <Music className="w-5 h-5 text-violet-600" />
            Internal Metronome (Rhythmic Pacing Drift)
          </h3>
          <p className="text-xs text-zinc-500">
            Rock phone to a 100 BPM beat. The audio clicks go silent; keep rocking at the same tempo. Charts internal clock drift and tempo variance.
          </p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 font-semibold">
          {isSimulated ? 'Simulator Mode' : `${sensorHz} Hz Gyro`}
        </span>
      </div>

      {phase === 'idle' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-8 flex flex-col items-center text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mb-4">
            <Music className="w-8 h-8" />
          </div>
          <h4 className="text-sm font-bold text-zinc-900 mb-1">Cerebellar Internal Timekeeper</h4>
          <p className="text-xs text-zinc-500 max-w-sm mb-6 leading-relaxed">
            Listen to 5 metronome clicks (100 BPM) while rocking your phone side-to-side in rhythm. When the sound vanishes, maintain the exact same tempo without stopping for 10 seconds.
          </p>
          <button
            onClick={startTest}
            className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            Begin Metronome Test (100 BPM)
          </button>
        </div>
      )}

      {phase === 'pacing_sound' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-violet-600 mb-2">SYNC TO THE BEAT</span>
          <div className="text-6xl font-black text-zinc-900 my-4 animate-bounce">
            {pacedBeatsLeft}
          </div>
          <p className="text-xs text-zinc-400">Rock phone left and right in lockstep with clicks...</p>
        </div>
      )}

      {phase === 'unpaced_silent' && (
        <div className="bg-zinc-950 text-white border border-zinc-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center shadow-xl select-none">
          <span className="px-3 py-1 rounded-full bg-violet-900/60 text-violet-300 font-bold text-xs mb-3">
            SOUND MUTED — KEEP THE BEAT!
          </span>
          <div className="text-6xl font-black font-mono text-white my-3">
            {silentTimeLeft}s
          </div>
          <div className="text-sm font-bold text-violet-400 bg-violet-950/60 px-3 py-1 rounded-full border border-violet-800">
            {rockCount} Rhythms Rocked
          </div>
        </div>
      )}

      {phase === 'results' && result && (
        <div className="flex flex-col gap-5">
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center">
                <Award className="w-8 h-8" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-violet-600 uppercase tracking-wider block">Internal Pacing Score</span>
                <div className="text-3xl font-black text-zinc-900">{result.pacingScore} / 100</div>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 inline-block mt-1">
                  {result.driftTendency} ({result.bpmDriftSigned > 0 ? `+${result.bpmDriftSigned}` : result.bpmDriftSigned} BPM)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full sm:w-auto text-xs">
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Target Tempo</span>
                <span className="text-lg font-bold font-mono text-zinc-900">{result.targetBpm} BPM</span>
              </div>
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Your Pacing</span>
                <span className="text-lg font-bold font-mono text-violet-600">{result.realizedBpm} BPM</span>
              </div>
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Timing Jitter (CV)</span>
                <span className="text-lg font-bold font-mono text-amber-600">±{result.tempoStabilityCV}%</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl p-4 flex justify-between items-center shadow-xs">
            <button
              onClick={startTest}
              className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Retest Metronome
            </button>
            {isSaved && (
              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Saved
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
