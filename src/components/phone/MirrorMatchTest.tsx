import React, { useState } from 'react';
import type { OrientationSample } from '../../types/phoneSensors';
import type { MirrorMatchResult } from '../../types/gyroLab';
import { computeMirrorMatch } from '../../utils/gyroLabCalculations';
import { soundEngine } from '../../utils/audioCues';
import { saveSession } from '../../utils/sessionStorage';
import { Split, Play, RotateCcw, Award, CheckCircle2 } from 'lucide-react';

interface MirrorMatchTestProps {
  latestOrientation: OrientationSample | null;
  sensorHz: number;
  isSimulated: boolean;
}

export const MirrorMatchTest: React.FC<MirrorMatchTestProps> = ({
  latestOrientation,
  sensorHz,
  isSimulated,
}) => {
  const [phase, setPhase] = useState<'idle' | 'left_hand' | 'right_hand' | 'results'>('idle');
  const [leftAngle, setLeftAngle] = useState<number>(0);
  const [result, setResult] = useState<MirrorMatchResult | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const currentAngle = latestOrientation ? Math.round(latestOrientation.beta * 10) / 10 : 30;

  const startTest = () => {
    setResult(null);
    setIsSaved(false);
    setPhase('left_hand');
    soundEngine.startPing();
  };

  const lockLeftHand = () => {
    soundEngine.tick();
    setLeftAngle(currentAngle);
    setPhase('right_hand');
  };

  const lockRightHand = () => {
    soundEngine.completeFanfare();
    const rightAngle = currentAngle;
    const computed = computeMirrorMatch(leftAngle, rightAngle);
    setResult(computed);
    setPhase('results');

    saveSession({
      id: `mirror-match-${Date.now()}`,
      timestamp: new Date().toISOString(),
      experimentType: 'phone_proprioception',
      protocolVersion: '5.0-mirror-match-bilateral-asymmetry',
      hardwareName: isSimulated ? 'Phone Sensor Simulator' : 'Smartphone Gyro',
      controllerId: 'Phone Built-In IMU',
      settingsSummary: { leftAngle, rightAngle },
      sampleCount: 2,
      hasInterruptedTrials: false,
      dataQualityWarnings: [],
    }).then(() => setIsSaved(true)).catch(console.error);
  };

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex justify-between items-center pb-3 border-b border-zinc-100">
        <div>
          <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
            <Split className="w-5 h-5 text-violet-600" />
            Mirror Match (Bilateral Proprioception Symmetry)
          </h3>
          <p className="text-xs text-zinc-500">
            Tilt phone to any angle with left hand, then reproduce the identical angle with right hand. The gap is a left–right joint position mismatch.
          </p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 font-semibold">
          {isSimulated ? 'Simulator Mode' : `${sensorHz} Hz Gyro`}
        </span>
      </div>

      {phase === 'idle' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-8 flex flex-col items-center text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mb-4">
            <Split className="w-8 h-8" />
          </div>
          <h4 className="text-sm font-bold text-zinc-900 mb-1">Left vs Right Hemispheric Proprioception</h4>
          <p className="text-xs text-zinc-500 max-w-sm mb-6 leading-relaxed">
            Tilt the phone to any arbitrary angle using only your <strong>Left Hand</strong> and lock it in. Then switch hands and reproduce that exact physical angle with your <strong>Right Hand</strong>.
          </p>
          <button
            onClick={startTest}
            className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            Start Mirror Match
          </button>
        </div>
      )}

      {phase === 'left_hand' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-xs">
          <span className="px-3 py-1 rounded-full bg-violet-100 text-violet-800 font-bold text-xs mb-3">
            STEP 1: LEFT HAND
          </span>
          <h4 className="text-lg font-bold text-zinc-900 mb-1">Tilt to any comfortable angle</h4>
          <p className="text-xs text-zinc-500 mb-6">Hold with your left hand and feel the joint position in your wrist.</p>

          <div className="text-6xl font-black font-mono text-violet-600 my-4">
            {currentAngle}°
          </div>

          <button
            onClick={lockLeftHand}
            className="px-8 py-3.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-sm shadow-xs cursor-pointer mt-4"
          >
            Lock In Left Hand Position ({currentAngle}°)
          </button>
        </div>
      )}

      {phase === 'right_hand' && (
        <div className="bg-zinc-950 text-white border border-zinc-800 rounded-2xl p-10 flex flex-col items-center justify-center text-center shadow-lg">
          <span className="px-3 py-1 rounded-full bg-violet-900/60 text-violet-300 font-bold text-xs mb-3">
            STEP 2: RIGHT HAND (BLIND MATCH)
          </span>
          <h4 className="text-lg font-bold text-white mb-1">Reproduce that angle with right hand</h4>
          <p className="text-xs text-zinc-400 mb-8">Tilt your right wrist until it feels identical to what your left hand felt.</p>

          <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-300 animate-pulse mb-6">
            👆 Tap Anywhere Or Click Below When Matched
          </div>

          <button
            onClick={lockRightHand}
            className="px-8 py-3.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-sm shadow-xs cursor-pointer"
          >
            Lock In Right Hand Match
          </button>
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
                <span className="text-[10px] font-bold text-violet-600 uppercase tracking-wider block">Bilateral Symmetry Score</span>
                <div className="text-3xl font-black text-zinc-900">{result.bilateralScore} / 100</div>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 inline-block mt-1">
                  {result.classification}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full sm:w-auto text-xs">
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Left Angle</span>
                <span className="text-lg font-bold font-mono text-zinc-900">{result.leftHandAngleDeg}°</span>
              </div>
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Right Angle</span>
                <span className="text-lg font-bold font-mono text-violet-600">{result.rightHandAngleDeg}°</span>
              </div>
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Asymmetry Gap</span>
                <span className="text-lg font-bold font-mono text-amber-600">Δ {result.asymmetryDeltaDeg}°</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl p-4 flex justify-between items-center shadow-xs">
            <button
              onClick={startTest}
              className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Retest Mirror Match
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
