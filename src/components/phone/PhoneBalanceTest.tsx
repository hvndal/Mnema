import React, { useState, useEffect, useRef } from 'react';
import type { OrientationSample, BalanceTestResult } from '../../types/phoneSensors';
import { computeBalanceResult } from '../../utils/phoneSensorCalculations';
import { soundEngine } from '../../utils/audioCues';
import { saveSession } from '../../utils/sessionStorage';
import { Eye, EyeOff, Play, RotateCcw, Award, CheckCircle2, Compass } from 'lucide-react';

interface PhoneBalanceTestProps {
  latestOrientation: OrientationSample | null;
  sensorHz: number;
  isSimulated: boolean;
}

export const PhoneBalanceTest: React.FC<PhoneBalanceTestProps> = ({
  latestOrientation,
  sensorHz,
  isSimulated,
}) => {
  const [stage, setStage] = useState<'idle' | 'countdown_open' | 'running_open' | 'transition' | 'countdown_closed' | 'running_closed' | 'results'>('idle');
  const [countdownNum, setCountdownNum] = useState<number>(3);
  const [timeLeft, setTimeLeft] = useState<number>(15);
  const [result, setResult] = useState<BalanceTestResult | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const phaseDuration = 15; // 15 seconds per phase
  const openSamplesRef = useRef<OrientationSample[]>([]);
  const closedSamplesRef = useRef<OrientationSample[]>([]);
  const timerRef = useRef<any>(null);

  // Sample collection
  useEffect(() => {
    if (stage === 'running_open' && latestOrientation) {
      openSamplesRef.current.push(latestOrientation);
    } else if (stage === 'running_closed' && latestOrientation) {
      closedSamplesRef.current.push(latestOrientation);
    }
  }, [stage, latestOrientation]);

  // Phase 1: Start Open Eyes
  const startOpenSequence = () => {
    openSamplesRef.current = [];
    closedSamplesRef.current = [];
    setResult(null);
    setIsSaved(false);
    setStage('countdown_open');
    setCountdownNum(3);
    soundEngine.tick();

    let count = 3;
    const countInterval = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdownNum(count);
        soundEngine.tick();
      } else {
        clearInterval(countInterval);
        startOpenMeasurement();
      }
    }, 1000);
  };

  const startOpenMeasurement = () => {
    setStage('running_open');
    setTimeLeft(phaseDuration);
    soundEngine.startPing();

    const startTime = performance.now();
    timerRef.current = setInterval(() => {
      const elapsed = (performance.now() - startTime) / 1000;
      const remaining = Math.max(0, Math.ceil(phaseDuration - elapsed));
      setTimeLeft(remaining);

      if (elapsed >= phaseDuration) {
        clearInterval(timerRef.current);
        soundEngine.phaseTransition();
        setStage('transition');
      }
    }, 100);
  };

  // Phase 2: Start Closed Eyes
  const startClosedSequence = () => {
    setStage('countdown_closed');
    setCountdownNum(3);
    soundEngine.tick();

    let count = 3;
    const countInterval = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdownNum(count);
        soundEngine.tick();
      } else {
        clearInterval(countInterval);
        startClosedMeasurement();
      }
    }, 1000);
  };

  const startClosedMeasurement = () => {
    setStage('running_closed');
    setTimeLeft(phaseDuration);
    soundEngine.startPing();

    const startTime = performance.now();
    timerRef.current = setInterval(() => {
      const elapsed = (performance.now() - startTime) / 1000;
      const remaining = Math.max(0, Math.ceil(phaseDuration - elapsed));
      setTimeLeft(remaining);

      if (elapsed >= phaseDuration) {
        clearInterval(timerRef.current);
        finishTest();
      }
    }, 100);
  };

  const finishTest = () => {
    soundEngine.completeFanfare();
    const computed = computeBalanceResult(
      [...openSamplesRef.current],
      [...closedSamplesRef.current]
    );
    setResult(computed);
    setStage('results');

    // Auto-save to IndexedDB session history
    saveSession({
      id: `balance-${Date.now()}`,
      timestamp: new Date().toISOString(),
      experimentType: 'phone_balance',
      protocolVersion: '4.0-phone-gyro-romberg-ratio',
      hardwareName: isSimulated ? 'Phone Sensor Simulator (Desktop)' : 'Smartphone Gyro/IMU',
      controllerId: 'Phone Built-In IMU',
      settingsSummary: { phaseDurationSeconds: phaseDuration },
      sampleCount: computed.eyesOpen.sampleCount + computed.eyesClosed.sampleCount,
      hasInterruptedTrials: false,
      dataQualityWarnings: [],
      balanceResult: computed,
    }).then(() => setIsSaved(true)).catch(console.error);
  };

  const cancelTest = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setStage('idle');
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-4 border-b border-zinc-100">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
            <Compass className="w-5 h-5 text-violet-600" />
            Vestibular vs Visual Balance (Romberg Test)
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Hold your phone flat against your chest, stand on one leg: 15s Eyes Open vs 15s Eyes Closed. The sway ratio measures your vestibular resilience.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 font-semibold border border-violet-200">
            {isSimulated ? 'Simulator Mode' : `${sensorHz} Hz Hardware`}
          </span>
        </div>
      </div>

      {/* Stage: Idle Instructions */}
      {stage === 'idle' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-8 flex flex-col items-center text-center shadow-xs">
          <div className="w-20 h-20 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mb-4">
            <Compass className="w-10 h-10 animate-spin" style={{ animationDuration: '8s' }} />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 mb-2">Two-Phase Single-Leg Balance</h3>
          <p className="text-xs text-zinc-500 max-w-md mb-6 leading-relaxed">
            Hold the phone firmly against your sternum (center of your chest). Stand on your dominant leg with your other foot hovering off the floor. Acoustic beeps will guide your eyes closed phase.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg mb-8 text-left text-xs">
            <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200">
              <div className="flex items-center gap-2 text-emerald-800 font-bold mb-1">
                <Eye className="w-4 h-4" />
                Phase 1: Eyes Open (15s)
              </div>
              <span className="text-emerald-700 text-[11px] leading-relaxed">
                Fixate on a steady point on the wall. Measures your baseline multi-sensory balance envelope.
              </span>
            </div>
            <div className="p-4 bg-violet-50/60 rounded-xl border border-violet-200">
              <div className="flex items-center gap-2 text-violet-800 font-bold mb-1">
                <EyeOff className="w-4 h-4" />
                Phase 2: Eyes Closed (15s)
              </div>
              <span className="text-violet-700 text-[11px] leading-relaxed">
                Close your eyes upon hearing the acoustic chime. Tests pure vestibular and inner-ear balance.
              </span>
            </div>
          </div>

          <button
            onClick={startOpenSequence}
            className="px-8 py-3.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-sm shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            Begin Phase 1 (Eyes Open)
          </button>
        </div>
      )}

      {/* Countdown Open */}
      {stage === 'countdown_open' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-2">Phase 1: Eyes Open</span>
          <div className="text-7xl font-black text-zinc-900 my-4 animate-bounce">
            {countdownNum}
          </div>
          <p className="text-xs text-zinc-400">Stand on one foot, phone against chest, eyes focused forward...</p>
        </div>
      )}

      {/* Running Open */}
      {stage === 'running_open' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-8 flex flex-col items-center justify-center shadow-xs">
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full font-bold text-xs mb-4">
            <Eye className="w-4 h-4" />
            PHASE 1: EYES OPEN
          </div>

          <div className="text-5xl font-black font-mono text-zinc-900 my-2">
            {timeLeft}s
          </div>
          <span className="text-xs text-zinc-400 font-medium">Keep eyes fixed on a wall point</span>

          <div className="w-full max-w-md bg-zinc-100 h-2 rounded-full overflow-hidden my-6">
            <div
              style={{ width: `${((phaseDuration - timeLeft) / phaseDuration) * 100}%` }}
              className="h-full bg-emerald-500 transition-all duration-100"
            />
          </div>

          <button onClick={cancelTest} className="text-xs text-zinc-400 hover:text-rose-600 font-semibold cursor-pointer">
            Cancel Test
          </button>
        </div>
      )}

      {/* Transition Screen */}
      {stage === 'transition' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-10 flex flex-col items-center text-center shadow-xs">
          <div className="w-16 h-16 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center mb-4">
            <EyeOff className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 mb-1">Phase 1 Complete!</h3>
          <p className="text-xs text-zinc-500 max-w-sm mb-6">
            Keep your one-legged stance. You will now close your eyes when the countdown ends.
            A loud acoustic chime will sound when the 15 seconds are finished.
          </p>
          <button
            onClick={startClosedSequence}
            className="px-8 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-sm shadow-sm cursor-pointer"
          >
            Ready for Phase 2 (Eyes Closed)
          </button>
        </div>
      )}

      {/* Countdown Closed */}
      {stage === 'countdown_closed' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-violet-600 mb-2">Phase 2: Eyes Closed</span>
          <div className="text-7xl font-black text-zinc-900 my-4 animate-bounce">
            {countdownNum}
          </div>
          <p className="text-xs text-zinc-400">Close your eyes NOW. Listen for the ending chime...</p>
        </div>
      )}

      {/* Running Closed */}
      {stage === 'running_closed' && (
        <div className="bg-zinc-900 text-white border border-zinc-800 rounded-2xl p-10 flex flex-col items-center justify-center shadow-lg">
          <div className="flex items-center gap-2 px-3 py-1 bg-violet-900/60 text-violet-300 rounded-full font-bold text-xs mb-4">
            <EyeOff className="w-4 h-4" />
            EYES CLOSED — DO NOT LOOK
          </div>

          <div className="text-6xl font-black font-mono text-white my-4">
            {timeLeft}s
          </div>
          <span className="text-xs text-zinc-400 font-medium">Keep eyes firmly shut. Chime will signal completion.</span>

          <div className="w-full max-w-md bg-zinc-800 h-2 rounded-full overflow-hidden my-6">
            <div
              style={{ width: `${((phaseDuration - timeLeft) / phaseDuration) * 100}%` }}
              className="h-full bg-violet-500 transition-all duration-100"
            />
          </div>

          <button onClick={cancelTest} className="text-xs text-zinc-500 hover:text-rose-400 font-semibold cursor-pointer">
            Cancel Test
          </button>
        </div>
      )}

      {/* Results View */}
      {stage === 'results' && result && (
        <div className="flex flex-col gap-6">
          {/* Main Score Banner */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center">
                <Award className="w-8 h-8" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-violet-600 uppercase tracking-wider block">Romberg Sway Ratio</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-zinc-900">{result.rombergRatio}x</span>
                  <span className="text-sm font-semibold text-zinc-400">closed/open</span>
                </div>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-violet-50 text-violet-800 border border-violet-200 inline-block mt-1">
                  {result.classification}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full md:w-auto text-xs">
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Visual Reliance Index</span>
                <span className="text-xl font-bold font-mono text-violet-600">{result.visualReliancePercent}%</span>
              </div>
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Stability Score</span>
                <span className="text-xl font-bold font-mono text-emerald-600">{result.posturalStabilityScore} / 100</span>
              </div>
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Closed Sway Speed</span>
                <span className="text-xl font-bold font-mono text-zinc-700">{result.eyesClosed.meanVelocity} °/s</span>
              </div>
            </div>
          </div>

          {/* Dual Statokinesiogram Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Visualizer Plot */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-zinc-900">2D Postural Statokinesiogram</h4>
                  <p className="text-xs text-zinc-500">Center of sway trajectory (tilt deviation in degrees)</p>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-semibold">
                  <span className="flex items-center gap-1 text-emerald-600">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Open
                  </span>
                  <span className="flex items-center gap-1 text-violet-600">
                    <span className="w-2 h-2 rounded-full bg-violet-600" /> Closed
                  </span>
                </div>
              </div>

              {/* 2D Sway Canvas/SVG */}
              <div className="relative w-full h-64 bg-zinc-50 rounded-xl border border-zinc-200 overflow-hidden flex items-center justify-center">
                <div className="w-full h-px bg-zinc-200 absolute" />
                <div className="h-full w-px bg-zinc-200 absolute" />

                {/* SVG Paths */}
                <svg className="w-full h-full absolute inset-0" viewBox="-15 -15 30 30">
                  {/* Eyes Open Trajectory */}
                  {result.eyesOpen.trajectory.length > 1 && (
                    <polyline
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="0.6"
                      opacity="0.8"
                      points={result.eyesOpen.trajectory.map((p) => `${p.x},${p.y}`).join(' ')}
                    />
                  )}
                  {/* Eyes Closed Trajectory */}
                  {result.eyesClosed.trajectory.length > 1 && (
                    <polyline
                      fill="none"
                      stroke="#7c3aed"
                      strokeWidth="0.8"
                      opacity="0.9"
                      points={result.eyesClosed.trajectory.map((p) => `${p.x},${p.y}`).join(' ')}
                    />
                  )}
                </svg>

                <span className="absolute bottom-2 right-2 text-[10px] font-mono text-zinc-400">Scale: ±15°</span>
              </div>
            </div>

            {/* Detailed Phase Metrics */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-zinc-900 mb-3">Phase-by-Phase Psychophysics</h4>
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-emerald-800 block">Eyes Open (Baseline)</span>
                      <span className="text-[11px] text-emerald-600">Sway path: {result.eyesOpen.pathLength}° • 95% Area: {result.eyesOpen.area95}°²</span>
                    </div>
                    <span className="font-mono font-bold text-emerald-700">{result.eyesOpen.meanVelocity} °/s</span>
                  </div>

                  <div className="p-3 bg-violet-50/50 rounded-xl border border-violet-100 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-violet-800 block">Eyes Closed (Vestibular Only)</span>
                      <span className="text-[11px] text-violet-600">Sway path: {result.eyesClosed.pathLength}° • 95% Area: {result.eyesClosed.area95}°²</span>
                    </div>
                    <span className="font-mono font-bold text-violet-700">{result.eyesClosed.meanVelocity} °/s</span>
                  </div>
                </div>
              </div>

              {/* Explainer */}
              <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200 text-[11px] text-zinc-600 leading-relaxed">
                <strong>Why the Romberg Ratio matters:</strong> When you close your eyes, you disconnect the ocular balance pathway, forcing your brain to rely 100% on inner-ear vestibular canals and ankle proprioceptors. A ratio around 1.5–2.0x is healthy. Ratios above 2.5x indicate strong visual dominance.
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-zinc-200 rounded-2xl p-4 shadow-xs">
            <button
              onClick={startOpenSequence}
              className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Retest Balance
            </button>

            {isSaved && (
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Saved to Session History
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
