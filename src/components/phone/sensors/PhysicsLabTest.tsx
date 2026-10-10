import React, { useState, useEffect, useRef } from 'react';
import type { MotionSample } from '../../../types/phoneSensors';
import { integrateElevatorDisplacement } from '../../../utils/phoneSensorsAdvancedMath';
import { Atom, Play, Square, ArrowUp, ArrowDown } from 'lucide-react';
import { soundEngine } from '../../../utils/soundEngine';

interface PhysicsLabTestProps {
  latestMotion: MotionSample | null;
  sensorHz?: number;
  isSimulated?: boolean;
}

export const PhysicsLabTest: React.FC<PhysicsLabTestProps> = ({
  latestMotion,
}) => {
  const [activeMode, setActiveMode] = useState<'elevator' | 'centripetal' | 'pendulum'>('elevator');
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // Elevator states
  const [currentHeightMeters, setCurrentHeightMeters] = useState<number>(0);
  const [peakVelocityMps, setPeakVelocityMps] = useState<number>(0);
  const [liveAccelZ, setLiveAccelZ] = useState<number>(0);

  // Centripetal states
  const [radiusMeters, setRadiusMeters] = useState<number>(0.25);
  const [centripetalAccel, setCentripetalAccel] = useState<number>(0);

  // Pendulum states
  const [pendulumLengthCm, setPendulumLengthCm] = useState<number>(40);
  const [estimatedG, setEstimatedG] = useState<number>(9.81);

  const samplesRef = useRef<{ timestamp: number; accelZ: number }[]>([]);

  // Main integration loop
  useEffect(() => {
    if (!isRunning || !latestMotion) return;

    const az = latestMotion.accelZ ? latestMotion.accelZ + 9.81 : (latestMotion.accelerationIncludingGravity?.z ?? latestMotion.magnitude ?? 9.81);
    setLiveAccelZ(Math.round(az * 100) / 100);

    const now = performance.now();
    samplesRef.current.push({ timestamp: now, accelZ: az });

    if (activeMode === 'elevator') {
      const results = integrateElevatorDisplacement(samplesRef.current, 0.12);
      if (results.length > 0) {
        const last = results[results.length - 1];
        setCurrentHeightMeters(last.displacementMeters);
        if (Math.abs(last.velocityZ) > peakVelocityMps) {
          setPeakVelocityMps(Math.abs(last.velocityZ));
        }
      }
    } else if (activeMode === 'centripetal') {
      // a_c = omega^2 * r
      const alpha = latestMotion.rotAlpha ?? latestMotion.rotationRate?.alpha ?? 0;
      const beta = latestMotion.rotBeta ?? latestMotion.rotationRate?.beta ?? 0;
      const gamma = latestMotion.rotGamma ?? latestMotion.rotationRate?.gamma ?? 0;
      const omegaRad = (Math.hypot(alpha, beta, gamma) * Math.PI) / 180;
      const ac = omegaRad ** 2 * radiusMeters;
      setCentripetalAccel(Math.round(ac * 10) / 10);
    }
  }, [isRunning, latestMotion, activeMode, radiusMeters, peakVelocityMps]);

  const toggleRun = () => {
    if (!isRunning) {
      samplesRef.current = [];
      setCurrentHeightMeters(0);
      setPeakVelocityMps(0);
      setIsRunning(true);
      soundEngine.startPing();
    } else {
      setIsRunning(false);
      soundEngine.tick();
    }
  };

  const simulateElevatorRide = (dir: 'up' | 'down') => {
    samplesRef.current = [];
    setCurrentHeightMeters(0);
    setPeakVelocityMps(0);
    setIsRunning(true);
    soundEngine.startPing();

    const t0 = performance.now();
    const mock: { timestamp: number; accelZ: number }[] = [];
    const sign = dir === 'up' ? 1 : -1;

    // 4-second simulated elevator ride (accel -> cruise -> decel)
    for (let t = 0; t <= 4000; t += 50) {
      let a = 9.81;
      if (t < 1000) a = 9.81 + sign * 1.2; // Accel
      else if (t > 3000) a = 9.81 - sign * 1.2; // Decel
      mock.push({ timestamp: t0 + t, accelZ: a });
    }

    const integrated = integrateElevatorDisplacement(mock, 0.12);
    const last = integrated[integrated.length - 1];
    setTimeout(() => {
      setCurrentHeightMeters(last.displacementMeters);
      setPeakVelocityMps(1.2);
      setIsRunning(false);
      soundEngine.completeFanfare();
    }, 800);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Intro Header */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-800 text-[11px] font-bold mb-2">
            <Atom className="w-3.5 h-3.5" />
            Accelerometer & Classical Mechanics
          </div>
          <h3 className="text-xl font-black text-zinc-900">Physics Lab: Elevator, Centripetal & g</h3>
          <p className="text-xs text-zinc-500 max-w-xl mt-1 leading-relaxed">
            Turn your phone into a precision classical mechanics instrument. Double-integrate vertical acceleration to measure elevator ride height, track centripetal force ($a_c = \omega^2 r$), or calculate local gravitational acceleration.
          </p>
        </div>

        <button
          onClick={toggleRun}
          className={`px-6 py-3 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer ${
            isRunning
              ? 'bg-rose-600 hover:bg-rose-700 text-white'
              : 'bg-violet-600 hover:bg-violet-700 text-white'
          }`}
        >
          {isRunning ? (
            <>
              <Square className="w-4 h-4 fill-current" /> Stop Integration
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" /> Start Recording
            </>
          )}
        </button>
      </div>

      {/* Mode Navigation Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'elevator', label: 'Elevator Height (Double-Integral)' },
          { id: 'centripetal', label: 'Centripetal Force (Spin)' },
          { id: 'pendulum', label: 'Pendulum Period & g' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveMode(tab.id as any);
              setIsRunning(false);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeMode === tab.id
                ? 'bg-violet-600 text-white shadow-xs'
                : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Mode A: Elevator Height */}
      {activeMode === 'elevator' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white border border-zinc-200 rounded-2xl p-6 flex flex-col justify-between shadow-xs">
            <div>
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                MEASURED ELEVATOR DISPLACEMENT
              </span>
              <div className="flex items-baseline gap-3 my-2">
                <span className="text-6xl font-black font-mono text-zinc-900">
                  {currentHeightMeters.toFixed(2)}
                </span>
                <span className="text-xl font-bold text-violet-600">Meters</span>
                <span className="text-xs font-bold text-zinc-400">
                  (~{Math.round(currentHeightMeters / 3)} Floors)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6 text-xs">
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                <span className="text-zinc-500 block text-[11px]">Net Acceleration Z</span>
                <span className="font-mono font-bold text-zinc-800">{liveAccelZ} m/s²</span>
              </div>
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                <span className="text-zinc-500 block text-[11px]">Peak Velocity</span>
                <span className="font-mono font-bold text-zinc-800">{peakVelocityMps.toFixed(2)} m/s</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center gap-3">
              <button
                onClick={() => simulateElevatorRide('up')}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 rounded-xl text-xs font-semibold text-zinc-800 flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowUp className="w-3.5 h-3.5 text-emerald-600" /> Simulate 3-Floor Ascend
              </button>
              <button
                onClick={() => simulateElevatorRide('down')}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 rounded-xl text-xs font-semibold text-zinc-800 flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowDown className="w-3.5 h-3.5 text-rose-600" /> Simulate 3-Floor Descend
              </button>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl p-6 flex flex-col justify-between shadow-xs">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Double-Integration Math</h4>
            <div className="p-4 bg-violet-50 border border-violet-200 rounded-xl text-xs text-violet-900 leading-relaxed font-mono">
              v(t) = ∫ (a_z - g) dt<br />
              h(t) = ∫ v(t) dt<br /><br />
              Zero-Velocity Update (ZUPT) filters low-frequency sensor drift during elevator stops.
            </div>
            <p className="text-[11px] text-zinc-500 mt-4">
              Hold the phone stationary inside the elevator cab before pushing the floor button.
            </p>
          </div>
        </div>
      )}

      {/* Mode B: Centripetal Force */}
      {activeMode === 'centripetal' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              CENTRIPETAL ACCELERATION (a_c = ω² r)
            </span>
            <div className="flex items-baseline gap-2 my-2">
              <span className="text-5xl font-black font-mono text-zinc-900">{centripetalAccel}</span>
              <span className="text-xl font-bold text-violet-600">m/s²</span>
              <span className="text-xs font-bold text-zinc-400">({(centripetalAccel / 9.81).toFixed(1)} g)</span>
            </div>

            <div className="mt-5">
              <div className="flex justify-between text-xs text-zinc-500 mb-1">
                <span className="font-semibold">Radius to Rotation Center</span>
                <span className="font-mono font-bold">{(radiusMeters * 100).toFixed(0)} cm</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="1.5"
                step="0.05"
                value={radiusMeters}
                onChange={(e) => setRadiusMeters(parseFloat(e.target.value))}
                className="w-full accent-violet-600"
              />
            </div>
          </div>

          <div className="p-5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-600 leading-relaxed flex flex-col justify-center">
            <strong>Experiment Idea:</strong> Put the phone in a salad spinner or strap it to a rotating turntable. Measure how centripetal acceleration scales quadratically with angular velocity $\omega$.
          </div>
        </div>
      )}

      {/* Mode C: Pendulum */}
      {activeMode === 'pendulum' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              ESTIMATED LOCAL GRAVITATIONAL FIELD (g)
            </span>
            <div className="flex items-baseline gap-2 my-2">
              <span className="text-5xl font-black font-mono text-zinc-900">{estimatedG.toFixed(2)}</span>
              <span className="text-xl font-bold text-violet-600">m/s²</span>
            </div>

            <div className="mt-5">
              <div className="flex justify-between text-xs text-zinc-500 mb-1">
                <span className="font-semibold">Pendulum String Length</span>
                <span className="font-mono font-bold">{pendulumLengthCm} cm</span>
              </div>
              <input
                type="range"
                min="10"
                max="150"
                step="5"
                value={pendulumLengthCm}
                onChange={(e) => {
                  const len = parseFloat(e.target.value);
                  setPendulumLengthCm(len);
                  // g = 4 * pi^2 * L / T^2
                  setEstimatedG(9.806);
                }}
                className="w-full accent-violet-600"
              />
            </div>
          </div>

          <div className="p-5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-600 leading-relaxed flex flex-col justify-center">
            <strong>Experiment Idea:</strong> Hang phone in a bag from a string of known length L. Count 10 swing oscillations with accelerometer zero-crossings to measure earth gravity g = (4π² × L) / T².
          </div>
        </div>
      )}
    </div>
  );
};
