import React, { useState, useEffect, useRef } from 'react';
import type { MotionSample } from '../../types/phoneSensors';
import type { FatigueCurveResult } from '../../types/gyroLab';
import { computeFatigueCurve } from '../../utils/gyroLabCalculations';
import { soundEngine } from '../../utils/audioCues';
import { saveSession } from '../../utils/sessionStorage';
import { TrendingUp, Play, RotateCcw, Award, CheckCircle2 } from 'lucide-react';

interface FatigueCurveTestProps {
  latestMotion: MotionSample | null;
  sensorHz: number;
  isSimulated: boolean;
}

export const FatigueCurveTest: React.FC<FatigueCurveTestProps> = ({
  latestMotion,
  sensorHz,
  isSimulated,
}) => {
  const [phase, setPhase] = useState<'idle' | 'countdown' | 'holding' | 'results'>('idle');
  const [durationChoice, setDurationChoice] = useState<number>(60); // 60s or 120s
  const [countdownNum, setCountdownNum] = useState<number>(3);
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [liveRms, setLiveRms] = useState<number>(0.15);
  const [result, setResult] = useState<FatigueCurveResult | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const motionBufferRef = useRef<MotionSample[]>([]);

  useEffect(() => {
    if (phase !== 'holding' || !latestMotion) return;

    motionBufferRef.current.push(latestMotion);

    // Live micro-shake RMS calculation over recent 20 samples
    const recent = motionBufferRef.current.slice(-20);
    const mags = recent.map((s) => s.magnitude);
    const mean = mags.reduce((a, b) => a + b, 0) / mags.length;
    const variance = mags.reduce((acc, v) => acc + (v - mean) ** 2, 0) / mags.length;
    setLiveRms(Math.round(Math.sqrt(variance) * 1000) / 1000);
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
        setPhase('holding');
        setTimeLeft(durationChoice);
        soundEngine.startPing();
        startTimer();
      }
    }, 1000);
  };

  const startTimer = () => {
    const start = performance.now();
    const timer = setInterval(() => {
      const elapsed = (performance.now() - start) / 1000;
      const rem = Math.max(0, Math.ceil(durationChoice - elapsed));
      setTimeLeft(rem);

      if (elapsed >= durationChoice) {
        clearInterval(timer);
        finishTest();
      }
    }, 100);
  };

  const finishTest = () => {
    soundEngine.completeFanfare();
    const computed = computeFatigueCurve([...motionBufferRef.current], durationChoice);
    setResult(computed);
    setPhase('results');

    saveSession({
      id: `fatigue-${Date.now()}`,
      timestamp: new Date().toISOString(),
      experimentType: 'phone_steadiness',
      protocolVersion: '5.0-fatigue-curve-slope-climb',
      hardwareName: isSimulated ? 'Phone Sensor Simulator' : 'Smartphone Accelerometer',
      controllerId: 'Phone Built-In IMU',
      settingsSummary: { durationChoice },
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
            <TrendingUp className="w-5 h-5 text-violet-600" />
            Isometric Fatigue Curve ({durationChoice}s Hold)
          </h3>
          <p className="text-xs text-zinc-500">
            Hold arm outstretched for {durationChoice}s. Tracks real-time neuromuscular fatigue as motor units derecruit and tremor amplitude climbs.
          </p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 font-semibold">
          {isSimulated ? 'Simulator Mode' : `${sensorHz} Hz IMU`}
        </span>
      </div>

      {phase === 'idle' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-8 flex flex-col items-center text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mb-4">
            <TrendingUp className="w-8 h-8" />
          </div>
          <h4 className="text-sm font-bold text-zinc-900 mb-1">Neuromuscular Endurance Gradient</h4>
          <p className="text-xs text-zinc-500 max-w-sm mb-6 leading-relaxed">
            Hold your arm horizontally with no support. As fast-twitch motor units exhaust their glycogen reserves, synchrony increases and tremor amplitude rises. Choose 60s or 120s endurance challenge.
          </p>

          <div className="flex items-center gap-3 mb-8">
            <button
              onClick={() => setDurationChoice(60)}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                durationChoice === 60 ? 'bg-violet-600 text-white border-violet-600' : 'bg-zinc-100 text-zinc-600 border-zinc-200'
              }`}
            >
              60 Seconds (Standard)
            </button>
            <button
              onClick={() => setDurationChoice(120)}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                durationChoice === 120 ? 'bg-violet-600 text-white border-violet-600' : 'bg-zinc-100 text-zinc-600 border-zinc-200'
              }`}
            >
              120 Seconds (Iron Arm)
            </button>
          </div>

          <button
            onClick={startCountdown}
            className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            Begin Fatigue Test ({durationChoice}s)
          </button>
        </div>
      )}

      {phase === 'countdown' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-violet-600 mb-2">Extend Arm Now</span>
          <div className="text-7xl font-black text-zinc-900 my-4 animate-bounce">
            {countdownNum}
          </div>
          <p className="text-xs text-zinc-400">Lock shoulder and elbow straight, hold steady...</p>
        </div>
      )}

      {phase === 'holding' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-8 flex flex-col items-center justify-center shadow-xs">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">ISOMETRIC HOLD IN PROGRESS</span>
          <div className="text-6xl font-black font-mono text-zinc-900 my-2">{timeLeft}s</div>

          <div className="flex items-center gap-3 text-xs bg-violet-50 px-3 py-1.5 rounded-full my-2">
            <span className="text-zinc-600 font-semibold">Live Shake Amplitude:</span>
            <span className="font-mono font-bold text-violet-700">{liveRms} m/s²</span>
          </div>

          <div className="w-full max-w-md bg-zinc-100 h-2.5 rounded-full overflow-hidden my-6">
            <div
              style={{ width: `${((durationChoice - timeLeft) / durationChoice) * 100}%` }}
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
                <span className="text-[10px] font-bold text-violet-600 uppercase tracking-wider block">Endurance Resistance Score</span>
                <div className="text-3xl font-black text-zinc-900">{result.fatigueResistanceScore} / 100</div>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 inline-block mt-1">
                  {result.classification}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full sm:w-auto text-xs">
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Initial Shake RMS</span>
                <span className="text-lg font-bold font-mono text-emerald-600">{result.initialTremorRms} m/s²</span>
              </div>
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Final Shake RMS</span>
                <span className="text-lg font-bold font-mono text-rose-600">{result.finalTremorRms} m/s²</span>
              </div>
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Fatigue Climb Rate</span>
                <span className="text-lg font-bold font-mono text-violet-600">+{result.fatigueSlopePerMin} / min</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl p-4 flex justify-between items-center shadow-xs">
            <button
              onClick={startCountdown}
              className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Retest Fatigue Curve
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
