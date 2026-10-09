import React, { useState } from 'react';
import type { OrientationSample } from '../../types/phoneSensors';
import type { SubjectiveVerticalResult } from '../../types/gyroLab';
import { computeSubjectiveVertical } from '../../utils/gyroLabCalculations';
import { soundEngine } from '../../utils/audioCues';
import { saveSession } from '../../utils/sessionStorage';
import { EyeOff, Play, RotateCcw, Award, CheckCircle2 } from 'lucide-react';

interface SubjectiveVerticalTestProps {
  latestOrientation: OrientationSample | null;
  sensorHz: number;
  isSimulated: boolean;
}

export const SubjectiveVerticalTest: React.FC<SubjectiveVerticalTestProps> = ({
  latestOrientation,
  sensorHz,
  isSimulated,
}) => {
  const [phase, setPhase] = useState<'idle' | 'blind_hold' | 'results'>('idle');
  const [result, setResult] = useState<SubjectiveVerticalResult | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const roll = latestOrientation ? Math.round(latestOrientation.gamma * 10) / 10 : 0;
  const pitch = latestOrientation ? Math.round(latestOrientation.beta * 10) / 10 : 0;

  const startTest = () => {
    setResult(null);
    setIsSaved(false);
    setPhase('blind_hold');
    soundEngine.startPing();
  };

  const lockInVertical = () => {
    soundEngine.completeFanfare();
    const trial = { actualRollDeg: roll, actualPitchDeg: pitch };
    const computed = computeSubjectiveVertical([trial]);
    setResult(computed);
    setPhase('results');

    saveSession({
      id: `svv-${Date.now()}`,
      timestamp: new Date().toISOString(),
      experimentType: 'phone_proprioception',
      protocolVersion: '5.0-subjective-visual-vertical',
      hardwareName: isSimulated ? 'Phone Sensor Simulator' : 'Smartphone Gyro',
      controllerId: 'Phone Built-In IMU',
      settingsSummary: { roll, pitch },
      sampleCount: 1,
      hasInterruptedTrials: false,
      dataQualityWarnings: [],
    }).then(() => setIsSaved(true)).catch(console.error);
  };

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex justify-between items-center pb-3 border-b border-zinc-100">
        <div>
          <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
            <EyeOff className="w-5 h-5 text-violet-600" />
            Subjective Visual Vertical (SVV)
          </h3>
          <p className="text-xs text-zinc-500">
            Eyes closed: hold the phone where “perfectly upright” feels. Tests otolith gravity perception against true 0.0° vertical.
          </p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 font-semibold">
          {isSimulated ? 'Simulator Mode' : `${sensorHz} Hz Gyro`}
        </span>
      </div>

      {phase === 'idle' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-8 flex flex-col items-center text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mb-4">
            <EyeOff className="w-8 h-8" />
          </div>
          <h4 className="text-sm font-bold text-zinc-900 mb-1">Inner-Ear Otolith Gravity Alignment</h4>
          <p className="text-xs text-zinc-500 max-w-sm mb-6 leading-relaxed">
            Close your eyes. Hold the phone in front of you and adjust its tilt until you are 100% convinced it is pointing straight up (0.0° vertical). Most people have a slight consistent directional bias.
          </p>
          <button
            onClick={startTest}
            className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            Begin SVV Test
          </button>
        </div>
      )}

      {phase === 'blind_hold' && (
        <div
          onClick={lockInVertical}
          className="bg-zinc-950 text-white border border-zinc-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center shadow-xl cursor-pointer select-none"
        >
          <span className="px-3 py-1 rounded-full bg-violet-900/60 text-violet-300 font-bold text-xs mb-3">
            EYES CLOSED
          </span>
          <h4 className="text-xl font-bold text-white mb-2">Align with Gravity</h4>
          <p className="text-xs text-zinc-400 max-w-xs mb-8">
            Hold where you feel the phone is perpendicular to earth. Tap anywhere to lock in your estimate.
          </p>
          <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-300 animate-pulse">
            👆 Tap Anywhere When Upright
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
                <span className="text-[10px] font-bold text-violet-600 uppercase tracking-wider block">Vertical Alignment Error</span>
                <div className="text-3xl font-black text-zinc-900">{result.totalVerticalErrorDeg}° off</div>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 inline-block mt-1">
                  {result.otolithAcuityRating}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full sm:w-auto text-xs">
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Roll (Lateral) Error</span>
                <span className="text-lg font-bold font-mono text-violet-600">{result.meanRollDeviationDeg}°</span>
              </div>
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Pitch Error</span>
                <span className="text-lg font-bold font-mono text-zinc-900">{result.meanPitchDeviationDeg}°</span>
              </div>
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Bias Direction</span>
                <span className="text-lg font-bold font-mono text-amber-600">{result.tiltBiasDirection}</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl p-4 flex justify-between items-center shadow-xs">
            <button
              onClick={startTest}
              className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Retest SVV
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
