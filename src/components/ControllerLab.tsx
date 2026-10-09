import React, { useState } from 'react';
import type { RawGamepadState, StickCalibrationData } from '../types/telemetry';
import { ControllerSchematic } from './ControllerSchematic';
import {
  updateCenterCalibration,
  updateRangeCalibration,
} from '../utils/stickCalibration';

interface ControllerLabProps {
  controller: RawGamepadState | null;
  browserRenderHz: number;
  leftStickCalib: StickCalibrationData;
  setLeftStickCalib: React.Dispatch<React.SetStateAction<StickCalibrationData>>;
  rightStickCalib: StickCalibrationData;
  setRightStickCalib: React.Dispatch<React.SetStateAction<StickCalibrationData>>;
  recentEvents: any[];
  clearEventHistory: () => void;
  stateChangeIntervalStats: any;
  resetTelemetryStats: () => void;
}

export const ControllerLab: React.FC<ControllerLabProps> = ({
  controller,
  leftStickCalib,
  setLeftStickCalib,
  rightStickCalib,
  setRightStickCalib,
  recentEvents,
  clearEventHistory,
  stateChangeIntervalStats,
  resetTelemetryStats,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'schematic' | 'calibration' | 'telemetry'>('schematic');

  // Calibration loop accumulation
  React.useEffect(() => {
    if (!controller) return;

    const lx = controller.axes[0]?.value ?? 0;
    const ly = controller.axes[1]?.value ?? 0;
    if (leftStickCalib.isCalibratingCenter) {
      setLeftStickCalib(prev => updateCenterCalibration(prev, lx, ly));
    }
    if (leftStickCalib.isCalibratingRange) {
      setLeftStickCalib(prev => updateRangeCalibration(prev, lx, ly));
    }

    const rx = controller.axes[2]?.value ?? 0;
    const ry = controller.axes[3]?.value ?? 0;
    if (rightStickCalib.isCalibratingCenter) {
      setRightStickCalib(prev => updateCenterCalibration(prev, rx, ry));
    }
    if (rightStickCalib.isCalibratingRange) {
      setRightStickCalib(prev => updateRangeCalibration(prev, rx, ry));
    }
  }, [controller, leftStickCalib.isCalibratingCenter, leftStickCalib.isCalibratingRange, rightStickCalib.isCalibratingCenter, rightStickCalib.isCalibratingRange, setLeftStickCalib, setRightStickCalib]);

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6">
      {/* Sub-navigation */}
      <div className="bg-white border border-zinc-200 rounded-xl p-1.5 flex gap-2 w-fit shadow-xs">
        <button
          onClick={() => setActiveSubTab('schematic')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'schematic'
              ? 'bg-violet-600 text-white shadow-xs'
              : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          Interactive Gamepad Map
        </button>
        <button
          onClick={() => setActiveSubTab('calibration')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'calibration'
              ? 'bg-violet-600 text-white shadow-xs'
              : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          Stick Calibration & Dead Zones
        </button>
        <button
          onClick={() => setActiveSubTab('telemetry')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'telemetry'
              ? 'bg-violet-600 text-white shadow-xs'
              : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          Timing Telemetry & Raw Stream
        </button>
      </div>

      {/* Sub-view: Visual Schematic & Button Inspector */}
      {activeSubTab === 'schematic' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-zinc-900">Live Hardware Schematic</h3>
                <p className="text-xs text-zinc-500">Press buttons or deflect sticks on the EvoFox to see responsive input highlights.</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-zinc-100 font-mono text-zinc-600">
                {controller ? `${controller.buttons.length} Buttons • ${controller.axes.length} Axes` : 'No Device'}
              </span>
            </div>

            <ControllerSchematic controller={controller} className="my-2" />

            {/* Individual Button Channels Grid */}
            <div className="mt-2">
              <span className="text-xs font-bold text-zinc-700 block mb-2">RAW BUTTON CHANNELS:</span>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-9 gap-2">
                {controller?.buttons.map((b) => (
                  <div
                    key={b.index}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      b.pressed || b.value > 0.45
                        ? 'bg-violet-600 text-white border-violet-500 shadow-sm font-bold scale-105'
                        : 'bg-zinc-50 border-zinc-200 text-zinc-500'
                    }`}
                  >
                    <span className="text-[11px] block">B{b.index}</span>
                    <span className="text-[10px] font-mono opacity-80">{b.value.toFixed(1)}</span>
                  </div>
                )) || (
                  <div className="col-span-full py-4 text-center text-xs text-zinc-400">
                    Connect EvoFox controller to inspect live channels
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Event Stream Log */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm flex flex-col gap-3">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
              <h4 className="text-xs font-bold text-zinc-800 uppercase tracking-wider">Recent Input Transitions</h4>
              <button
                onClick={clearEventHistory}
                className="text-[11px] text-zinc-400 hover:text-zinc-700 underline cursor-pointer"
              >
                Clear
              </button>
            </div>
            <div className="h-80 overflow-y-auto bg-zinc-50 border border-zinc-200 rounded-xl p-3 flex flex-col gap-1.5 text-xs font-mono">
              {recentEvents.length === 0 ? (
                <span className="text-zinc-400 italic">No button presses or axis movements logged yet.</span>
              ) : (
                recentEvents.slice(0, 30).map((evt: any) => (
                  <div key={evt.id} className="flex items-center gap-2">
                    <span className="text-zinc-400 text-[10px]">[{evt.timestamp.toFixed(0)}ms]</span>
                    <span className={evt.type === 'button_down' ? 'text-violet-600 font-bold' : 'text-zinc-600'}>
                      {evt.description}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sub-view: Stick Calibration & Dead Zone Engine */}
      {activeSubTab === 'calibration' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm flex flex-col gap-6">
          <div className="border-b border-zinc-100 pb-3">
            <h3 className="text-base font-bold text-zinc-900">Analog Stick Calibration & Software Dead Zone</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Physical spring centering mechanisms naturally exhibit slight mechanical drift. Sample your stick at rest to determine the ideal software dead zone.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Stick Card */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-5 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <span className="font-bold text-zinc-900 text-sm">Left Stick (Axes 0 & 1)</span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-violet-100 text-violet-800 font-bold">
                  Recommended Dead Zone: {(leftStickCalib.recommendedDeadzone * 100).toFixed(1)}%
                </span>
              </div>

              {/* 2D Position Visualizer */}
              <div className="relative w-48 h-48 mx-auto bg-white rounded-full border-2 border-zinc-300 flex items-center justify-center overflow-hidden shadow-inner">
                {/* Center crosshair */}
                <div className="w-full h-px bg-zinc-200 absolute" />
                <div className="h-full w-px bg-zinc-200 absolute" />

                {/* Dead zone radius circle */}
                <div
                  style={{
                    width: `${leftStickCalib.recommendedDeadzone * 100 * 2}%`,
                    height: `${leftStickCalib.recommendedDeadzone * 100 * 2}%`,
                  }}
                  className="rounded-full border border-dashed border-violet-400 bg-violet-50/50 absolute"
                />

                {/* Live Stick Dot */}
                <div
                  style={{
                    left: `${(( (controller?.axes[0]?.value ?? 0) + 1) / 2) * 100}%`,
                    top: `${(( (controller?.axes[1]?.value ?? 0) + 1) / 2) * 100}%`,
                  }}
                  className="w-4 h-4 rounded-full bg-violet-600 border-2 border-white absolute -translate-x-1/2 -translate-y-1/2 shadow-sm transition-all duration-75"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white p-2.5 rounded-lg border border-zinc-200">
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Resting Center Drift</span>
                  <span className="font-mono font-bold text-zinc-800 mt-0.5 block">
                    X: {leftStickCalib.restingCenter.x} | Y: {leftStickCalib.restingCenter.y}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-zinc-200">
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Full Range Extents</span>
                  <span className="font-mono font-bold text-zinc-800 mt-0.5 block">
                    [{leftStickCalib.observedMin.x}, {leftStickCalib.observedMax.x}]
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setLeftStickCalib(prev => ({ ...prev, isCalibratingCenter: !prev.isCalibratingCenter }))}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                    leftStickCalib.isCalibratingCenter
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  {leftStickCalib.isCalibratingCenter ? 'Stop Rest Sampling' : 'Sample Resting Position'}
                </button>
                <button
                  onClick={() => setLeftStickCalib(prev => ({ ...prev, isCalibratingRange: !prev.isCalibratingRange }))}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                    leftStickCalib.isCalibratingRange
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  {leftStickCalib.isCalibratingRange ? 'Stop Range Recording' : 'Record Full Range'}
                </button>
              </div>
            </div>

            {/* Right Stick Card */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-5 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <span className="font-bold text-zinc-900 text-sm">Right Stick (Axes 2 & 3)</span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-violet-100 text-violet-800 font-bold">
                  Recommended Dead Zone: {(rightStickCalib.recommendedDeadzone * 100).toFixed(1)}%
                </span>
              </div>

              {/* 2D Position Visualizer */}
              <div className="relative w-48 h-48 mx-auto bg-white rounded-full border-2 border-zinc-300 flex items-center justify-center overflow-hidden shadow-inner">
                <div className="w-full h-px bg-zinc-200 absolute" />
                <div className="h-full w-px bg-zinc-200 absolute" />

                <div
                  style={{
                    width: `${rightStickCalib.recommendedDeadzone * 100 * 2}%`,
                    height: `${rightStickCalib.recommendedDeadzone * 100 * 2}%`,
                  }}
                  className="rounded-full border border-dashed border-violet-400 bg-violet-50/50 absolute"
                />

                <div
                  style={{
                    left: `${(( (controller?.axes[2]?.value ?? 0) + 1) / 2) * 100}%`,
                    top: `${(( (controller?.axes[3]?.value ?? 0) + 1) / 2) * 100}%`,
                  }}
                  className="w-4 h-4 rounded-full bg-violet-600 border-2 border-white absolute -translate-x-1/2 -translate-y-1/2 shadow-sm transition-all duration-75"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white p-2.5 rounded-lg border border-zinc-200">
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Resting Center Drift</span>
                  <span className="font-mono font-bold text-zinc-800 mt-0.5 block">
                    X: {rightStickCalib.restingCenter.x} | Y: {rightStickCalib.restingCenter.y}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-zinc-200">
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Full Range Extents</span>
                  <span className="font-mono font-bold text-zinc-800 mt-0.5 block">
                    [{rightStickCalib.observedMin.x}, {rightStickCalib.observedMax.x}]
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setRightStickCalib(prev => ({ ...prev, isCalibratingCenter: !prev.isCalibratingCenter }))}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                    rightStickCalib.isCalibratingCenter
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  {rightStickCalib.isCalibratingCenter ? 'Stop Rest Sampling' : 'Sample Resting Position'}
                </button>
                <button
                  onClick={() => setRightStickCalib(prev => ({ ...prev, isCalibratingRange: !prev.isCalibratingRange }))}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                    rightStickCalib.isCalibratingRange
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  {rightStickCalib.isCalibratingRange ? 'Stop Range Recording' : 'Record Full Range'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-view: Telemetry & Sampling Interval Analytics */}
      {activeSubTab === 'telemetry' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm flex flex-col gap-6">
          <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-zinc-900">Input Change Telemetry</h3>
              <p className="text-xs text-zinc-500">Separates display frame cadence from physical controller input state alterations.</p>
            </div>
            <button
              onClick={resetTelemetryStats}
              className="text-xs text-zinc-500 hover:text-zinc-800 underline cursor-pointer"
            >
              Reset Counters
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="bg-zinc-50 border border-zinc-200 p-4 rounded-xl">
              <span className="text-zinc-500 block mb-1">State Change Events</span>
              <span className="text-2xl font-bold font-mono text-zinc-900">{stateChangeIntervalStats.observedChanges}</span>
            </div>
            <div className="bg-zinc-50 border border-zinc-200 p-4 rounded-xl">
              <span className="text-zinc-500 block mb-1">Mean Change Interval</span>
              <span className="text-2xl font-bold font-mono text-emerald-600">
                {stateChangeIntervalStats.meanIntervalMs > 0 ? `${stateChangeIntervalStats.meanIntervalMs} ms` : 'Awaiting input'}
              </span>
            </div>
            <div className="bg-zinc-50 border border-zinc-200 p-4 rounded-xl">
              <span className="text-zinc-500 block mb-1">Interval Variation (StdDev)</span>
              <span className="text-2xl font-bold font-mono text-sky-600">
                ±{stateChangeIntervalStats.stdDevMs} ms
              </span>
            </div>
            <div className="bg-zinc-50 border border-zinc-200 p-4 rounded-xl">
              <span className="text-zinc-500 block mb-1">Last Observed Interval</span>
              <span className="text-2xl font-bold font-mono text-zinc-800">
                {stateChangeIntervalStats.lastChangeIntervalMs} ms
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
