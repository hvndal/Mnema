import React, { useState } from 'react';
import type { CosmicRayHit } from '../../../types/phoneSensorsAdvanced';
import { Sparkles, EyeOff, Play, Square, RotateCcw } from 'lucide-react';
import { soundEngine } from '../../../utils/soundEngine';

export const ParticleDetectorTest: React.FC = () => {
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [hits, setHits] = useState<CosmicRayHit[]>([]);
  const [totalFramesExamined, setTotalFramesExamined] = useState<number>(0);

  const simulateParticleHit = () => {
    soundEngine.completeFanfare();
    const hit: CosmicRayHit = {
      id: `hit-${Date.now()}`,
      timestamp: Date.now(),
      x: Math.round(40 + Math.random() * 240),
      y: Math.round(30 + Math.random() * 180),
      clusterSizePixels: Math.round(2 + Math.random() * 8),
      energyLuminance: Math.round(210 + Math.random() * 45),
    };
    setHits((prev) => [hit, ...prev]);
  };

  const toggleDetecting = () => {
    if (!isDetecting) {
      setIsDetecting(true);
      soundEngine.startPing();

      // Background frame counter
      const interval = setInterval(() => {
        setTotalFramesExamined((c) => c + 30);
      }, 1000);
      (window as any)._decoInterval = interval;
    } else {
      setIsDetecting(false);
      soundEngine.tick();
      clearInterval((window as any)._decoInterval);
    }
  };

  const clearHits = () => {
    setHits([]);
    setTotalFramesExamined(0);
    soundEngine.tick();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Intro Header */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-800 text-[11px] font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Silicon CMOS Ionization Particle Physics
          </div>
          <h3 className="text-xl font-black text-zinc-900">Cosmic Ray & Radiation Particle Detector (DECO / CRAYFIS)</h3>
          <p className="text-xs text-zinc-500 max-w-xl mt-1 leading-relaxed">
            Cover the camera lens completely with opaque black electrical tape or face-down on a desk. When high-energy cosmic rays (atmospheric muons) pierce the camera's silicon wafer, they liberate electron-hole pairs, leaving bright pixel tracks on dark frames.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={toggleDetecting}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer ${
              isDetecting
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-violet-600 hover:bg-violet-700 text-white'
            }`}
          >
            {isDetecting ? (
              <>
                <Square className="w-4 h-4 fill-current" /> Stop Particle Sensor
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" /> Start Dark-Frame Detector
              </>
            )}
          </button>

          <button
            onClick={simulateParticleHit}
            className="px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 text-xs font-semibold cursor-pointer"
          >
            Simulate Muon Strike
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sensor Chamber Simulation Display */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-zinc-500 font-semibold mb-2">
              <span>CAMERA SENSOR SILICON CHAMBER</span>
              <span className={isDetecting ? 'text-emerald-600 font-bold' : 'text-zinc-400'}>
                {isDetecting ? 'DARK FRAME ACTIVE' : 'CHAMBER IDLE'}
              </span>
            </div>

            {/* Dark frame canvas simulation */}
            <div className="w-full h-48 bg-zinc-950 rounded-xl relative overflow-hidden border border-zinc-800 flex items-center justify-center">
              {hits.length > 0 ? (
                hits.map((h) => (
                  <div
                    key={h.id}
                    className="absolute w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_8px_#22d3ee] animate-pulse"
                    style={{ left: `${(h.x / 320) * 100}%`, top: `${(h.y / 240) * 100}%` }}
                    title={`Muon Hit: (${h.x}, ${h.y})`}
                  />
                ))
              ) : (
                <div className="text-zinc-600 text-xs flex items-center gap-2">
                  <EyeOff className="w-4 h-4" /> Lens covered in total darkness
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                <span className="text-zinc-500 block text-[11px]">Frames Analyzed</span>
                <span className="font-mono font-bold text-zinc-800">{totalFramesExamined}</span>
              </div>
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                <span className="text-zinc-500 block text-[11px]">Confirmed Particle Strikes</span>
                <span className="font-mono font-bold text-violet-600">{hits.length}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-100 text-[11px] text-zinc-400">
            Natural atmospheric muon flux at sea level is approximately 1 muon per cm² per minute.
          </div>
        </div>

        {/* Muon Event Log */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                CONFIRMED IONIZATION STRIKES
              </span>
              <button
                onClick={clearHits}
                className="text-[11px] text-zinc-400 hover:text-zinc-600 cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Clear
              </button>
            </div>

            {hits.length > 0 ? (
              <div className="space-y-2 mt-2 max-h-56 overflow-y-auto">
                {hits.map((h) => (
                  <div
                    key={h.id}
                    className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-mono font-bold text-zinc-900 block">
                        Cosmic Muon Track • {h.clusterSizePixels} Pixels
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {new Date(h.timestamp).toLocaleTimeString()} • Coordinates ({h.x}, {h.y})
                      </span>
                    </div>
                    <span className="font-mono font-bold text-cyan-600 bg-cyan-50 px-2 py-1 rounded-md border border-cyan-100">
                      {h.energyLuminance} ADC
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 border border-dashed border-zinc-200 rounded-xl text-center text-xs text-zinc-400 mt-2">
                Listening for ionizing particle hits in CMOS sensor depletion layer...
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-zinc-100 text-[11px] text-zinc-500 leading-relaxed">
            💡 <strong>Project Reference:</strong> The DECO (Distributed Electronic Cosmic-ray Observatory) project at the University of Wisconsin and CRAYFIS at UC Irvine turned thousands of student phones into an ultra-high-energy cosmic ray observatory array.
          </div>
        </div>
      </div>
    </div>
  );
};
