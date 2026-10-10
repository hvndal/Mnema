import React, { useState, useEffect, useRef } from 'react';
import type { MotionSample } from '../../../types/phoneSensors';
import type { EarthquakeTriggerEvent } from '../../../types/phoneSensorsAdvanced';
import { computeStaLtaRatio } from '../../../utils/phoneSensorsAdvancedMath';
import { Radio, ShieldCheck, Play } from 'lucide-react';
import { soundEngine } from '../../../utils/soundEngine';

interface EarthquakeNetworkTestProps {
  latestMotion: MotionSample | null;
  sensorHz?: number;
  isSimulated?: boolean;
}

export const EarthquakeNetworkTest: React.FC<EarthquakeNetworkTestProps> = ({
  latestMotion,
  isSimulated,
}) => {
  const [isStationary, setIsStationary] = useState<boolean>(true);
  const [currentStaLta, setCurrentStaLta] = useState<number>(1.0);
  const [currentPgaG, setCurrentPgaG] = useState<number>(0.005);
  const [recentEvents, setRecentEvents] = useState<EarthquakeTriggerEvent[]>([]);

  const shortTermBufRef = useRef<number[]>([]);
  const longTermBufRef = useRef<number[]>([]);

  // Monitoring loop
  useEffect(() => {
    if (!latestMotion) return;

    const netA = Math.abs((latestMotion.magnitude || 9.81) - 9.81);
    const pgaG = netA / 9.81;
    setCurrentPgaG(Math.round(pgaG * 1000) / 1000);
    setIsStationary(netA < 0.45);

    // Update buffers
    shortTermBufRef.current.push(netA);
    longTermBufRef.current.push(netA);

    if (shortTermBufRef.current.length > 25) shortTermBufRef.current.shift(); // ~0.5s window
    if (longTermBufRef.current.length > 300) longTermBufRef.current.shift(); // ~6s window

    const ratio = computeStaLtaRatio(shortTermBufRef.current, longTermBufRef.current);
    setCurrentStaLta(ratio);

    // STA/LTA trigger threshold (typically > 3.8 in seismology)
    if (ratio > 4.2 && isStationary) {
      soundEngine.completeFanfare();
      const intensity = pgaG > 0.34 ? 'Severe' : pgaG > 0.18 ? 'Strong' : pgaG > 0.09 ? 'Moderate' : pgaG > 0.04 ? 'Light' : 'Weak';
      const event: EarthquakeTriggerEvent = {
        timestamp: Date.now(),
        staLtaRatio: ratio,
        peakGroundAccelG: Math.round(pgaG * 100) / 100,
        intensityCategory: intensity,
        shakingDurationMs: 1400,
      };
      setRecentEvents((prev) => [event, ...prev.slice(0, 4)]);
    }
  }, [latestMotion, isStationary]);

  const triggerDrill = () => {
    soundEngine.startPing();
    const event: EarthquakeTriggerEvent = {
      timestamp: Date.now(),
      staLtaRatio: 8.7,
      peakGroundAccelG: 0.14,
      intensityCategory: 'Moderate',
      shakingDurationMs: 2500,
    };
    setCurrentStaLta(8.7);
    setCurrentPgaG(0.14);
    setRecentEvents((prev) => [event, ...prev.slice(0, 4)]);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Intro Header */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold mb-2">
            <Radio className="w-3.5 h-3.5" />
            Crowdsourced Seismology Network
            {isSimulated && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded bg-amber-200/60 text-amber-900 text-[10px] font-semibold">
                Simulated
              </span>
            )}
          </div>
          <h3 className="text-xl font-black text-zinc-900">Earthquake Alerts & Seismometer</h3>
          <p className="text-xs text-zinc-500 max-w-xl mt-1 leading-relaxed">
            Android's Earthquake Alerts System uses billions of stationary phones as miniature seismometers. Using the STA/LTA (Short-Term Average / Long-Term Average) trigger, it detects seismic P-waves before damaging S-waves hit.
          </p>
        </div>

        <button
          onClick={triggerDrill}
          className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer"
        >
          <Play className="w-4 h-4 fill-current" /> Simulate Earthquake Drill
        </button>
      </div>

      {/* Live Seismograph Readout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-zinc-500 font-semibold mb-2">
              <span>STA / LTA ENERGY RATIO</span>
              <span className={currentStaLta > 3.8 ? 'text-rose-600 font-bold' : 'text-zinc-500'}>
                TRIGGER THRESHOLD: 4.2
              </span>
            </div>

            <div className="flex items-baseline gap-2 my-2">
              <span className={`text-6xl font-black font-mono tracking-tight ${
                currentStaLta > 4.2 ? 'text-rose-600 animate-pulse' : 'text-zinc-900'
              }`}>
                {currentStaLta.toFixed(2)}
              </span>
              <span className="text-sm font-bold text-zinc-400">ratio</span>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                <span className="text-zinc-500 block text-[11px]">Peak Ground Accel (PGA)</span>
                <span className="font-mono font-bold text-zinc-800">{currentPgaG} g</span>
              </div>
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                <span className="text-zinc-500 block text-[11px]">Station Status</span>
                <span className={`font-mono font-bold ${isStationary ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {isStationary ? 'STATIONARY / LISTENING' : 'PHONE IN MOTION'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-100 text-[11px] text-zinc-400">
            Keep phone resting flat on a stable desk or floor.
          </div>
        </div>

        {/* Triggered Events Log */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              SEISMIC TRIGGER DETECTIONS
            </span>

            {recentEvents.length > 0 ? (
              <div className="space-y-2 mt-2">
                {recentEvents.map((evt, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-rose-900 block">
                        {evt.intensityCategory} Shaking Event
                      </span>
                      <span className="text-[10px] text-rose-700">
                        {new Date(evt.timestamp).toLocaleTimeString()} • {evt.shakingDurationMs}ms
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-rose-900 block">
                        PGA: {evt.peakGroundAccelG}g
                      </span>
                      <span className="text-[10px] text-rose-600 font-mono">
                        STA/LTA: {evt.staLtaRatio}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 border border-dashed border-zinc-200 rounded-xl text-center text-xs text-zinc-400 mt-2">
                No seismic disturbances detected. Background microseismic noise nominal.
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-zinc-100 text-[11px] text-zinc-500 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Demonstrates Android's crowdsourced earthquake early-warning architecture.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
