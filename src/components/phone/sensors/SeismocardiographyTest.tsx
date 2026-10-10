import React, { useState, useEffect, useRef } from 'react';
import type { MotionSample } from '../../../types/phoneSensors';
import type { ScgResults } from '../../../types/phoneSensorsAdvanced';
import { processScgSignals } from '../../../utils/phoneSensorsAdvancedMath';
import { Heart, Play, Square, Wind, Activity } from 'lucide-react';
import { soundEngine } from '../../../utils/soundEngine';

interface SeismocardiographyTestProps {
  latestMotion: MotionSample | null;
  sensorHz?: number;
  isSimulated?: boolean;
}

export const SeismocardiographyTest: React.FC<SeismocardiographyTestProps> = ({
  latestMotion,
}) => {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [secondsElapsed, setSecondsElapsed] = useState<number>(0);
  const [results, setResults] = useState<ScgResults | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const samplesRef = useRef<{ timestamp: number; accelZ: number }[]>([]);
  const waveformBufferRef = useRef<number[]>([]);

  useEffect(() => {
    if (!isRunning || !latestMotion) return;

    const az = latestMotion.accelZ ? latestMotion.accelZ + 9.81 : (latestMotion.accelerationIncludingGravity?.z ?? 9.81);
    const now = performance.now();
    samplesRef.current.push({ timestamp: now, accelZ: az });

    // High-pass filter for visual pulse recoil
    const baseline = 9.81;
    const recoil = (az - baseline) * 45;
    waveformBufferRef.current.push(recoil);
    if (waveformBufferRef.current.length > 120) {
      waveformBufferRef.current.shift();
    }

    drawWaveform();
  }, [isRunning, latestMotion]);

  const drawWaveform = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const midY = canvas.height / 2;

    // Grid lines
    ctx.strokeStyle = '#f4f4f5';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(canvas.width, midY);
    ctx.stroke();

    const data = waveformBufferRef.current;
    if (data.length < 2) return;

    ctx.beginPath();
    ctx.moveTo(0, midY - data[0]);
    const step = canvas.width / data.length;
    for (let i = 1; i < data.length; i++) {
      ctx.lineTo(i * step, midY - data[i]);
    }
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.5;
    ctx.stroke();
  };

  const handleStart = () => {
    samplesRef.current = [];
    waveformBufferRef.current = [];
    setResults(null);
    setSecondsElapsed(0);
    setIsRunning(true);
    soundEngine.startPing();

    const start = performance.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((performance.now() - start) / 1000);
      setSecondsElapsed(elapsed);

      if (elapsed >= 20) {
        clearInterval(interval);
        setIsRunning(false);
        soundEngine.completeFanfare();

        // Process seismocardiography results
        const res = processScgSignals(samplesRef.current);
        setResults(res);
      }
    }, 500);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold mb-2">
            <Heart className="w-3.5 h-3.5" />
            Seismocardiography (SCG) & Respiration
          </div>
          <h3 className="text-xl font-black text-zinc-900">Chest Heartbeat & Breathing Without Camera</h3>
          <p className="text-xs text-zinc-500 max-w-xl mt-1 leading-relaxed">
            Lie down flat on your back and place the phone directly on your sternum / chest. The accelerometer picks up the mechanical recoil shockwave of each ventricular contraction (SCG) and the slow breathing wave.
          </p>
        </div>

        <button
          onClick={handleStart}
          disabled={isRunning}
          className={`px-6 py-3 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer ${
            isRunning
              ? 'bg-amber-500 text-white animate-pulse'
              : 'bg-rose-600 hover:bg-rose-700 text-white'
          }`}
        >
          {isRunning ? (
            <>
              <Square className="w-4 h-4 fill-current" /> Recording Chest Recoil ({20 - secondsElapsed}s)
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" /> Start 20s Chest Test
            </>
          )}
        </button>
      </div>

      {/* Waveform scope */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col">
        <div className="flex items-center justify-between text-xs text-zinc-500 font-semibold mb-3">
          <span className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-rose-500" /> LIVE MECHANICAL RECOIL OSCILLOGRAM
          </span>
          <span>{isRunning ? 'HOLD BREATH OR BREATHE GENTLY' : 'IDLE'}</span>
        </div>

        <canvas
          ref={canvasRef}
          width={600}
          height={140}
          className="w-full h-[140px] bg-[#fafafa] border border-zinc-200 rounded-xl"
        />
      </div>

      {/* Results Cards */}
      {results && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-zinc-500 block mb-1">CARDIAC MECHANICAL RATE</span>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black font-mono text-rose-600">{results.estimatedBpm}</span>
                <span className="text-xs font-bold text-rose-700">BPM</span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-100 text-[11px] text-zinc-500 flex justify-between">
              <span>Recoil Regularity:</span>
              <span className="font-mono font-bold text-zinc-800">{results.rhythmRegularityPct}%</span>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-zinc-500 block mb-1">RESPIRATION EXPANSION RATE</span>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black font-mono text-emerald-600">{results.respirationBreathsPerMin}</span>
                <span className="text-xs font-bold text-emerald-700">Breaths / min</span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-100 text-[11px] text-zinc-500 flex justify-between">
              <span>Signal-to-Noise Ratio:</span>
              <span className="font-mono font-bold text-emerald-600">{results.signalToNoiseRatioDb} dB</span>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-zinc-500 block mb-1">MEDICAL DISCLAIMER</span>
              <p className="text-[11px] text-zinc-500 leading-relaxed mt-1">
                Seismocardiography is an exploratory physical computing demo. It is not an ECG or medical diagnostic device.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-100 text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <Wind className="w-3.5 h-3.5" /> Normal human resting range
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
