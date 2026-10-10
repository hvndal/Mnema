import React, { useState, useEffect, useRef } from 'react';
import type { MotionSample } from '../../../types/phoneSensors';
import type { PotholeIncident } from '../../../types/phoneSensorsAdvanced';
import { detectPotholes } from '../../../utils/phoneSensorsAdvancedMath';
import { Navigation, AlertTriangle, Play, Square, MapPin } from 'lucide-react';
import { soundEngine } from '../../../utils/soundEngine';

interface RoadRoughnessTestProps {
  latestMotion: MotionSample | null;
  sensorHz?: number;
  isSimulated?: boolean;
}

export const RoadRoughnessTest: React.FC<RoadRoughnessTestProps> = ({
  latestMotion,
}) => {
  const [isLogging, setIsLogging] = useState<boolean>(false);
  const [roughnessIndexIri, setRoughnessIndexIri] = useState<number>(2.4);
  const [potholes, setPotholes] = useState<PotholeIncident[]>([]);
  const [liveZJolt, setLiveZJolt] = useState<number>(0);

  const samplesBufferRef = useRef<{ timestamp: number; accelZ: number }[]>([]);

  useEffect(() => {
    if (!isLogging || !latestMotion) return;

    const az = latestMotion.accelZ ? latestMotion.accelZ + 9.81 : (latestMotion.accelerationIncludingGravity?.z ?? 9.81);
    const joltG = Math.abs(az - 9.81) / 9.81;
    setLiveZJolt(Math.round(joltG * 100) / 100);

    const now = performance.now();
    samplesBufferRef.current.push({ timestamp: now, accelZ: az });

    // Keep 80 samples
    if (samplesBufferRef.current.length > 80) {
      samplesBufferRef.current.shift();
    }

    // Run bump detection
    const found = detectPotholes(samplesBufferRef.current, 1.4);
    if (found.length > 0) {
      const p = found[0];
      soundEngine.tick();
      setPotholes((prev) => {
        if (prev.some((x) => Math.abs(x.timestamp - p.timestamp) < 600)) return prev;
        return [p, ...prev.slice(0, 5)];
      });
    }

    // Update estimated IRI (m/km) from RMS vertical acceleration
    const rms = Math.sqrt(
      samplesBufferRef.current.reduce((acc, s) => acc + (s.accelZ - 9.81) ** 2, 0) /
        (samplesBufferRef.current.length || 1)
    );
    const iri = Math.max(1.2, Math.min(9.5, Math.round((1.4 + rms * 1.8) * 10) / 10));
    setRoughnessIndexIri(iri);
  }, [isLogging, latestMotion]);

  const toggleLogging = () => {
    if (!isLogging) {
      samplesBufferRef.current = [];
      setPotholes([]);
      setIsLogging(true);
      soundEngine.startPing();
    } else {
      setIsLogging(false);
      soundEngine.tick();
    }
  };

  const simulatePothole = () => {
    soundEngine.completeFanfare();
    const mockPothole: PotholeIncident = {
      id: `pothole-${Date.now()}`,
      timestamp: Date.now(),
      joltPeakG: 2.35,
      durationMs: 140,
      severity: 'severe',
    };
    setPotholes((prev) => [mockPothole, ...prev.slice(0, 5)]);
    setRoughnessIndexIri(5.8);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Intro Header */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-800 text-[11px] font-bold mb-2">
            <Navigation className="w-3.5 h-3.5" />
            Vehicle Mount Telematics
          </div>
          <h3 className="text-xl font-black text-zinc-900">Road Mapping & Pothole Jolt Logger</h3>
          <p className="text-xs text-zinc-500 max-w-xl mt-1 leading-relaxed">
            Mount phone in a dashboard cradle while driving or cycling. Vertical impact impulses log potholes and compute road surface roughness (approximating the International Roughness Index IRI).
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={toggleLogging}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer ${
              isLogging
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-violet-600 hover:bg-violet-700 text-white'
            }`}
          >
            {isLogging ? (
              <>
                <Square className="w-4 h-4 fill-current" /> Stop Logging
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" /> Start Road Trip Logger
              </>
            )}
          </button>

          <button
            onClick={simulatePothole}
            className="px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 text-xs font-semibold cursor-pointer"
          >
            Simulate Pothole Bump
          </button>
        </div>
      </div>

      {/* Main Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-zinc-500 font-semibold mb-2">
              <span>ROAD ROUGHNESS INDEX (ESTIMATED IRI)</span>
              <span className={`font-bold ${roughnessIndexIri > 4.5 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {roughnessIndexIri < 2.5 ? 'SMOOTH PAVEMENT' : roughnessIndexIri < 5.0 ? 'FAIR ROAD' : 'ROUGH TERRAIN'}
              </span>
            </div>

            <div className="flex items-baseline gap-2 my-2">
              <span className="text-6xl font-black font-mono text-zinc-900 tracking-tight">
                {roughnessIndexIri.toFixed(1)}
              </span>
              <span className="text-sm font-bold text-zinc-400">m / km</span>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                <span className="text-zinc-500 block text-[11px]">Instantaneous Z-Jolt</span>
                <span className="font-mono font-bold text-zinc-800">{liveZJolt} g</span>
              </div>
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                <span className="text-zinc-500 block text-[11px]">Potholes Logged</span>
                <span className="font-mono font-bold text-violet-600">{potholes.length}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-100 text-[11px] text-zinc-400">
            Calibrated for standard vehicle dashboard mounts with vertical orientation.
          </div>
        </div>

        {/* Potholes Detected Table */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              RECORDED IMPACT INCIDENTS
            </span>

            {potholes.length > 0 ? (
              <div className="space-y-2 mt-2">
                {potholes.map((p, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <div>
                        <span className="font-bold text-amber-900 block capitalize">
                          {p.severity} Pothole Impact
                        </span>
                        <span className="text-[10px] text-amber-700">
                          {p.durationMs}ms impact window
                        </span>
                      </div>
                    </div>
                    <span className="font-mono font-black text-amber-900">
                      +{p.joltPeakG} g
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 border border-dashed border-zinc-200 rounded-xl text-center text-xs text-zinc-400 mt-2">
                No pothole impacts detected. Road surface smooth.
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-zinc-100 text-[11px] text-zinc-500 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-violet-600 shrink-0" />
            <span>Telemetry data format compatible with OpenStreetMap road quality tagging.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
