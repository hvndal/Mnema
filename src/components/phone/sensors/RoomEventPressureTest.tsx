import React, { useState } from 'react';
import type { RoomPressurePulse } from '../../../types/phoneSensorsAdvanced';
import { DoorClosed, Wind, RotateCcw, Activity } from 'lucide-react';
import { soundEngine } from '../../../utils/soundEngine';

interface RoomEventPressureTestProps {
  isSimulated?: boolean;
}

export const RoomEventPressureTest: React.FC<RoomEventPressureTestProps> = ({ isSimulated }) => {
  const [isMonitoring, setIsMonitoring] = useState<boolean>(true);
  const currentPressureHpa = 1013.12;
  const [recentPulses, setRecentPulses] = useState<RoomPressurePulse[]>([]);
  const [liveDeltaHpa, setLiveDeltaHpa] = useState<number>(0.02);

  const simulateRoomPulse = (type: RoomPressurePulse['eventType']) => {
    soundEngine.completeFanfare();
    const delta = type === 'door_slam' ? 0.38 : type === 'hvac_cycle' ? 0.14 : 0.08;
    setLiveDeltaHpa(delta);

    const pulse: RoomPressurePulse = {
      timestamp: Date.now(),
      deltaHpa: delta,
      eventType: type,
    };
    setRecentPulses((prev) => [pulse, ...prev.slice(0, 5)]);
  };

  const clearHistory = () => {
    setRecentPulses([]);
    soundEngine.tick();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[11px] font-bold mb-2">
            <DoorClosed className="w-3.5 h-3.5" />
            Infrasonic Environmental Barometry
            {isSimulated && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded bg-amber-200/60 text-amber-900 text-[10px] font-semibold">
                Simulated
              </span>
            )}
          </div>
          <h3 className="text-xl font-black text-zinc-900">Room Event & Door Blast Detector</h3>
          <p className="text-xs text-zinc-500 max-w-xl mt-1 leading-relaxed">
            In an enclosed room or building, a door opening/closing or the central AC/HVAC kicking in instantly forces or draws a micro-barometric pressure wave (0.05 to 0.4 hPa) that reverberates throughout the entire room enclosure.
          </p>
        </div>

        <button
          onClick={clearHistory}
          className="px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer self-start"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Clear Pulse Log
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Live Pulse Gauge */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-zinc-500 font-semibold mb-2">
              <span>INFRASONIC PRESSURE WAVE DELTA</span>
              <button
                onClick={() => setIsMonitoring(!isMonitoring)}
                className={`font-mono text-xs font-bold cursor-pointer ${isMonitoring ? 'text-emerald-600' : 'text-zinc-400'}`}
              >
                {isMonitoring ? '● MONITORING ACTIVE' : '○ PAUSED'}
              </button>
            </div>

            <div className="flex items-baseline gap-2 my-2">
              <span className="text-6xl font-black font-mono text-zinc-900 tracking-tight">
                +{liveDeltaHpa.toFixed(2)}
              </span>
              <span className="text-xl font-bold text-sky-600">hPa</span>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                <span className="text-zinc-500 block text-[11px]">Enclosure Ambient</span>
                <span className="font-mono font-bold text-zinc-800">{currentPressureHpa} hPa</span>
              </div>
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                <span className="text-zinc-500 block text-[11px]">Detection Trigger</span>
                <span className="font-mono font-bold text-sky-700">&gt; 0.08 hPa</span>
              </div>
            </div>
          </div>

          {/* Test Buttons */}
          <div className="mt-6 pt-4 border-t border-zinc-100">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
              Simulate Infrasonic Room Disturbances
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => simulateRoomPulse('door_slam')}
                className="flex-1 py-2 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <DoorClosed className="w-3.5 h-3.5 text-violet-600" /> Door Slam (+0.38 hPa)
              </button>
              <button
                onClick={() => simulateRoomPulse('hvac_cycle')}
                className="flex-1 py-2 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Wind className="w-3.5 h-3.5 text-sky-600" /> HVAC Kick-In (+0.14 hPa)
              </button>
            </div>
          </div>
        </div>

        {/* Pulse Event History */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              RECORDED ROOM PRESSURE PULSES
            </span>

            {recentPulses.length > 0 ? (
              <div className="space-y-2 mt-2">
                {recentPulses.map((pulse, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-sky-50 border border-sky-200 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-sky-900 block capitalize">
                        {pulse.eventType.replace('_', ' ')} Detected
                      </span>
                      <span className="text-[10px] text-sky-700">
                        {new Date(pulse.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <span className="font-mono font-black text-sky-900">
                      +{pulse.deltaHpa} hPa
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 border border-dashed border-zinc-200 rounded-xl text-center text-xs text-zinc-400 mt-2">
                Listening for rapid room volume compression or airflow pulses...
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-zinc-100 text-[11px] text-zinc-500 flex items-center gap-2">
            <Activity className="w-4 h-4 text-sky-600 shrink-0" />
            <span>Used by smart security systems to detect window intrusions and forced entry.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
