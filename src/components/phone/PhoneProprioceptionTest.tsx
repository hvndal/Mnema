import React, { useState } from 'react';
import type { OrientationSample, ProprioceptionTrial, ProprioceptionResult } from '../../types/phoneSensors';
import { computeProprioceptionResult } from '../../utils/phoneSensorCalculations';
import { soundEngine } from '../../utils/audioCues';
import { saveSession } from '../../utils/sessionStorage';
import { Target, RotateCcw, Award, CheckCircle2, Sliders, Smartphone } from 'lucide-react';

interface PhoneProprioceptionTestProps {
  latestOrientation: OrientationSample | null;
  sensorHz: number;
  isSimulated: boolean;
  simulatedPitch: number;
  setSimulatedPitch: (val: number) => void;
}

export const PhoneProprioceptionTest: React.FC<PhoneProprioceptionTestProps> = ({
  latestOrientation,
  sensorHz,
  isSimulated,
  simulatedPitch,
  setSimulatedPitch,
}) => {
  const [phase, setPhase] = useState<'idle' | 'blind_active' | 'reveal'>('idle');
  const [targetAngle, setTargetAngle] = useState<number>(30);
  const [currentTrialIndex, setCurrentTrialIndex] = useState<number>(1);
  const [trials, setTrials] = useState<ProprioceptionTrial[]>([]);
  const [finalResult, setFinalResult] = useState<ProprioceptionResult | null>(null);
  const [lastTrial, setLastTrial] = useState<ProprioceptionTrial | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const totalTrials = 3;
  const targetAnglesPool = [25, 30, 45, 35, 40];

  const currentAngle = latestOrientation ? Math.round(latestOrientation.beta * 10) / 10 : 0;

  const startTrial = (trialNum = 1) => {
    setIsSaved(false);
    // Pick target angle
    const chosen = targetAnglesPool[(trialNum - 1) % targetAnglesPool.length];
    setTargetAngle(chosen);
    setCurrentTrialIndex(trialNum);
    setPhase('blind_active');
    soundEngine.startPing();
  };

  const lockInEstimate = () => {
    soundEngine.completeFanfare();

    const signedError = Math.round((currentAngle - targetAngle) * 10) / 10;
    const absoluteError = Math.round(Math.abs(currentAngle - targetAngle) * 10) / 10;

    const trialRecord: ProprioceptionTrial = {
      trialIndex: currentTrialIndex,
      targetAngleDeg: targetAngle,
      actualAngleDeg: currentAngle,
      signedErrorDeg: signedError,
      absoluteErrorDeg: absoluteError,
      direction: 'pitch',
      confidenceDurationMs: 2000,
    };

    const nextTrials = [...trials, trialRecord];
    setTrials(nextTrials);
    setLastTrial(trialRecord);

    if (currentTrialIndex >= totalTrials) {
      const computed = computeProprioceptionResult(nextTrials);
      setFinalResult(computed);
      setPhase('reveal');

      // Auto-save to IndexedDB
      saveSession({
        id: `proprioception-${Date.now()}`,
        timestamp: new Date().toISOString(),
        experimentType: 'phone_proprioception',
        protocolVersion: '4.0-phone-gyro-blind-tilt',
        hardwareName: isSimulated ? 'Phone Sensor Simulator (Desktop)' : 'Smartphone Gyro/IMU',
        controllerId: 'Phone Built-In IMU',
        settingsSummary: { totalTrials, meanTargetAngle: targetAngle },
        sampleCount: nextTrials.length,
        hasInterruptedTrials: false,
        dataQualityWarnings: [],
        proprioceptionResult: computed,
      }).then(() => setIsSaved(true)).catch(console.error);
    } else {
      setPhase('reveal');
    }
  };

  const resetAll = () => {
    setTrials([]);
    setFinalResult(null);
    setLastTrial(null);
    setCurrentTrialIndex(1);
    setPhase('idle');
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-4 border-b border-zinc-100">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
            <Target className="w-5 h-5 text-violet-600" />
            Joint Angle Proprioception (Blind Tilt)
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Tilt the phone to exactly the target angle without looking. Tests internal articular position sense and kinesthetic calibration.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 font-semibold border border-violet-200">
            {isSimulated ? 'Simulator Mode' : `${sensorHz} Hz Hardware`}
          </span>
        </div>
      </div>

      {/* Desktop Simulation Control */}
      {isSimulated && phase === 'blind_active' && (
        <div className="p-4 bg-zinc-100 rounded-xl border border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-violet-600" />
            <span className="font-semibold text-zinc-700">Desktop Tilt Slider (Adjust without peeking)</span>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-zinc-500">0°</span>
            <input
              type="range"
              min="0"
              max="60"
              step="1"
              value={simulatedPitch}
              onChange={(e) => setSimulatedPitch(parseInt(e.target.value, 10))}
              className="w-48 accent-violet-600"
            />
            <span className="text-zinc-500">60°</span>
          </div>
        </div>
      )}

      {/* Phase: Idle Instructions */}
      {phase === 'idle' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-8 flex flex-col items-center text-center shadow-xs">
          <div className="w-20 h-20 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mb-4">
            <Smartphone className="w-10 h-10 rotate-12 transition-transform" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 mb-2">Articular Kinesthetic Calibration</h3>
          <p className="text-xs text-zinc-500 max-w-md mb-6 leading-relaxed">
            Proprioception is your body’s sixth sense: knowing where your limbs and joints are in space without vision. You will be prompted with a target angle (e.g. 30°), the screen will blindfold, and you will tilt your wrist to where you believe that angle is.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-lg mb-8 text-left text-xs">
            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
              <span className="font-bold text-zinc-800 block mb-1">1. Target Revealed</span>
              <span className="text-zinc-500">Memorize the assigned target degree before closing your eyes.</span>
            </div>
            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
              <span className="font-bold text-zinc-800 block mb-1">2. Blind Tilt</span>
              <span className="text-zinc-500">Screen goes dark. Tilt phone using your wrist joint.</span>
            </div>
            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
              <span className="font-bold text-zinc-800 block mb-1">3. Lock In</span>
              <span className="text-zinc-500">Tap screen anywhere to lock in your position and reveal error.</span>
            </div>
          </div>

          <button
            onClick={() => startTrial(1)}
            className="px-8 py-3.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-sm shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            Start Proprioception Test (3 Trials)
          </button>
        </div>
      )}

      {/* Phase: Blind Active Shield */}
      {phase === 'blind_active' && (
        <div
          onClick={lockInEstimate}
          className="bg-zinc-950 text-white border border-zinc-800 rounded-3xl p-10 min-h-[360px] flex flex-col items-center justify-center text-center cursor-pointer select-none shadow-xl transition-all"
        >
          <span className="px-3 py-1 rounded-full bg-violet-900/60 text-violet-300 font-bold text-xs uppercase tracking-wider mb-4">
            Trial {currentTrialIndex} of {totalTrials}
          </span>

          <div className="text-5xl font-black text-violet-400 mb-2">
            Target: {targetAngle}°
          </div>
          <p className="text-sm text-zinc-400 max-w-xs mb-8">
            Tilt phone to {targetAngle}° without looking at the screen.
          </p>

          <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-300 animate-pulse">
            👆 Tap Anywhere On Screen To Lock In
          </div>
        </div>
      )}

      {/* Phase: Reveal Screen */}
      {phase === 'reveal' && lastTrial && (
        <div className="flex flex-col gap-6">
          {/* Trial Score Card */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center">
                <Award className="w-8 h-8" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-violet-600 uppercase tracking-wider block">
                  {currentTrialIndex >= totalTrials ? 'Overall Accuracy' : `Trial ${currentTrialIndex} Result`}
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-zinc-900">
                    {finalResult ? `${finalResult.accuracyScore}/100` : `${Math.abs(lastTrial.signedErrorDeg)}° off`}
                  </span>
                  <span className="text-sm font-semibold text-zinc-400">
                    {lastTrial.signedErrorDeg > 0 ? '(Overshoot)' : lastTrial.signedErrorDeg < 0 ? '(Undershoot)' : '(Exact)'}
                  </span>
                </div>
                {finalResult && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 inline-block mt-1">
                    {finalResult.rating}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full md:w-auto text-xs">
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Target Angle</span>
                <span className="text-xl font-bold font-mono text-zinc-900">{lastTrial.targetAngleDeg}°</span>
              </div>
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Your Angle</span>
                <span className="text-xl font-bold font-mono text-violet-600">{lastTrial.actualAngleDeg}°</span>
              </div>
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Signed Error</span>
                <span className={`text-xl font-bold font-mono ${lastTrial.signedErrorDeg >= 0 ? 'text-amber-600' : 'text-sky-600'}`}>
                  {lastTrial.signedErrorDeg > 0 ? `+${lastTrial.signedErrorDeg}°` : `${lastTrial.signedErrorDeg}°`}
                </span>
              </div>
            </div>
          </div>

          {/* Visual Angular Comparison Arc */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col gap-4">
            <h4 className="text-sm font-bold text-zinc-900">Geometric Angle Comparison</h4>
            <div className="w-full h-56 bg-zinc-50 rounded-xl border border-zinc-200 relative flex items-center justify-center overflow-hidden">
              <svg className="w-64 h-64" viewBox="-120 -120 240 240">
                {/* Baseline 0 degree horizontal */}
                <line x1="-90" y1="0" x2="90" y2="0" stroke="#e4e4e7" strokeWidth="2" strokeDasharray="3 3" />
                <circle cx="0" cy="0" r="85" fill="none" stroke="#f4f4f5" strokeWidth="2" />

                {/* Target Angle Vector (Violet) */}
                {(() => {
                  const rad = (lastTrial.targetAngleDeg * Math.PI) / 180;
                  const x = 85 * Math.cos(rad);
                  const y = -85 * Math.sin(rad);
                  return (
                    <g>
                      <line x1="0" y1="0" x2={x} y2={y} stroke="#7c3aed" strokeWidth="3" strokeLinecap="round" />
                      <circle cx={x} cy={y} r="5" fill="#7c3aed" />
                    </g>
                  );
                })()}

                {/* User Angle Vector (Amber/Rose) */}
                {(() => {
                  const rad = (lastTrial.actualAngleDeg * Math.PI) / 180;
                  const x = 85 * Math.cos(rad);
                  const y = -85 * Math.sin(rad);
                  return (
                    <g>
                      <line x1="0" y1="0" x2={x} y2={y} stroke="#f59e0b" strokeWidth="3" strokeDasharray="4 2" strokeLinecap="round" />
                      <circle cx={x} cy={y} r="5" fill="#f59e0b" />
                    </g>
                  );
                })()}

                {/* Center Pivot */}
                <circle cx="0" cy="0" r="4" fill="#18181b" />
              </svg>

              <div className="absolute bottom-3 flex items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-violet-700">
                  <span className="w-3 h-0.5 bg-violet-600 rounded" /> Target ({lastTrial.targetAngleDeg}°)
                </span>
                <span className="flex items-center gap-1.5 text-amber-700">
                  <span className="w-3 h-0.5 bg-amber-500 rounded border-dashed" /> Your Position ({lastTrial.actualAngleDeg}°)
                </span>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-zinc-200 rounded-2xl p-4 shadow-xs">
            {currentTrialIndex < totalTrials ? (
              <button
                onClick={() => startTrial(currentTrialIndex + 1)}
                className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer"
              >
                Next Trial ({currentTrialIndex + 1} of {totalTrials})
              </button>
            ) : (
              <button
                onClick={resetAll}
                className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Retest Proprioception
              </button>
            )}

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
