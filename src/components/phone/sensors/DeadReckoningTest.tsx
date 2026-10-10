import React, { useState, useEffect, useRef } from 'react';
import type { MotionSample, OrientationSample } from '../../../types/phoneSensors';
import type { DeadReckoningStep } from '../../../types/phoneSensorsAdvanced';
import { updateDeadReckoning } from '../../../utils/phoneSensorsAdvancedMath';
import { Footprints, Play, Square, RotateCcw, Map, Navigation } from 'lucide-react';
import { soundEngine } from '../../../utils/soundEngine';

interface DeadReckoningTestProps {
  latestMotion: MotionSample | null;
  latestOrientation: OrientationSample | null;
  isSimulated: boolean;
}

export const DeadReckoningTest: React.FC<DeadReckoningTestProps> = ({
  latestMotion,
  latestOrientation,
  isSimulated,
}) => {
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [steps, setSteps] = useState<DeadReckoningStep[]>([]);
  const [currentPosition, setCurrentPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [strideLengthMeters, setStrideLengthMeters] = useState<number>(0.75);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastStepTimeRef = useRef<number>(0);
  const prevNetARef = useRef<number>(9.81);

  // Step detection and PDR integration loop
  useEffect(() => {
    if (!isTracking || !latestMotion) return;

    const netA = latestMotion.magnitude || 9.81;
    const now = performance.now();

    // Step detection: upward vertical surge followed by zero-crossing
    if (netA > 11.8 && prevNetARef.current <= 11.8 && now - lastStepTimeRef.current > 380) {
      lastStepTimeRef.current = now;
      soundEngine.tick();

      const heading = latestOrientation?.alpha || 0;
      const nextPos = updateDeadReckoning(currentPosition, strideLengthMeters, heading);
      setCurrentPosition(nextPos);

      const stepRecord: DeadReckoningStep = {
        stepIndex: steps.length + 1,
        timestamp: Date.now(),
        stepLengthMeters: strideLengthMeters,
        headingDeg: Math.round(heading),
        xMeters: nextPos.x,
        yMeters: nextPos.y,
      };

      setSteps((prev) => [...prev, stepRecord]);
      drawMap([...steps, stepRecord]);
    }

    prevNetARef.current = netA;
  }, [isTracking, latestMotion, latestOrientation, currentPosition, strideLengthMeters, steps]);

  const drawMap = (allSteps: DeadReckoningStep[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const originX = canvas.width / 2;
    const originY = canvas.height / 2;
    const scale = 14; // pixels per meter

    // Grid
    ctx.strokeStyle = '#f4f4f5';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 28) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 28) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Origin marker
    ctx.beginPath();
    ctx.arc(originX, originY, 4, 0, 2 * Math.PI);
    ctx.fillStyle = '#10b981';
    ctx.fill();

    if (allSteps.length === 0) return;

    // Path
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    for (const s of allSteps) {
      ctx.lineTo(originX + s.xMeters * scale, originY - s.yMeters * scale);
    }
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Current position dot
    const last = allSteps[allSteps.length - 1];
    ctx.beginPath();
    ctx.arc(originX + last.xMeters * scale, originY - last.yMeters * scale, 6, 0, 2 * Math.PI);
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  const toggleTracking = () => {
    if (!isTracking) {
      setIsTracking(true);
      soundEngine.startPing();
    } else {
      setIsTracking(false);
      soundEngine.tick();
    }
  };

  const resetPdr = () => {
    setSteps([]);
    setCurrentPosition({ x: 0, y: 0 });
    drawMap([]);
    soundEngine.tick();
  };

  const simulateStep = () => {
    soundEngine.tick();
    const heading = Math.round(Math.random() * 360);
    const nextPos = updateDeadReckoning(currentPosition, strideLengthMeters, heading);
    setCurrentPosition(nextPos);

    const stepRecord: DeadReckoningStep = {
      stepIndex: steps.length + 1,
      timestamp: Date.now(),
      stepLengthMeters: strideLengthMeters,
      headingDeg: heading,
      xMeters: nextPos.x,
      yMeters: nextPos.y,
    };

    const updated = [...steps, stepRecord];
    setSteps(updated);
    drawMap(updated);
  };

  const totalDistanceMeters = Math.round(steps.length * strideLengthMeters * 10) / 10;

  return (
    <div className="flex flex-col gap-6">
      {/* Intro Header */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-800 text-[11px] font-bold mb-2">
            <Footprints className="w-3.5 h-3.5" />
            Sensor Fusion: Accelerometer + Compass + Gyro
            {isSimulated && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded bg-amber-200/60 text-amber-900 text-[10px] font-semibold">
                Simulated
              </span>
            )}
          </div>
          <h3 className="text-xl font-black text-zinc-900">Pedestrian Dead Reckoning (PDR)</h3>
          <p className="text-xs text-zinc-500 max-w-xl mt-1 leading-relaxed">
            Walk indoors without GPS. The accelerometer counts footfall impacts ($a_z$ vertical surge), compass orientation gives your heading, and vector integration plots your 2D walking floorplan trajectory $(x, y)$ in real time.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={toggleTracking}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer ${
              isTracking
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-violet-600 hover:bg-violet-700 text-white'
            }`}
          >
            {isTracking ? (
              <>
                <Square className="w-4 h-4 fill-current" /> Stop PDR Tracker
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" /> Start PDR Walk
              </>
            )}
          </button>

          <button
            onClick={simulateStep}
            className="px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 text-xs font-semibold cursor-pointer"
          >
            Simulate 1 Step
          </button>

          <button
            onClick={resetPdr}
            className="px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 text-xs font-semibold cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Live 2D Floorplan Canvas */}
        <div className="md:col-span-2 bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col items-center justify-center">
          <div className="flex items-center justify-between w-full mb-3 text-xs text-zinc-500 font-semibold">
            <span className="flex items-center gap-1.5">
              <Map className="w-3.5 h-3.5 text-violet-600" /> LIVE 2D INDOOR TRAJECTORY
            </span>
            <span>Green = Origin • Red = You</span>
          </div>

          <canvas
            ref={canvasRef}
            width={480}
            height={320}
            className="w-full max-w-[480px] h-[300px] border border-zinc-200 rounded-xl bg-[#fafafa]"
          />
        </div>

        {/* Telemetry Metrics */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              PDR WALK TELEMETRY
            </span>

            <div className="grid grid-cols-2 gap-3 my-2 text-xs">
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                <span className="text-zinc-500 block text-[11px]">Footsteps</span>
                <span className="text-3xl font-black font-mono text-zinc-900">{steps.length}</span>
              </div>
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                <span className="text-zinc-500 block text-[11px]">Distance</span>
                <span className="text-3xl font-black font-mono text-violet-600">
                  {totalDistanceMeters}m
                </span>
              </div>
            </div>

            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-mono mt-3">
              <div className="text-zinc-500 text-[11px]">Current Coordinates:</div>
              <div className="text-zinc-800 font-bold mt-0.5">
                X: {currentPosition.x} m • Y: {currentPosition.y} m
              </div>
            </div>

            <div className="mt-4">
              <div className="flex justify-between text-xs text-zinc-500 mb-1">
                <span className="font-semibold">Stride Length Calibration</span>
                <span className="font-mono font-bold">{(strideLengthMeters * 100).toFixed(0)} cm</span>
              </div>
              <input
                type="range"
                min="0.4"
                max="1.2"
                step="0.05"
                value={strideLengthMeters}
                onChange={(e) => setStrideLengthMeters(parseFloat(e.target.value))}
                className="w-full accent-violet-600"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-100 text-[11px] text-zinc-500 flex items-center gap-2">
            <Navigation className="w-4 h-4 text-violet-600 shrink-0" />
            <span>Demonstrates cumulative sensor drift in uncorrected inertial navigation systems.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
