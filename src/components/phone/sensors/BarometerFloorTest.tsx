import React, { useState, useEffect } from 'react';
import { CloudRain, ArrowUp, ArrowDown, Building2, RotateCcw } from 'lucide-react';
import { soundEngine } from '../../../utils/soundEngine';

interface BarometerFloorTestProps {
  isSimulated?: boolean;
}

export const BarometerFloorTest: React.FC<BarometerFloorTestProps> = () => {
  const [baselinePressure, setBaselinePressure] = useState<number>(1012.4);
  const [currentPressure, setCurrentPressure] = useState<number>(1012.4);
  const [simulatedFloorDelta, setSimulatedFloorDelta] = useState<number>(0);

  // Pressure drops ~ 0.12 hPa per meter: delta_h = (P_base - P_curr) / 0.12
  const deltaP = baselinePressure - currentPressure;
  const relativeAltitudeMeters = Math.round((deltaP / 0.12) * 10) / 10;
  // Assuming ~3.0 meters per architectural building floor
  const estimatedFloor = Math.round(relativeAltitudeMeters / 3.0);

  // Listen for native Generic Sensor API PressureSensor if available
  useEffect(() => {
    let sensor: any = null;
    try {
      if ('PressureSensor' in window) {
        sensor = new (window as any).PressureSensor({ frequency: 5 });
        sensor.addEventListener('reading', () => {
          if (sensor.pressure) {
            setCurrentPressure(Math.round(sensor.pressure * 10) / 10);
          }
        });
        sensor.start();
      }
    } catch (e) {
      // Pressure sensor not supported natively or needs permission
    }

    return () => {
      if (sensor) sensor.stop();
    };
  }, []);

  const changeSimulatedFloor = (delta: number) => {
    soundEngine.tick();
    const newFloor = simulatedFloorDelta + delta;
    setSimulatedFloorDelta(newFloor);
    // 1 floor = 3m = 0.36 hPa drop
    const newPressure = Math.round((baselinePressure - newFloor * 3.0 * 0.12) * 100) / 100;
    setCurrentPressure(newPressure);
  };

  const calibrateBaseline = () => {
    soundEngine.startPing();
    setBaselinePressure(currentPressure);
    setSimulatedFloorDelta(0);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Intro Header */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[11px] font-bold mb-2">
            <CloudRain className="w-3.5 h-3.5" />
            Barometric Air Pressure (hPa)
          </div>
          <h3 className="text-xl font-black text-zinc-900">Floor Detection & Micro-Altimeter</h3>
          <p className="text-xs text-zinc-500 max-w-xl mt-1 leading-relaxed">
            Atmospheric pressure drops approximately <strong>0.12 hPa per vertical meter</strong> (barometric hypsometric formula). Most modern smartphones contain a MEMS piezoresistive barometer sensitive enough to count individual staircase steps and building floors.
          </p>
        </div>

        <button
          onClick={calibrateBaseline}
          className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer self-start"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Zero Current Floor
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Main Floor Counter Display */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-zinc-500 font-semibold mb-2">
              <span>ESTIMATED VERTICAL LEVEL</span>
              <span className="font-mono text-zinc-400">P_BASE: {baselinePressure.toFixed(2)} hPa</span>
            </div>

            <div className="flex items-baseline gap-2 my-2">
              <span className="text-6xl font-black font-mono text-zinc-900 tracking-tight">
                {estimatedFloor >= 0 ? `+${estimatedFloor}` : estimatedFloor}
              </span>
              <span className="text-xl font-bold text-sky-600">Floors</span>
              <span className="text-xs font-bold text-zinc-400">
                ({relativeAltitudeMeters >= 0 ? `+${relativeAltitudeMeters}` : relativeAltitudeMeters} m)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                <span className="text-zinc-500 block text-[11px]">Current Pressure</span>
                <span className="font-mono font-bold text-zinc-800">{currentPressure.toFixed(2)} hPa</span>
              </div>
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                <span className="text-zinc-500 block text-[11px]">Pressure Drop (ΔP)</span>
                <span className="font-mono font-bold text-sky-700">{deltaP.toFixed(2)} hPa</span>
              </div>
            </div>
          </div>

          {/* Interactive Elevator Simulator Controls */}
          <div className="mt-6 pt-4 border-t border-zinc-100">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
              Elevator Ride / Stair Climb Simulator
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => changeSimulatedFloor(1)}
                className="flex-1 py-2 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowUp className="w-3.5 h-3.5 text-emerald-600" /> Ascend 1 Floor (+3m)
              </button>
              <button
                onClick={() => changeSimulatedFloor(-1)}
                className="flex-1 py-2 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ArrowDown className="w-3.5 h-3.5 text-rose-600" /> Descend 1 Floor (-3m)
              </button>
            </div>
          </div>
        </div>

        {/* Technical Explainer */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              BAROMETRIC HYPSOMETRY PRINCIPLE
            </span>
            <div className="space-y-3 text-xs text-zinc-600 leading-relaxed mt-2">
              <div className="p-3 bg-sky-50/70 border border-sky-200 rounded-xl font-mono text-[11px] text-sky-900">
                Δh ≈ (ΔP) / (0.12 hPa/m)<br />
                Resolution: ~0.01 hPa (~8 cm elevation change)
              </div>
              <p>
                Emergency services (E911 in the United States and eCall in the EU) mandate smartphone vertical z-axis accuracy within 3 meters specifically so dispatchers know which floor of a burning high-rise building a caller is located on.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-100 text-[11px] text-zinc-500 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-sky-600 shrink-0" />
            <span>Used by fitness trackers to count flights of stairs climbed per day.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
