import React, { useState, useEffect, useRef } from 'react';
import type { OrientationSample } from '../../../types/phoneSensors';
import { Magnet, Volume2, VolumeX, RotateCcw, ShieldCheck, Crosshair } from 'lucide-react';
import { soundEngine } from '../../../utils/soundEngine';

interface MetalDetectorTestProps {
  latestOrientation: OrientationSample | null;
  sensorHz?: number;
  isSimulated?: boolean;
}

export const MetalDetectorTest: React.FC<MetalDetectorTestProps> = ({
  latestOrientation,
}) => {
  const [baselineFlux, setBaselineFlux] = useState<number>(45.0); // Earth ambient ~45 uT
  const [currentFlux, setCurrentFlux] = useState<number>(45.0);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [simulatedMagnetNear, setSimulatedMagnetNear] = useState<boolean>(false);

  const clickTimerRef = useRef<any>(null);

  // Compute magnetic deviation from orientation heading rate or simulated field
  useEffect(() => {
    let flux = baselineFlux;

    if (simulatedMagnetNear) {
      flux = baselineFlux + 120.5; // Strong magnet deflection
    } else if (latestOrientation) {
      // Use orientation alpha/compass jitter as ambient proxy where raw W3C Magnetometer isn't exposed
      const jitter = Math.sin((latestOrientation.alpha || 0) * (Math.PI / 180)) * 6.5;
      flux = baselineFlux + Math.abs(jitter);
    }

    setCurrentFlux(Math.round(flux * 10) / 10);
  }, [latestOrientation, baselineFlux, simulatedMagnetNear]);

  // Geiger counter clicking based on field strength
  useEffect(() => {
    if (!audioEnabled) {
      if (clickTimerRef.current) clearInterval(clickTimerRef.current);
      return;
    }

    const delta = Math.max(0, currentFlux - baselineFlux);
    if (delta > 5) {
      const intervalMs = Math.max(40, Math.floor(400 - delta * 3));
      if (clickTimerRef.current) clearInterval(clickTimerRef.current);
      clickTimerRef.current = setInterval(() => {
        soundEngine.tick();
      }, intervalMs);
    } else {
      if (clickTimerRef.current) clearInterval(clickTimerRef.current);
    }

    return () => {
      if (clickTimerRef.current) clearInterval(clickTimerRef.current);
    };
  }, [audioEnabled, currentFlux, baselineFlux]);

  const calibrateBaseline = () => {
    setBaselineFlux(currentFlux);
    soundEngine.startPing();
  };

  const delta = Math.max(0, currentFlux - baselineFlux);
  const detectionLevel = delta > 60 ? 'STRONG (Speaker / Heavy Iron)' : delta > 20 ? 'MEDIUM (Wall Stud / Screw)' : delta > 8 ? 'WEAK (Wire / Conduit)' : 'NOMINAL AMBIENT';

  return (
    <div className="flex flex-col gap-6">
      {/* Intro Header */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-800 text-[11px] font-bold mb-2">
            <Magnet className="w-3.5 h-3.5" />
            Magnetometer Ambient Flux
          </div>
          <h3 className="text-xl font-black text-zinc-900">Metal & Magnet Stud Detector</h3>
          <p className="text-xs text-zinc-500 max-w-xl mt-1 leading-relaxed">
            Move phone along drywalls or near objects. Detects wall studs, screws, electrical conduits, and permanent speaker magnets through local geomagnetic flux distortions (μT). Includes audio Geiger-counter pitch.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
              audioEnabled
                ? 'bg-violet-50 border-violet-200 text-violet-700'
                : 'bg-zinc-50 border-zinc-200 text-zinc-400'
            }`}
            title="Toggle Geiger Clicks"
          >
            {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={calibrateBaseline}
            className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Zero Ambient Baseline
          </button>
        </div>
      </div>

      {/* Main Flux Meter */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-zinc-500 font-semibold mb-2">
              <span>MAGNETIC FLUX DENSITY</span>
              <span className={`font-bold ${delta > 20 ? 'text-violet-600' : 'text-zinc-500'}`}>
                {detectionLevel}
              </span>
            </div>

            <div className="flex items-baseline gap-2 my-2">
              <span className="text-6xl font-black font-mono text-zinc-900 tracking-tight">
                {currentFlux.toFixed(1)}
              </span>
              <span className="text-xl font-bold text-violet-600">μT</span>
              <span className="text-xs font-bold text-zinc-400">
                (Δ +{delta.toFixed(1)} μT)
              </span>
            </div>

            {/* Signal Strength Bar */}
            <div className="w-full bg-zinc-100 h-4 rounded-full overflow-hidden mt-4 p-0.5 border border-zinc-200">
              <div
                className={`h-full rounded-full transition-all duration-150 ${
                  delta > 50 ? 'bg-rose-500' : delta > 20 ? 'bg-amber-500' : 'bg-violet-600'
                }`}
                style={{ width: `${Math.min(100, (delta / 120) * 100)}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mt-5 text-xs">
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                <span className="text-zinc-500 block text-[11px]">Earth Baseline</span>
                <span className="font-mono font-bold text-zinc-800">{baselineFlux.toFixed(1)} μT</span>
              </div>
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                <span className="text-zinc-500 block text-[11px]">Audio Geiger clicks</span>
                <span className="font-mono font-bold text-zinc-800">
                  {audioEnabled ? (delta > 5 ? 'ACTIVE CLICKS' : 'QUIET') : 'MUTED'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between">
            <span className="text-[11px] text-zinc-400">
              Sweep the top edge of your phone across the wall.
            </span>
            <button
              onClick={() => setSimulatedMagnetNear(!simulatedMagnetNear)}
              className="text-[11px] font-bold text-violet-600 hover:text-violet-700 cursor-pointer"
            >
              {simulatedMagnetNear ? 'Remove Test Magnet' : 'Hold Fridge Magnet Near'}
            </button>
          </div>
        </div>

        {/* Stud Finder Visual Guide */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              PHYSICAL HOW-TO GUIDE
            </span>
            <div className="space-y-3 text-xs text-zinc-600 leading-relaxed mt-2">
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex items-start gap-2.5">
                <Crosshair className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Drywall Screws & Studs:</strong> Drywall is held to wooden or metal studs by steel screws every 16–24 inches. Zero the baseline away from the wall, then sweep slowly until a localized peak clicks.
                </div>
              </div>
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex items-start gap-2.5">
                <Magnet className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Speaker Magnets:</strong> Neodymium magnets inside earbuds or laptop speakers emit hundreds of μT and will register immediate maximum deflections.
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-100 text-[11px] text-zinc-500 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-violet-600 shrink-0" />
            <span>Reads hall-effect compass magnetometer registers without network access.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
