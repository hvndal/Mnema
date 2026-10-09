import React, { useState, useEffect, useRef } from 'react';
import type { MotionSample } from '../../types/phoneSensors';
import type { WristFlipResult } from '../../types/gyroLab';
import { computeWristFlip } from '../../utils/gyroLabCalculations';
import { soundEngine } from '../../utils/audioCues';
import { saveSession } from '../../utils/sessionStorage';
import { RefreshCw, Play, RotateCcw, Award, CheckCircle2 } from 'lucide-react';

interface WristFlipTestProps {
  latestMotion: MotionSample | null;
  sensorHz: number;
  isSimulated: boolean;
}

export const WristFlipTest: React.FC<WristFlipTestProps> = ({
  latestMotion,
  sensorHz,
  isSimulated,
}) => {
  const [phase, setPhase] = useState<'idle' | 'countdown' | 'flipping' | 'results'>('idle');
  const [countdownNum, setCountdownNum] = useState<number>(3);
  const [timeLeft, setTimeLeft] = useState<number>(10);
  const [liveFlipCount, setLiveFlipCount] = useState<number>(0);
  const [result, setResult] = useState<WristFlipResult | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const durationSec = 10;
  const motionBufferRef = useRef<MotionSample[]>([]);
  const prevSignRef = useRef<number>(0);

  useEffect(() => {
    if (phase !== 'flipping' || !latestMotion) return;

    motionBufferRef.current.push(latestMotion);

    // Live flip detection
    const rot = latestMotion.rotGamma ?? (latestMotion.accelX * 50);
    if (rot > 50 && prevSignRef.current <= 0) {
      prevSignRef.current = 1;
      setLiveFlipCount((c) => c + 1);
    } else if (rot < -50 && prevSignRef.current >= 0) {
      prevSignRef.current = -1;
      setLiveFlipCount((c) => c + 1);
    }
  }, [phase, latestMotion]);

  // Simulator flip pulse
  useEffect(() => {
    if (phase !== 'flipping' || !isSimulated) return;

    const interval = setInterval(() => {
      setLiveFlipCount((c) => c + 1);
    }, 220); // ~4.5 Hz alternation

    return () => clearInterval(interval);
  }, [phase, isSimulated]);

  const startCountdown = () => {
    motionBufferRef.current = [];
    setLiveFlipCount(0);
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
        setPhase('flipping');
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
    const computed = computeWristFlip([...motionBufferRef.current], durationSec);
    setResult(computed);
    setPhase('results');

    saveSession({
      id: `wrist-flip-${Date.now()}`,
      timestamp: new Date().toISOString(),
      experimentType: 'phone_steadiness',
      protocolVersion: '5.0-wrist-flip-diadochokinesia',
      hardwareName: isSimulated ? 'Phone Sensor Simulator' : 'Smartphone Gyro',
      controllerId: 'Phone Built-In IMU',
      settingsSummary: { durationSec: 10 },
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
            <RefreshCw className="w-5 h-5 text-violet-600" />
            Wrist Flip Speed (Rapid Alternating Movements)
          </h3>
          <p className="text-xs text-zinc-500">
            Rotate your forearm back and forth as fast as possible for 10 seconds. Tests rapid alternating coordination and rhythm decay.
          </p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 font-semibold">
          {isSimulated ? 'Simulator Mode' : `${sensorHz} Hz Gyro`}
        </span>
      </div>

      {phase === 'idle' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-8 flex flex-col items-center text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mb-4">
            <RefreshCw className="w-8 h-8 animate-spin" style={{ animationDuration: '4s' }} />
          </div>
          <h4 className="text-sm font-bold text-zinc-900 mb-1">Clinical Diadochokinesia Speed Test</h4>
          <p className="text-xs text-zinc-500 max-w-sm mb-6 leading-relaxed">
            Hold the phone tightly in your dominant hand. Rotate your forearm rapidly palm-up to palm-down (pronation / supination) as fast as humanly possible for 10 seconds.
          </p>
          <button
            onClick={startCountdown}
            className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            Begin Wrist Flip (10s Sprint)
          </button>
        </div>
      )}

      {phase === 'countdown' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-violet-600 mb-2">Get Grip Ready</span>
          <div className="text-7xl font-black text-zinc-900 my-4 animate-bounce">
            {countdownNum}
          </div>
          <p className="text-xs text-zinc-400">Lock forearm, prepare to flip back and forth...</p>
        </div>
      )}

      {phase === 'flipping' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-8 flex flex-col items-center justify-center shadow-xs">
          <span className="text-xs font-bold text-rose-600 uppercase tracking-wider animate-pulse mb-2">
            FLIP AS FAST AS POSSIBLE!
          </span>
          <div className="text-6xl font-black font-mono text-zinc-900 my-2">
            {timeLeft}s
          </div>
          <div className="text-sm font-bold text-violet-600 bg-violet-50 px-3 py-1 rounded-full mt-2">
            {liveFlipCount} Flips Recorded
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
                <span className="text-[10px] font-bold text-violet-600 uppercase tracking-wider block">Flip Frequency</span>
                <div className="text-3xl font-black text-zinc-900">{result.flipFrequencyHz} Hz</div>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 inline-block mt-1">
                  {result.rating}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full sm:w-auto text-xs">
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Total Alternations</span>
                <span className="text-lg font-bold font-mono text-violet-600">{result.totalFlips} flips</span>
              </div>
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Peak Angular Speed</span>
                <span className="text-lg font-bold font-mono text-zinc-900">{result.peakAngularVelocityDegS} °/s</span>
              </div>
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Rhythm Decay</span>
                <span className="text-lg font-bold font-mono text-amber-600">{result.rhythmDecayPercentage}% drop</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl p-4 flex justify-between items-center shadow-xs">
            <button
              onClick={startCountdown}
              className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Retest Wrist Flip
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
