import React, { useState, useEffect, useRef } from 'react';
import type { MotionSample } from '../../types/phoneSensors';
import type { SmoothnessResult } from '../../types/gyroLab';
import { computeSmoothnessScore } from '../../utils/gyroLabCalculations';
import { soundEngine } from '../../utils/audioCues';
import { saveSession } from '../../utils/sessionStorage';
import { Infinity as InfinityIcon, Play, RotateCcw, Award, CheckCircle2 } from 'lucide-react';

interface SmoothnessTestProps {
  latestMotion: MotionSample | null;
  sensorHz: number;
  isSimulated: boolean;
}

export const SmoothnessTest: React.FC<SmoothnessTestProps> = ({
  latestMotion,
  sensorHz,
  isSimulated,
}) => {
  const [phase, setPhase] = useState<'idle' | 'countdown' | 'tracing' | 'results'>('idle');
  const [countdownNum, setCountdownNum] = useState<number>(3);
  const [timeLeft, setTimeLeft] = useState<number>(12);
  const [result, setResult] = useState<SmoothnessResult | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const durationSec = 12;
  const motionBufferRef = useRef<MotionSample[]>([]);

  useEffect(() => {
    if (phase === 'tracing' && latestMotion) {
      motionBufferRef.current.push(latestMotion);
    }
  }, [phase, latestMotion]);

  const startCountdown = () => {
    motionBufferRef.current = [];
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
        setPhase('tracing');
        setTimeLeft(durationSec);
        soundEngine.startPing();
        startTimer();
      }
    }, 1000);
  };

  const startTimer = () => {
    const start = performance.now();
    const timer = setInterval(() => {
      const elapsed = (performance.now() - start) / 1000;
      const rem = Math.max(0, Math.ceil(durationSec - elapsed));
      setTimeLeft(rem);

      if (elapsed >= durationSec) {
        clearInterval(timer);
        finishTest();
      }
    }, 100);
  };

  const finishTest = () => {
    soundEngine.completeFanfare();
    const computed = computeSmoothnessScore([...motionBufferRef.current]);
    setResult(computed);
    setPhase('results');

    saveSession({
      id: `smoothness-${Date.now()}`,
      timestamp: new Date().toISOString(),
      experimentType: 'phone_steadiness',
      protocolVersion: '5.0-figure-eight-jerk-minimization',
      hardwareName: isSimulated ? 'Phone Sensor Simulator' : 'Smartphone Accelerometer',
      controllerId: 'Phone Built-In IMU',
      settingsSummary: { durationSec: 12 },
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
            <InfinityIcon className="w-5 h-5 text-violet-600" />
            Smoothness Score (Jerk Minimization)
          </h3>
          <p className="text-xs text-zinc-500">
            Trace a smooth, continuous figure-eight (∞) in the air for 12 seconds. Measures motion jerk and submovement segmentation.
          </p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 font-semibold">
          {isSimulated ? 'Simulator Mode' : `${sensorHz} Hz IMU`}
        </span>
      </div>

      {phase === 'idle' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-8 flex flex-col items-center text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mb-4">
            <InfinityIcon className="w-8 h-8" />
          </div>
          <h4 className="text-sm font-bold text-zinc-900 mb-1">Figure-Eight Air Tracing</h4>
          <p className="text-xs text-zinc-500 max-w-sm mb-6 leading-relaxed">
            Hold the phone in front of you. Move your whole arm to draw continuous, gentle horizontal figure-eight loops in the air. Minimize sudden stops, jerks, and stuttered accelerations.
          </p>
          <button
            onClick={startCountdown}
            className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            Begin Smoothness Test (12s)
          </button>
        </div>
      )}

      {phase === 'countdown' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-violet-600 mb-2">Prepare to Trace</span>
          <div className="text-7xl font-black text-zinc-900 my-4 animate-bounce">
            {countdownNum}
          </div>
          <p className="text-xs text-zinc-400">Arm extended, start your fluid figure-eight loop...</p>
        </div>
      )}

      {phase === 'tracing' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-8 flex flex-col items-center justify-center shadow-xs">
          <div className="flex items-center gap-2 text-violet-600 font-bold text-xs uppercase mb-2">
            <InfinityIcon className="w-4 h-4 animate-spin" style={{ animationDuration: '4s' }} />
            TRACE SMOOTH FIGURE-EIGHT IN AIR
          </div>
          <div className="text-6xl font-black font-mono text-zinc-900 my-2">
            {timeLeft}s
          </div>

          <div className="w-full max-w-md bg-zinc-100 h-2.5 rounded-full overflow-hidden my-6">
            <div
              style={{ width: `${((durationSec - timeLeft) / durationSec) * 100}%` }}
              className="h-full bg-violet-600 transition-all duration-100"
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
                <span className="text-[10px] font-bold text-violet-600 uppercase tracking-wider block">Fluidity Score</span>
                <div className="text-3xl font-black text-zinc-900">{result.smoothnessScore} / 100</div>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 inline-block mt-1">
                  {result.smoothnessClassification}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full sm:w-auto text-xs">
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Dimensionless Jerk</span>
                <span className="text-lg font-bold font-mono text-violet-600">{result.dimensionlessJerk}</span>
              </div>
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Trajectory Path</span>
                <span className="text-lg font-bold font-mono text-zinc-900">{result.pathLength} units</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl p-4 flex justify-between items-center shadow-xs">
            <button
              onClick={startCountdown}
              className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Retest Smoothness
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
