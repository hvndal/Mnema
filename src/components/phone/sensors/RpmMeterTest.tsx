import React, { useState, useEffect, useRef } from 'react';
import type { MotionSample } from '../../../types/phoneSensors';
import { calculateRpm } from '../../../utils/phoneSensorsAdvancedMath';
import { RotateCw, Play, Square } from 'lucide-react';
import { soundEngine } from '../../../utils/soundEngine';

interface RpmMeterTestProps {
  latestMotion: MotionSample | null;
  sensorHz: number;
  isSimulated: boolean;
}

export const RpmMeterTest: React.FC<RpmMeterTestProps> = ({
  latestMotion,
  sensorHz,
  isSimulated,
}) => {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentRpm, setCurrentRpm] = useState<number>(0);
  const [peakRpm, setPeakRpm] = useState<number>(0);
  const [activeAxis] = useState<'composite' | 'yaw' | 'pitch' | 'roll'>('composite');
  const [simulatedRpm, setSimulatedRpm] = useState<number>(33.3);

  const angleRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Read angular velocity from motion sample
  useEffect(() => {
    if (!isRunning) return;

    let degPerSec = 0;
    if (isSimulated) {
      degPerSec = simulatedRpm * 6; // RPM * 6 = deg/s
    } else if (latestMotion) {
      const alpha = latestMotion.rotAlpha ?? latestMotion.rotationRate?.alpha ?? 0;
      const beta = latestMotion.rotBeta ?? latestMotion.rotationRate?.beta ?? 0;
      const gamma = latestMotion.rotGamma ?? latestMotion.rotationRate?.gamma ?? 0;

      if (activeAxis === 'yaw') degPerSec = alpha;
      else if (activeAxis === 'pitch') degPerSec = beta;
      else if (activeAxis === 'roll') degPerSec = gamma;
      else {
        degPerSec = Math.hypot(alpha, beta, gamma);
      }
    }

    const rpm = calculateRpm(degPerSec);
    setCurrentRpm(rpm);
    if (rpm > peakRpm) setPeakRpm(rpm);

    // Update canvas rotation
    angleRef.current = (angleRef.current + (rpm * 6 * 0.05)) % 360;
    drawTurntable();
  }, [isRunning, latestMotion, activeAxis, isSimulated, simulatedRpm, peakRpm]);

  const drawTurntable = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r = Math.min(cx, cy) - 15;

    // Outer platter
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.fillStyle = '#18181b';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#27272a';
    ctx.stroke();

    // Turntable grooves
    for (let i = 25; i < r - 10; i += 18) {
      ctx.beginPath();
      ctx.arc(cx, cy, i, 0, 2 * Math.PI);
      ctx.strokeStyle = '#27272a';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Rotating strobe markers
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((angleRef.current * Math.PI) / 180);

    const numStrobes = 16;
    for (let i = 0; i < numStrobes; i++) {
      const a = (i / numStrobes) * 2 * Math.PI;
      const x1 = Math.cos(a) * (r - 8);
      const y1 = Math.sin(a) * (r - 8);
      const x2 = Math.cos(a) * (r - 2);
      const y2 = Math.sin(a) * (r - 2);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = i % 2 === 0 ? '#a855f7' : '#71717a';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    // Center vinyl label
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, 2 * Math.PI);
    ctx.fillStyle = '#7c3aed';
    ctx.fill();

    // Center spindle
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, 2 * Math.PI);
    ctx.fillStyle = '#f4f4f5';
    ctx.fill();

    ctx.restore();
  };

  const handleToggle = () => {
    if (!isRunning) {
      soundEngine.startPing();
      setIsRunning(true);
      setPeakRpm(0);
    } else {
      soundEngine.tick();
      setIsRunning(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Intro Header */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-800 text-[11px] font-bold mb-2">
            <RotateCw className="w-3.5 h-3.5" />
            Gyroscope Rotation Rate
          </div>
          <h3 className="text-xl font-black text-zinc-900">Turntable & Spin RPM Meter</h3>
          <p className="text-xs text-zinc-500 max-w-xl mt-1 leading-relaxed">
            Place phone on a vinyl turntable, fan hub, bicycle wheel, or washing machine drum to measure rotational speed directly via the gyroscope's angular rate vector.
          </p>
        </div>

        <button
          onClick={handleToggle}
          className={`px-6 py-3 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer ${
            isRunning
              ? 'bg-rose-600 hover:bg-rose-700 text-white'
              : 'bg-violet-600 hover:bg-violet-700 text-white'
          }`}
        >
          {isRunning ? (
            <>
              <Square className="w-4 h-4 fill-current" /> Stop RPM Meter
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" /> Start Tachometer
            </>
          )}
        </button>
      </div>

      {/* Main Tachometer View */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Animated Strobe Platter */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 flex flex-col items-center justify-center shadow-xs">
          <canvas
            ref={canvasRef}
            width={260}
            height={260}
            className="w-[240px] h-[240px] rounded-full drop-shadow-md"
          />
          <div className="flex items-center gap-3 mt-4 text-xs text-zinc-400 font-medium">
            <span>Strobe Rate: {Math.round(currentRpm * 0.27)} Hz</span>
            <span>•</span>
            <span>Polling: {sensorHz} Hz</span>
          </div>
        </div>

        {/* Digital Readout & Standard Presets */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center justify-between text-xs text-zinc-500 font-semibold mb-2">
              <span>LIVE ROTATIONAL SPEED</span>
              <span>PEAK: {peakRpm} RPM</span>
            </div>

            <div className="flex items-baseline gap-2 my-2">
              <span className="text-6xl font-black font-mono text-zinc-900 tracking-tight">
                {currentRpm.toFixed(1)}
              </span>
              <span className="text-xl font-bold text-violet-600">RPM</span>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                <span className="text-zinc-500 block text-[11px]">Angular Velocity</span>
                <span className="font-mono font-bold text-zinc-800">
                  {Math.round(currentRpm * 6)} °/s
                </span>
              </div>
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                <span className="text-zinc-500 block text-[11px]">RPS (Revs / sec)</span>
                <span className="font-mono font-bold text-zinc-800">
                  {(currentRpm / 60).toFixed(2)} Hz
                </span>
              </div>
            </div>

            {/* Standard turntable reference speeds */}
            <div className="mt-5">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
                Standard Vinyl Reference Speeds
              </span>
              <div className="flex gap-2">
                {[33.3, 45.0, 78.0].map((preset) => {
                  const delta = Math.abs(currentRpm - preset);
                  const isMatch = isRunning && delta < 1.0;
                  return (
                    <button
                      key={preset}
                      onClick={() => setSimulatedRpm(preset)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        isMatch
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      {preset} RPM
                      {isMatch && <span className="block text-[9px] text-emerald-600">LOCK</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Desktop Simulator Slider */}
          {isSimulated && (
            <div className="mt-5 pt-4 border-t border-zinc-100">
              <div className="flex justify-between text-xs text-zinc-500 mb-1">
                <span className="font-semibold">Desktop Simulator Spin</span>
                <span className="font-mono font-bold">{simulatedRpm} RPM</span>
              </div>
              <input
                type="range"
                min="0"
                max="120"
                step="0.5"
                value={simulatedRpm}
                onChange={(e) => setSimulatedRpm(parseFloat(e.target.value))}
                className="w-full accent-violet-600"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
