import React, { useState, useEffect, useRef } from 'react';
import type { MotionSample, OrientationSample } from '../../types/phoneSensors';
import type { TandemWalkResult } from '../../types/gyroLab';
import { computeTandemWalk } from '../../utils/gyroLabCalculations';
import { soundEngine } from '../../utils/audioCues';
import { saveSession } from '../../utils/sessionStorage';
import { Footprints, Play, RotateCcw, Award, CheckCircle2 } from 'lucide-react';

interface TandemWalkTestProps {
  latestMotion: MotionSample | null;
  latestOrientation: OrientationSample | null;
  sensorHz: number;
  isSimulated: boolean;
}

export const TandemWalkTest: React.FC<TandemWalkTestProps> = ({
  latestMotion,
  latestOrientation,
  sensorHz,
  isSimulated,
}) => {
  const [phase, setPhase] = useState<'idle' | 'countdown' | 'walking' | 'results'>('idle');
  const [countdownNum, setCountdownNum] = useState<number>(3);
  const [detectedSteps, setDetectedSteps] = useState<number>(0);
  const [currentWobble, setCurrentWobble] = useState<number>(0);
  const [result, setResult] = useState<TandemWalkResult | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const targetSteps = 10;
  const motionBufferRef = useRef<MotionSample[]>([]);
  const orientBufferRef = useRef<OrientationSample[]>([]);
  const lastStepTimeRef = useRef<number>(0);

  // Buffer collection & real-time step counter
  useEffect(() => {
    if (phase !== 'walking') return;

    if (latestMotion) {
      motionBufferRef.current.push(latestMotion);

      // Real-time step pulse detection
      if (latestMotion.accelZ > 10.8) {
        const now = performance.now();
        if (now - lastStepTimeRef.current > 400) {
          lastStepTimeRef.current = now;
          soundEngine.tick();
          setDetectedSteps((prev) => {
            const next = prev + 1;
            if (next >= targetSteps) {
              setTimeout(finishTest, 600);
            }
            return next;
          });
        }
      }
    }

    if (latestOrientation) {
      orientBufferRef.current.push(latestOrientation);
      setCurrentWobble(Math.abs(latestOrientation.gamma));
    }
  }, [phase, latestMotion, latestOrientation]);

  // Simulator step generator
  useEffect(() => {
    if (phase !== 'walking' || !isSimulated) return;

    const interval = setInterval(() => {
      setDetectedSteps((prev) => {
        const next = prev + 1;
        soundEngine.tick();
        if (next >= targetSteps) {
          clearInterval(interval);
          setTimeout(finishTest, 600);
        }
        return next;
      });
    }, 1100);

    return () => clearInterval(interval);
  }, [phase, isSimulated]);

  const startCountdown = () => {
    motionBufferRef.current = [];
    orientBufferRef.current = [];
    setDetectedSteps(0);
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
        setPhase('walking');
        soundEngine.startPing();
      }
    }, 1000);
  };

  const finishTest = () => {
    soundEngine.completeFanfare();
    const computed = computeTandemWalk(
      [...motionBufferRef.current],
      [...orientBufferRef.current],
      targetSteps
    );
    setResult(computed);
    setPhase('results');

    saveSession({
      id: `tandem-walk-${Date.now()}`,
      timestamp: new Date().toISOString(),
      experimentType: 'phone_balance',
      protocolVersion: '5.0-tandem-walk-trunk-wobble',
      hardwareName: isSimulated ? 'Phone Sensor Simulator' : 'Smartphone IMU',
      controllerId: 'Phone Built-In IMU',
      settingsSummary: { targetSteps: 10 },
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
            <Footprints className="w-5 h-5 text-violet-600" />
            Tandem Walk Test (10 Heel-to-Toe Steps)
          </h3>
          <p className="text-xs text-zinc-500">
            Hold phone against chest. Walk in a straight heel-to-toe line for 10 steps. Measures trunk wobble per step.
          </p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 font-semibold">
          {isSimulated ? 'Simulator Mode' : `${sensorHz} Hz IMU`}
        </span>
      </div>

      {phase === 'idle' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-8 flex flex-col items-center text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mb-4">
            <Footprints className="w-8 h-8" />
          </div>
          <h4 className="text-sm font-bold text-zinc-900 mb-1">Strict Heel-to-Toe Stride</h4>
          <p className="text-xs text-zinc-500 max-w-sm mb-6 leading-relaxed">
            Place the phone flat against the center of your chest. Walk in a straight line placing your heel directly in front of the opposite toe with each step.
          </p>
          <button
            onClick={startCountdown}
            className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            Begin Tandem Walk (10 Steps)
          </button>
        </div>
      )}

      {phase === 'countdown' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-violet-600 mb-2">Get in Position</span>
          <div className="text-7xl font-black text-zinc-900 my-4 animate-bounce">
            {countdownNum}
          </div>
          <p className="text-xs text-zinc-400">Phone against chest, first foot forward...</p>
        </div>
      )}

      {phase === 'walking' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-8 flex flex-col items-center justify-center shadow-xs">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">WALK HEEL-TO-TOE</span>
          <div className="text-6xl font-black font-mono text-zinc-900 my-2">
            {detectedSteps} <span className="text-2xl text-zinc-400 font-medium">/ {targetSteps}</span>
          </div>

          <div className="w-full max-w-md bg-zinc-100 h-2.5 rounded-full overflow-hidden my-6">
            <div
              style={{ width: `${Math.min(100, (detectedSteps / targetSteps) * 100)}%` }}
              className="h-full bg-violet-600 transition-all duration-300"
            />
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500">
            <span>Live Lateral Roll:</span>
            <span className="font-mono text-violet-600 font-bold">{currentWobble.toFixed(1)}°</span>
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
                <span className="text-[10px] font-bold text-violet-600 uppercase tracking-wider block">Trunk Stability</span>
                <div className="text-3xl font-black text-zinc-900">{result.trunkStabilityScore} / 100</div>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 inline-block mt-1">
                  {result.stabilityRating}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full sm:w-auto text-xs">
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Mean Wobble</span>
                <span className="text-lg font-bold font-mono text-violet-600">{result.averageTrunkWobbleDeg}° / step</span>
              </div>
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Steps Detected</span>
                <span className="text-lg font-bold font-mono text-zinc-900">{result.stepCount} steps</span>
              </div>
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Cadence</span>
                <span className="text-lg font-bold font-mono text-zinc-700">{result.cadenceStepsPerMin} spm</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl p-4 flex justify-between items-center shadow-xs">
            <button
              onClick={startCountdown}
              className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Retest Tandem Walk
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
