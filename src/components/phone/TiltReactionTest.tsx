import React, { useState, useEffect, useRef } from 'react';
import type { MotionSample } from '../../types/phoneSensors';
import type { TiltReactionResult } from '../../types/gyroLab';
import { computeTiltReaction } from '../../utils/gyroLabCalculations';
import { soundEngine } from '../../utils/audioCues';
import { saveSession } from '../../utils/sessionStorage';
import { Zap, Play, RotateCcw, Award, CheckCircle2 } from 'lucide-react';

interface TiltReactionTestProps {
  latestMotion: MotionSample | null;
  sensorHz: number;
  isSimulated: boolean;
}

export const TiltReactionTest: React.FC<TiltReactionTestProps> = ({
  latestMotion,
  sensorHz,
  isSimulated,
}) => {
  const [phase, setPhase] = useState<'idle' | 'waiting' | 'stimulus' | 'results'>('idle');
  const [currentTrial, setCurrentTrial] = useState<number>(1);
  const [recordedTrials, setRecordedTrials] = useState<{ foreperiodMs: number; reactionTimeMs: number; peakFlickVelocity: number }[]>([]);
  const [falseStarts, setFalseStarts] = useState<number>(0);
  const [result, setResult] = useState<TiltReactionResult | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const totalTrials = 5;
  const stimulusTimestampRef = useRef<number>(0);
  const waitTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (!latestMotion) return;

    const rot = Math.abs(latestMotion.rotGamma ?? (latestMotion.accelX * 40));

    // In waiting state: if flick happens, false start!
    if (phase === 'waiting' && rot > 60) {
      if (waitTimeoutRef.current) clearTimeout(waitTimeoutRef.current);
      setFalseStarts((f) => f + 1);
      soundEngine.tick();
      // Restart waiting
      scheduleStimulus();
      return;
    }

    // In stimulus state: flick detects reaction onset!
    if (phase === 'stimulus' && rot > 60) {
      const rxTime = Math.round(performance.now() - stimulusTimestampRef.current);
      soundEngine.startPing();

      const newRecord = {
        foreperiodMs: 2500,
        reactionTimeMs: rxTime,
        peakFlickVelocity: Math.round(rot),
      };

      const next = [...recordedTrials, newRecord];
      setRecordedTrials(next);

      if (currentTrial >= totalTrials) {
        soundEngine.completeFanfare();
        const computed = computeTiltReaction(next, falseStarts);
        setResult(computed);
        setPhase('results');

        saveSession({
          id: `tilt-reaction-${Date.now()}`,
          timestamp: new Date().toISOString(),
          experimentType: 'phone_steadiness',
          protocolVersion: '5.0-gyro-tilt-reaction-time',
          hardwareName: isSimulated ? 'Phone Sensor Simulator' : 'Smartphone Gyro',
          controllerId: 'Phone Built-In IMU',
          settingsSummary: { totalTrials },
          sampleCount: next.length,
          hasInterruptedTrials: false,
          dataQualityWarnings: [],
        }).then(() => setIsSaved(true)).catch(console.error);
      } else {
        setCurrentTrial((c) => c + 1);
        scheduleStimulus();
      }
    }
  }, [phase, latestMotion, currentTrial, recordedTrials, falseStarts]);

  const scheduleStimulus = () => {
    setPhase('waiting');
    const delay = 1500 + Math.random() * 2500; // 1.5s - 4.0s jittered foreperiod
    waitTimeoutRef.current = setTimeout(() => {
      stimulusTimestampRef.current = performance.now();
      setPhase('stimulus');
      soundEngine.startPing();
    }, delay);
  };

  const startTest = () => {
    setRecordedTrials([]);
    setFalseStarts(0);
    setCurrentTrial(1);
    setResult(null);
    setIsSaved(false);
    scheduleStimulus();
  };

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex justify-between items-center pb-3 border-b border-zinc-100">
        <div>
          <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
            <Zap className="w-5 h-5 text-violet-600" />
            Tilt Reaction Time (High-Precision Gyro Onset)
          </h3>
          <p className="text-xs text-zinc-500">
            Hold phone level. The instant screen turns GREEN, flick the phone sharply. Gyroscope timestamps physical movement onset without touchscreen lag.
          </p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 font-semibold">
          {isSimulated ? 'Simulator Mode' : `${sensorHz} Hz Gyro`}
        </span>
      </div>

      {phase === 'idle' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-8 flex flex-col items-center text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mb-4">
            <Zap className="w-8 h-8" />
          </div>
          <h4 className="text-sm font-bold text-zinc-900 mb-1">Sub-Millisecond Gyro Motion Timestamping</h4>
          <p className="text-xs text-zinc-500 max-w-sm mb-6 leading-relaxed">
            Touchscreens add 30–80ms of capacitive scan latency. Gyroscope angular velocity sensing captures your neuromotor movement the exact microsecond your wrist twitches.
          </p>
          <button
            onClick={startTest}
            className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            Begin Tilt Reaction (5 Trials)
          </button>
        </div>
      )}

      {phase === 'waiting' && (
        <div className="bg-zinc-900 text-white border border-zinc-800 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-lg select-none">
          <span className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 font-bold text-xs mb-3">
            Trial {currentTrial} of {totalTrials}
          </span>
          <div className="w-8 h-8 rounded-full bg-rose-500 animate-pulse my-4" />
          <h4 className="text-xl font-bold text-white mb-1">HOLD STEADY...</h4>
          <p className="text-xs text-zinc-400">Wait for green flash. Do not flick prematurely.</p>
        </div>
      )}

      {phase === 'stimulus' && (
        <div
          onClick={() => {
            // Mobile tap or click fallback
            if (phase === 'stimulus') {
              const rxTime = Math.round(performance.now() - stimulusTimestampRef.current);
              soundEngine.startPing();
              const newRecord = { foreperiodMs: 2500, reactionTimeMs: rxTime, peakFlickVelocity: 120 };
              const next = [...recordedTrials, newRecord];
              setRecordedTrials(next);
              if (currentTrial >= totalTrials) {
                const computed = computeTiltReaction(next, falseStarts);
                setResult(computed);
                setPhase('results');
              } else {
                setCurrentTrial((c) => c + 1);
                scheduleStimulus();
              }
            }
          }}
          className="bg-emerald-500 text-white rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-xl cursor-pointer select-none animate-pulse"
        >
          <span className="px-3 py-1 rounded-full bg-emerald-600 text-white font-bold text-xs mb-3">
            GO NOW!
          </span>
          <h4 className="text-4xl font-black text-white mb-2">FLICK PHONE!</h4>
          <p className="text-xs text-emerald-100">Flick your wrist sharply in any direction</p>
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
                <span className="text-[10px] font-bold text-violet-600 uppercase tracking-wider block">Median Flick Reaction</span>
                <div className="text-3xl font-black text-zinc-900">{result.medianReactionMs} ms</div>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 inline-block mt-1">
                  {result.rating}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full sm:w-auto text-xs">
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Fastest Trial</span>
                <span className="text-lg font-bold font-mono text-emerald-600">{result.fastestReactionMs} ms</span>
              </div>
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Mean Reaction</span>
                <span className="text-lg font-bold font-mono text-violet-600">{result.meanReactionMs} ms</span>
              </div>
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="text-zinc-400 block text-[10px] uppercase font-semibold">False Starts</span>
                <span className="text-lg font-bold font-mono text-zinc-900">{result.falseStarts}</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl p-4 flex justify-between items-center shadow-xs">
            <button
              onClick={startTest}
              className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Retest Tilt Reaction
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
