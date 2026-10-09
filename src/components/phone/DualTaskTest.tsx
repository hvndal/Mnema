import React, { useState, useEffect, useRef } from 'react';
import type { MotionSample } from '../../types/phoneSensors';
import type { DualTaskResult } from '../../types/gyroLab';
import { computeDualTaskCost } from '../../utils/gyroLabCalculations';
import { soundEngine } from '../../utils/audioCues';
import { saveSession } from '../../utils/sessionStorage';
import { Brain, Play, RotateCcw, Award, CheckCircle2 } from 'lucide-react';

interface DualTaskTestProps {
  latestMotion: MotionSample | null;
  sensorHz: number;
  isSimulated: boolean;
}

export const DualTaskTest: React.FC<DualTaskTestProps> = ({
  latestMotion,
  sensorHz,
  isSimulated,
}) => {
  const [phase, setPhase] = useState<'idle' | 'phase1_intro' | 'phase1_running' | 'phase2_intro' | 'phase2_running' | 'results'>('idle');
  const [timeLeft, setTimeLeft] = useState<number>(15);
  const [currentMathPrompt, setCurrentMathPrompt] = useState<string>('100 - 7 = ?');
  const mathAnswers = [93, 86, 79, 72];
  const [mathIndex, setMathIndex] = useState<number>(0);
  const [p1Score, setP1Score] = useState<number>(85);
  const [result, setResult] = useState<DualTaskResult | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const durationSec = 15;
  const p1BufferRef = useRef<MotionSample[]>([]);
  const p2BufferRef = useRef<MotionSample[]>([]);

  useEffect(() => {
    if (!latestMotion) return;
    if (phase === 'phase1_running') p1BufferRef.current.push(latestMotion);
    if (phase === 'phase2_running') p2BufferRef.current.push(latestMotion);
  }, [phase, latestMotion]);

  const startPhase1 = () => {
    p1BufferRef.current = [];
    setTimeLeft(durationSec);
    setPhase('phase1_running');
    soundEngine.startPing();

    const start = performance.now();
    const timer = setInterval(() => {
      const elapsed = (performance.now() - start) / 1000;
      const rem = Math.max(0, Math.ceil(durationSec - elapsed));
      setTimeLeft(rem);

      if (elapsed >= durationSec) {
        clearInterval(timer);
        soundEngine.tick();
        // Compute baseline stability
        const mags = p1BufferRef.current.map((s) => s.magnitude);
        const mean = mags.reduce((a, b) => a + b, 0) / (mags.length || 1);
        const variance = mags.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (mags.length || 1);
        const rms = Math.sqrt(variance);
        const score = Math.max(20, Math.min(100, Math.round(100 - rms * 80)));
        setP1Score(score);
        setPhase('phase2_intro');
      }
    }, 100);
  };

  const startPhase2 = () => {
    p2BufferRef.current = [];
    setTimeLeft(durationSec);
    setMathIndex(0);
    setPhase('phase2_running');
    soundEngine.startPing();

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

  const handleSelectMath = () => {
    soundEngine.tick();
    const nextIdx = mathIndex + 1;
    setMathIndex(nextIdx);
    if (nextIdx === 1) setCurrentMathPrompt('93 - 7 = ?');
    else if (nextIdx === 2) setCurrentMathPrompt('86 - 7 = ?');
    else if (nextIdx === 3) setCurrentMathPrompt('79 - 7 = ?');
  };

  const finishTest = () => {
    soundEngine.completeFanfare();
    const mags = p2BufferRef.current.map((s) => s.magnitude);
    const mean = mags.reduce((a, b) => a + b, 0) / (mags.length || 1);
    const variance = mags.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (mags.length || 1);
    const rms = Math.sqrt(variance);
    const p2Score = Math.max(10, Math.min(100, Math.round(100 - rms * 110)));

    const computed = computeDualTaskCost(p1Score, p2Score, 4, 4);
    setResult(computed);
    setPhase('results');

    saveSession({
      id: `dual-task-${Date.now()}`,
      timestamp: new Date().toISOString(),
      experimentType: 'phone_steadiness',
      protocolVersion: '5.0-dual-task-serial-subtraction-cost',
      hardwareName: isSimulated ? 'Phone Sensor Simulator' : 'Smartphone IMU',
      controllerId: 'Phone Built-In IMU',
      settingsSummary: { p1Score, p2Score },
      sampleCount: p1BufferRef.current.length + p2BufferRef.current.length,
      hasInterruptedTrials: false,
      dataQualityWarnings: [],
    }).then(() => setIsSaved(true)).catch(console.error);
  };

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex justify-between items-center pb-3 border-b border-zinc-100">
        <div>
          <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
            <Brain className="w-5 h-5 text-violet-600" />
            Dual-Task Cost (Cognitive-Motor Interference)
          </h3>
          <p className="text-xs text-zinc-500">
            Hold steady in silence (15s baseline), then repeat while counting backwards by 7s. Measures how much your motor stillness degrades under mental workload.
          </p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 font-semibold">
          {isSimulated ? 'Simulator Mode' : `${sensorHz} Hz IMU`}
        </span>
      </div>

      {phase === 'idle' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-8 flex flex-col items-center text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mb-4">
            <Brain className="w-8 h-8" />
          </div>
          <h4 className="text-sm font-bold text-zinc-900 mb-1">Serial-7 Subtraction vs Motor Steadiness</h4>
          <p className="text-xs text-zinc-500 max-w-sm mb-6 leading-relaxed">
            First, hold the phone still with full concentration for 15s. Next, perform the identical hold while answering mental arithmetic (100 - 7 = 93, 86, 79...). The drop in stillness isolates shared prefrontal cortex capacity.
          </p>
          <button
            onClick={startPhase1}
            className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            Start Phase 1: Pure Motor Baseline (15s)
          </button>
        </div>
      )}

      {phase === 'phase1_running' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-8 flex flex-col items-center justify-center shadow-xs">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">PHASE 1: BASELINE STILLNESS</span>
          <div className="text-6xl font-black font-mono text-zinc-900 my-2">{timeLeft}s</div>
          <p className="text-xs text-zinc-400">Hold as still as possible without any distractions...</p>
        </div>
      )}

      {phase === 'phase2_intro' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-8 flex flex-col items-center text-center shadow-xs">
          <span className="px-3 py-1 rounded-full bg-violet-100 text-violet-800 font-bold text-xs mb-3">
            PHASE 1 COMPLETE (Score: {p1Score}/100)
          </span>
          <h4 className="text-lg font-bold text-zinc-900 mb-1">Phase 2: Serial-7 Dual Task</h4>
          <p className="text-xs text-zinc-500 max-w-sm mb-6">
            Keep holding steady with your arm while tapping the correct answers to serial subtractions on screen.
          </p>
          <button
            onClick={startPhase2}
            className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer"
          >
            Begin Phase 2 with Mental Math
          </button>
        </div>
      )}

      {phase === 'phase2_running' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-8 flex flex-col items-center justify-center shadow-xs">
          <span className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-2">HOLD STEADY & SOLVE MATH</span>
          <div className="text-4xl font-black font-mono text-zinc-900 my-1">{timeLeft}s</div>

          <div className="p-4 bg-violet-50 border border-violet-200 rounded-2xl my-4 text-center w-full max-w-xs">
            <span className="text-xs text-violet-600 font-semibold uppercase block mb-1">Solve in your head:</span>
            <div className="text-2xl font-black text-violet-900">{currentMathPrompt}</div>
            <button
              onClick={handleSelectMath}
              className="mt-3 px-6 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
            >
              {mathAnswers[mathIndex] ?? 72} (Tap to Confirm)
            </button>
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
                <span className="text-[10px] font-bold text-violet-600 uppercase tracking-wider block">Cognitive-Motor Interference</span>
                <div className="text-3xl font-black text-zinc-900">{result.dualTaskCostPercentage}% Drop</div>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 inline-block mt-1">
                  {result.interferenceCategory}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full sm:w-auto text-xs">
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Baseline Stillness</span>
                <span className="text-lg font-bold font-mono text-emerald-600">{result.baselineStabilityScore} / 100</span>
              </div>
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Mental Math Stillness</span>
                <span className="text-lg font-bold font-mono text-violet-600">{result.dualTaskStabilityScore} / 100</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl p-4 flex justify-between items-center shadow-xs">
            <button
              onClick={startPhase1}
              className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Retest Dual-Task Cost
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
