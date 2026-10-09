import React, { useState, useEffect, useRef } from 'react';
import type { MotionSample } from '../../types/phoneSensors';
import type { SitToStandResult } from '../../types/gyroLab';
import { computeSitToStand } from '../../utils/gyroLabCalculations';
import { soundEngine } from '../../utils/audioCues';
import { saveSession } from '../../utils/sessionStorage';
import { Armchair, Play, RotateCcw, Award, CheckCircle2 } from 'lucide-react';

interface SitToStandTestProps {
  latestMotion: MotionSample | null;
  sensorHz: number;
  isSimulated: boolean;
}

export const SitToStandTest: React.FC<SitToStandTestProps> = ({
  latestMotion,
  sensorHz,
  isSimulated,
}) => {
  const [phase, setPhase] = useState<'idle' | 'countdown' | 'testing' | 'results'>('idle');
  const [countdownNum, setCountdownNum] = useState<number>(3);
  const [repsDone, setRepsDone] = useState<number>(0);
  const [result, setResult] = useState<SitToStandResult | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const targetReps = 5;
  const motionBufferRef = useRef<MotionSample[]>([]);
  const lastSurgeTimeRef = useRef<number>(0);

  useEffect(() => {
    if (phase !== 'testing' || !latestMotion) return;

    motionBufferRef.current.push(latestMotion);

    // Dynamic surge detection
    const surge = latestMotion.magnitude - 9.81;
    if (surge > 1.8) {
      const now = performance.now();
      if (now - lastSurgeTimeRef.current > 1200) {
        lastSurgeTimeRef.current = now;
        soundEngine.tick();
        setRepsDone((prev) => {
          const next = prev + 1;
          if (next >= targetReps) {
            setTimeout(finishTest, 600);
          }
          return next;
        });
      }
    }
  }, [phase, latestMotion]);

  // Simulator fallback
  useEffect(() => {
    if (phase !== 'testing' || !isSimulated) return;

    const interval = setInterval(() => {
      setRepsDone((prev) => {
        const next = prev + 1;
        soundEngine.tick();
        if (next >= targetReps) {
          clearInterval(interval);
          setTimeout(finishTest, 600);
        }
        return next;
      });
    }, 1800);

    return () => clearInterval(interval);
  }, [phase, isSimulated]);

  const startCountdown = () => {
    motionBufferRef.current = [];
    setRepsDone(0);
    setResult(null);
    setIsSaved(false);
    setPhase('countdown');
    setCountdownNum(3);
    soundEngine.tick();

    let count = 3;
    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdownNum(count);
        soundEngine.tick();
      } else {
        clearInterval(interval);
        setPhase('testing');
        soundEngine.startPing();
      }
    }, 1000);
  };

  const finishTest = () => {
    soundEngine.completeFanfare();
    const computed = computeSitToStand([...motionBufferRef.current], targetReps);
    setResult(computed);
    setPhase('results');

    saveSession({
      id: `sit-to-stand-${Date.now()}`,
      timestamp: new Date().toISOString(),
      experimentType: 'phone_steadiness',
      protocolVersion: '5.0-sit-to-stand-surge-smoothness',
      hardwareName: isSimulated ? 'Phone Sensor Simulator' : 'Smartphone IMU',
      controllerId: 'Phone Built-In IMU',
      settingsSummary: { targetReps: 5 },
      sampleCount: motionBufferRef.current.length,
      hasInterruptedTrials: false,
      dataQualityWarnings: [],
    }).then(() => setIsSaved(true)).catch(console.error);
  };

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex justify-between items-center pb-3 border-b border-zinc-100">
        <div>
          <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
            <Armchair className="w-5 h-5 text-violet-600" />
            5x Sit-to-Stand Test
          </h3>
          <p className="text-xs text-zinc-500">
            Keep phone in pocket or against chest. Stand up fully and sit down 5 times as quickly and smoothly as possible.
          </p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 font-semibold">
          {isSimulated ? 'Simulator Mode' : `${sensorHz} Hz IMU`}
        </span>
      </div>

      {phase === 'idle' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-8 flex flex-col items-center text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mb-4">
            <Armchair className="w-8 h-8" />
          </div>
          <h4 className="text-sm font-bold text-zinc-900 mb-1">Functional Leg Power & Smoothness</h4>
          <p className="text-xs text-zinc-500 max-w-sm mb-6 leading-relaxed">
            Start seated in a standard chair with arms folded across your chest. Stand all the way up and sit back down 5 consecutive times.
          </p>
          <button
            onClick={startCountdown}
            className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            Begin Sit-to-Stand (5 Reps)
          </button>
        </div>
      )}

      {phase === 'countdown' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-violet-600 mb-2">Sit on chair</span>
          <div className="text-7xl font-black text-zinc-900 my-4 animate-bounce">
            {countdownNum}
          </div>
          <p className="text-xs text-zinc-400">Arms crossed across chest, get ready to stand...</p>
        </div>
      )}

      {phase === 'testing' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-8 flex flex-col items-center justify-center shadow-xs">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">STAND UP & SIT DOWN</span>
          <div className="text-6xl font-black font-mono text-zinc-900 my-2">
            {repsDone} <span className="text-2xl text-zinc-400 font-medium">/ {targetReps}</span>
          </div>

          <div className="w-full max-w-md bg-zinc-100 h-2.5 rounded-full overflow-hidden my-6">
            <div
              style={{ width: `${Math.min(100, (repsDone / targetReps) * 100)}%` }}
              className="h-full bg-violet-600 transition-all duration-300"
            />
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
                <span className="text-[10px] font-bold text-violet-600 uppercase tracking-wider block">Total 5-Rep Duration</span>
                <div className="text-3xl font-black text-zinc-900">{result.totalDurationSeconds}s</div>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 inline-block mt-1">
                  {result.powerRating}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full sm:w-auto text-xs">
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Mean Rise Time</span>
                <span className="text-lg font-bold font-mono text-violet-600">{result.meanRiseDurationSeconds}s</span>
              </div>
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Smoothness Score</span>
                <span className="text-lg font-bold font-mono text-zinc-900">{result.smoothnessIndex} / 100</span>
              </div>
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Peak Surge</span>
                <span className="text-lg font-bold font-mono text-zinc-700">+{result.peakSurgeAccelerationMs2} m/s²</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl p-4 flex justify-between items-center shadow-xs">
            <button
              onClick={startCountdown}
              className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Retest Sit-to-Stand
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
