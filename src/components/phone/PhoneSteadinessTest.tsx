import React, { useState, useEffect, useRef } from 'react';
import type { MotionSample, SteadinessResult } from '../../types/phoneSensors';
import { computeSteadinessResult } from '../../utils/phoneSensorCalculations';
import { soundEngine } from '../../utils/audioCues';
import { saveSession } from '../../utils/sessionStorage';
import { Activity, Play, RotateCcw, Award, CheckCircle2, Sliders } from 'lucide-react';

interface PhoneSteadinessTestProps {
  latestMotion: MotionSample | null;
  sensorHz: number;
  isSimulated: boolean;
  simulatedTremorAmp: number;
  setSimulatedTremorAmp: (val: number) => void;
  onOpenCard?: (session: any) => void;
}

export const PhoneSteadinessTest: React.FC<PhoneSteadinessTestProps> = ({
  latestMotion,
  sensorHz,
  isSimulated,
  simulatedTremorAmp,
  setSimulatedTremorAmp,
}) => {
  const [phase, setPhase] = useState<'idle' | 'countdown' | 'running' | 'results'>('idle');
  const [countdownNum, setCountdownNum] = useState<number>(3);
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [result, setResult] = useState<SteadinessResult | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const testDuration = 30; // 30 seconds
  const samplesBufferRef = useRef<MotionSample[]>([]);
  const timerRef = useRef<any>(null);

  // Collect samples during running phase
  useEffect(() => {
    if (phase === 'running' && latestMotion) {
      samplesBufferRef.current.push(latestMotion);
    }
  }, [phase, latestMotion]);

  // Start sequence
  const startTestSequence = () => {
    samplesBufferRef.current = [];
    setResult(null);
    setIsSaved(false);
    setPhase('countdown');
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
        startMeasurement();
      }
    }, 1000);
  };

  const startMeasurement = () => {
    setPhase('running');
    setTimeLeft(testDuration);
    soundEngine.startPing();

    const startTime = performance.now();
    timerRef.current = setInterval(() => {
      const elapsed = (performance.now() - startTime) / 1000;
      const remaining = Math.max(0, Math.ceil(testDuration - elapsed));
      setTimeLeft(remaining);

      if (elapsed >= testDuration) {
        clearInterval(timerRef.current);
        finishMeasurement();
      }
    }, 100);
  };

  const finishMeasurement = () => {
    soundEngine.completeFanfare();
    const finalSamples = [...samplesBufferRef.current];
    const computed = computeSteadinessResult(finalSamples);
    setResult(computed);
    setPhase('results');

    // Auto-save to IndexedDB session history
    saveSession({
      id: `steadiness-${Date.now()}`,
      timestamp: new Date().toISOString(),
      experimentType: 'phone_steadiness',
      protocolVersion: '4.0-phone-gyro-tremor-fft',
      hardwareName: isSimulated ? 'Phone Sensor Simulator (Desktop)' : 'Smartphone Accelerometer/IMU',
      controllerId: 'Phone Built-In IMU',
      settingsSummary: { durationSeconds: testDuration, samplingHz: computed.effectiveSamplingRateHz },
      sampleCount: computed.sampleCount,
      hasInterruptedTrials: false,
      dataQualityWarnings: computed.effectiveSamplingRateHz < 30 ? ['Sensor update rate below 30 Hz'] : [],
      steadinessResult: computed,
    }).then(() => setIsSaved(true)).catch(console.error);
  };

  const cancelTest = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase('idle');
    samplesBufferRef.current = [];
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Test Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-4 border-b border-zinc-100">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-violet-600" />
            Arm-Length Steadiness & Tremor FFT
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Hold your phone at arm’s length for 30s. We calculate micro-acceleration variance and run an FFT to identify your natural neuromuscular tremor frequency.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 font-semibold border border-violet-200">
            {isSimulated ? 'Simulator Mode' : `${sensorHz} Hz Hardware`}
          </span>
        </div>
      </div>

      {/* Simulator Control for Desktop users */}
      {isSimulated && (
        <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-violet-600" />
            <span className="font-semibold text-zinc-700">Desktop Simulation: Adjust Tremor Amplitude</span>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-zinc-500">Steady</span>
            <input
              type="range"
              min="0.05"
              max="0.80"
              step="0.05"
              value={simulatedTremorAmp}
              onChange={(e) => setSimulatedTremorAmp(parseFloat(e.target.value))}
              className="w-36 accent-violet-600"
            />
            <span className="text-zinc-500">Shaky</span>
            <span className="font-mono font-bold text-zinc-800 ml-1">{(simulatedTremorAmp * 10).toFixed(1)}</span>
          </div>
        </div>
      )}

      {/* Main Test Body */}
      {phase === 'idle' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-8 flex flex-col items-center text-center shadow-xs">
          <div className="w-20 h-20 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mb-4">
            <Activity className="w-10 h-10 animate-pulse" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 mb-2">30-Second Arm’s-Length Hold</h3>
          <p className="text-xs text-zinc-500 max-w-md mb-6 leading-relaxed">
            Extend your dominant arm horizontally in front of you. Hold the phone balanced on your palm or gently between your fingers. Keep your wrist locked and breathe normally.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-lg mb-8 text-left text-xs">
            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
              <span className="font-bold text-zinc-800 block mb-1">1. Posture</span>
              <span className="text-zinc-500">Arm parallel to floor, elbow extended straight.</span>
            </div>
            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
              <span className="font-bold text-zinc-800 block mb-1">2. Grip</span>
              <span className="text-zinc-500">Flat on palm or light pinch. Do not brace arm against body.</span>
            </div>
            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
              <span className="font-bold text-zinc-800 block mb-1">3. FFT Analysis</span>
              <span className="text-zinc-500">Fast Fourier Transform isolates physiological 8–12 Hz peak.</span>
            </div>
          </div>

          <button
            onClick={startTestSequence}
            className="px-8 py-3.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-sm shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            Begin Steadiness Test (30s)
          </button>
        </div>
      )}

      {phase === 'countdown' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-violet-600 mb-2">Get in Position</span>
          <div className="text-7xl font-black text-zinc-900 my-4 animate-bounce">
            {countdownNum}
          </div>
          <p className="text-xs text-zinc-400">Extend your arm straight ahead and hold steady...</p>
        </div>
      )}

      {phase === 'running' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-8 flex flex-col items-center justify-center shadow-xs">
          <div className="flex justify-between items-center w-full max-w-md mb-6">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Recording Micro-Tremor...</span>
            <span className="text-xs font-mono font-bold text-violet-600 px-2.5 py-1 bg-violet-50 rounded-full">
              {samplesBufferRef.current.length} samples
            </span>
          </div>

          {/* Animated Steady Ring */}
          <div className="relative w-48 h-48 rounded-full border-4 border-violet-100 flex items-center justify-center my-4 overflow-hidden">
            <div
              style={{
                transform: `scale(${1 + Math.min(1.2, (latestMotion?.magnitude ?? 0.1) * 2)})`,
              }}
              className="w-32 h-32 rounded-full bg-violet-500/10 border-2 border-violet-400 transition-transform duration-75 flex items-center justify-center"
            >
              <div className="w-16 h-16 rounded-full bg-violet-600/20" />
            </div>

            <div className="absolute flex flex-col items-center">
              <span className="text-4xl font-black font-mono text-zinc-900">{timeLeft}s</span>
              <span className="text-[10px] text-zinc-400 font-semibold mt-1">HOLD STILL</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full max-w-md bg-zinc-100 h-2 rounded-full overflow-hidden my-4">
            <div
              style={{ width: `${((testDuration - timeLeft) / testDuration) * 100}%` }}
              className="h-full bg-violet-600 transition-all duration-100"
            />
          </div>

          <button
            onClick={cancelTest}
            className="mt-4 px-4 py-1.5 text-xs text-zinc-400 hover:text-rose-600 font-semibold cursor-pointer"
          >
            Cancel Test
          </button>
        </div>
      )}

      {/* Results Phase */}
      {phase === 'results' && result && (
        <div className="flex flex-col gap-6">
          {/* Top Score Summary Banner */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center">
                <Award className="w-8 h-8" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-violet-600 uppercase tracking-wider block">Steadiness Score</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-zinc-900">{result.steadinessScore}</span>
                  <span className="text-sm font-semibold text-zinc-400">/ 100</span>
                </div>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 inline-block mt-1">
                  {result.classification}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full md:w-auto text-xs">
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Peak Tremor Frequency</span>
                <span className="text-xl font-bold font-mono text-zinc-900">{result.peakFrequencyHz} Hz</span>
              </div>
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Shake RMS Accel</span>
                <span className="text-xl font-bold font-mono text-violet-600">{result.rmsAcceleration} m/s²</span>
              </div>
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Sample Rate</span>
                <span className="text-xl font-bold font-mono text-zinc-700">{result.effectiveSamplingRateHz} Hz</span>
              </div>
            </div>
          </div>

          {/* FFT Spectral Graph */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
              <div>
                <h4 className="text-sm font-bold text-zinc-900">FFT Power Spectral Density (PSD)</h4>
                <p className="text-xs text-zinc-500">Frequency distribution of arm vibrations from 0 to 20 Hz</p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-3 h-3 rounded-xs bg-violet-600" />
                <span className="text-zinc-600 font-semibold">Peak: {result.peakFrequencyHz} Hz</span>
              </div>
            </div>

            {/* SVG Spectral Graph */}
            <div className="w-full h-52 bg-zinc-50 rounded-xl p-4 flex flex-col justify-end relative border border-zinc-100 overflow-hidden">
              {/* Highlight normal human tremor zone 8-12 Hz */}
              <div
                style={{
                  left: `${(8 / 20) * 100}%`,
                  width: `${(4 / 20) * 100}%`,
                }}
                className="absolute top-0 bottom-8 bg-violet-100/40 border-x border-dashed border-violet-300 pointer-events-none flex items-start justify-center pt-2"
              >
                <span className="text-[10px] font-bold text-violet-600 uppercase tracking-wider">Physiological Tremor (8–12 Hz)</span>
              </div>

              {/* Spectral Bars */}
              <div className="w-full h-36 flex items-end gap-1 relative z-10">
                {result.spectralData.frequencies.map((freq, i) => {
                  if (freq > 20) return null;
                  const pwr = result.spectralData.power[i] ?? 0;
                  const isPeak = Math.abs(freq - result.peakFrequencyHz) < 0.3;
                  return (
                    <div
                      key={freq}
                      className="flex-1 flex flex-col items-center h-full justify-end group relative"
                    >
                      <div
                        style={{ height: `${Math.max(4, pwr * 100)}%` }}
                        className={`w-full rounded-t transition-all ${
                          isPeak ? 'bg-violet-600' : 'bg-zinc-300 group-hover:bg-zinc-400'
                        }`}
                      />
                      {/* Tooltip on hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-1 bg-zinc-900 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-20 pointer-events-none font-mono">
                        {freq} Hz: {(pwr * 100).toFixed(0)}%
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* X Axis ticks */}
              <div className="w-full flex justify-between text-[10px] font-mono text-zinc-400 mt-2 border-t border-zinc-200 pt-1">
                <span>0 Hz</span>
                <span>5 Hz</span>
                <span>10 Hz</span>
                <span>15 Hz</span>
                <span>20 Hz</span>
              </div>
            </div>

            {/* Science Explanation Card */}
            <div className="p-4 bg-violet-50/60 rounded-xl border border-violet-100 text-xs text-violet-900 flex flex-col gap-1.5">
              <span className="font-bold">🧠 The Science of Physiological Tremor</span>
              <p className="text-[11px] text-violet-800 leading-relaxed">
                Every human has an involuntary micro-shake between <strong>8 Hz and 12 Hz</strong>. It originates from regular rhythmic motor-unit firing in the spinal cord and the mechanical spring-mass resonance of the human arm. Even elite surgeons and marksmen exhibit this 10 Hz tremor.
              </p>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-zinc-200 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={startTestSequence}
                className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Retest Steadiness
              </button>
            </div>

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
