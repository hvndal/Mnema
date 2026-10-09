import React, { useState, useEffect, useRef } from 'react';
import { useControllerDiagnostics } from '../hooks/useControllerDiagnostics';
import { ReactionLab } from './ReactionLab';
import { TargetAcquisitionLab } from './TargetAcquisitionLab';
import { ContinuousTrackingLab } from './ContinuousTrackingLab';
import {
  createInitialStickCalibration,
  updateCenterCalibration,
  updateRangeCalibration,
} from '../utils/stickCalibration';
import {
  exportTelemetryAsJSON,
  exportTelemetryAsCSV,
  type TelemetryExportPayload,
} from '../utils/telemetryExport';
import type { TelemetryFrame, StickCalibrationData } from '../types/telemetry';

export const ControllerDiagnosticsApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'reaction_lab' | 'target_acquisition' | 'continuous_tracking' | 'diagnostics'>('target_acquisition');
  const {
    controller,
    allConnectedGamepads,
    activeSlot,
    setActiveSlot,
    recentEvents,
    clearEventHistory,
    browserRenderHz,
    stateChangeIntervalStats,
    resetTelemetryStats,
    visibilityInterrupted,
    interruptionCount,
  } = useControllerDiagnostics({
    maxEventHistory: 50,
  });

  // Stick calibration state
  const [leftStickCalib, setLeftStickCalib] = useState<StickCalibrationData>(() =>
    createInitialStickCalibration('Left Stick (Axes 0 & 1)', 0, 1)
  );
  const [rightStickCalib, setRightStickCalib] = useState<StickCalibrationData>(() =>
    createInitialStickCalibration('Right Stick (Axes 2 & 3)', 2, 3)
  );

  // Telemetry recording state
  const [isRecordingTelemetry, setIsRecordingTelemetry] = useState<boolean>(false);
  const [recordedFrames, setRecordedFrames] = useState<TelemetryFrame[]>([]);
  const telemetryFrameCountRef = useRef<number>(0);
  const lastChangeSeenRef = useRef<number>(performance.now());

  // Record telemetry frame on each poll if active
  useEffect(() => {
    if (!isRecordingTelemetry || !controller) return;

    const now = performance.now();
    telemetryFrameCountRef.current++;

    const newFrame: TelemetryFrame = {
      sampleIndex: telemetryFrameCountRef.current,
      sampleTime: now,
      hardwareTimestamp: controller.timestamp,
      hasStateChanged: stateChangeIntervalStats.lastChangeIntervalMs > 0,
      timeSinceLastChangeMs: now - lastChangeSeenRef.current,
      buttons: controller.buttons.map(b => ({
        index: b.index,
        pressed: b.pressed,
        value: b.value,
      })),
      axes: controller.axes.map(a => ({
        index: a.index,
        value: a.value,
      })),
    };

    setRecordedFrames(prev => {
      const updated = [...prev, newFrame];
      return updated.length > 2000 ? updated.slice(updated.length - 2000) : updated;
    });
  }, [controller, isRecordingTelemetry, stateChangeIntervalStats.lastChangeIntervalMs]);

  // Calibration loop accumulation
  useEffect(() => {
    if (!controller) return;

    // Left stick
    const lx = controller.axes[0]?.value ?? 0;
    const ly = controller.axes[1]?.value ?? 0;
    if (leftStickCalib.isCalibratingCenter) {
      setLeftStickCalib(prev => updateCenterCalibration(prev, lx, ly));
    }
    if (leftStickCalib.isCalibratingRange) {
      setLeftStickCalib(prev => updateRangeCalibration(prev, lx, ly));
    }

    // Right stick
    const rx = controller.axes[2]?.value ?? 0;
    const ry = controller.axes[3]?.value ?? 0;
    if (rightStickCalib.isCalibratingCenter) {
      setRightStickCalib(prev => updateCenterCalibration(prev, rx, ry));
    }
    if (rightStickCalib.isCalibratingRange) {
      setRightStickCalib(prev => updateRangeCalibration(prev, rx, ry));
    }
  }, [controller, leftStickCalib.isCalibratingCenter, leftStickCalib.isCalibratingRange, rightStickCalib.isCalibratingCenter, rightStickCalib.isCalibratingRange]);

  // Export handlers
  const handleExportJSON = () => {
    const payload: TelemetryExportPayload = {
      exportDate: new Date().toISOString(),
      userAgent: navigator.userAgent,
      controllerMetadata: controller
        ? {
            index: controller.index,
            id: controller.id,
            mapping: controller.mapping,
            buttonCount: controller.buttons.length,
            axisCount: controller.axes.length,
            timestamp: controller.timestamp,
          }
        : null,
      stickCalibration: {
        leftStick: leftStickCalib,
        rightStick: rightStickCalib,
      },
      telemetryFrames: recordedFrames,
    };
    exportTelemetryAsJSON(payload, `evofox-telemetry-${Date.now()}.json`);
  };

  const handleExportCSV = () => {
    exportTelemetryAsCSV(recordedFrames, controller, `evofox-telemetry-${Date.now()}.csv`);
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 flex flex-col gap-6 font-mono text-neutral-200">
      {/* Header & Mode Switcher */}
      <div className="border border-neutral-800 bg-neutral-900/90 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">
            EVOFOX ONE S // CONTROLLER PERFORMANCE LAB
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Psychophysics reaction-time measurement & hardware-input diagnostics.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('reaction_lab')}
            className={`px-3 py-1.5 rounded text-xs font-bold cursor-pointer ${
              activeTab === 'reaction_lab'
                ? 'bg-rose-600 text-white shadow'
                : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:text-white'
            }`}
          >
            ⚡ REACTION LAB
          </button>
          <button
            onClick={() => setActiveTab('target_acquisition')}
            className={`px-3 py-1.5 rounded text-xs font-bold cursor-pointer ${
              activeTab === 'target_acquisition'
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:text-white'
            }`}
          >
            🎯 TARGET ACQUISITION
          </button>
          <button
            onClick={() => setActiveTab('continuous_tracking')}
            className={`px-3 py-1.5 rounded text-xs font-bold cursor-pointer ${
              activeTab === 'continuous_tracking'
                ? 'bg-sky-600 text-white shadow'
                : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:text-white'
            }`}
          >
            🔄 CONTINUOUS TRACKING
          </button>
          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`px-3 py-1.5 rounded text-xs font-bold cursor-pointer ${
              activeTab === 'diagnostics'
                ? 'bg-neutral-200 text-neutral-950 font-bold'
                : 'bg-neutral-950 text-neutral-400 border border-neutral-800 hover:text-white'
            }`}
          >
            🔍 DIAGNOSTICS
          </button>
        </div>
      </div>

      {/* Visibility warning alert */}
      {visibilityInterrupted && (
        <div className="p-3 bg-amber-950/70 border border-amber-700 text-amber-200 text-xs rounded">
          ⚠️ <strong>BROWSER VISIBILITY INTERRUPTION DETECTED:</strong> Tab is currently hidden or inactive. Browser throttling (rAF suspension) pauses input polling. (Interrupt count: {interruptionCount})
        </div>
      )}

      {/* Render Reaction Lab Tab */}
      {activeTab === 'reaction_lab' && (
        <ReactionLab controller={controller} browserRenderHz={browserRenderHz} />
      )}

      {/* Render Target Acquisition Lab Tab */}
      {activeTab === 'target_acquisition' && (
        <TargetAcquisitionLab controller={controller} browserRenderHz={browserRenderHz} />
      )}

      {/* Render Continuous Tracking Lab Tab */}
      {activeTab === 'continuous_tracking' && (
        <ContinuousTrackingLab controller={controller} browserRenderHz={browserRenderHz} />
      )}

      {/* Render Hardware Diagnostics Tab */}
      {activeTab === 'diagnostics' && (
        <>

      {/* Section 1: Controller Connection & Metadata */}
      <div className="border border-neutral-800 bg-neutral-900/70 p-4 rounded-lg flex flex-col gap-3">
        <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
          <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
            1. CONTROLLER CONNECTION & DEVICE PROFILE
          </span>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${controller ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-xs font-bold">
              {controller ? 'CONNECTED' : 'DISCONNECTED / WAITING'}
            </span>
          </div>
        </div>

        {allConnectedGamepads.length > 1 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-neutral-400">SELECT DEVICE SLOT:</span>
            {allConnectedGamepads.map(gp => (
              <button
                key={gp.index}
                onClick={() => setActiveSlot(gp.index)}
                className={`px-2.5 py-1 rounded border text-xs cursor-pointer ${
                  activeSlot === gp.index
                    ? 'bg-neutral-200 text-neutral-950 border-white font-bold'
                    : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                }`}
              >
                Slot {gp.index}: {gp.id.slice(0, 20)}
              </button>
            ))}
          </div>
        )}

        {controller ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 bg-neutral-950 border border-neutral-800 rounded">
              <span className="text-neutral-500 block mb-0.5">DEVICE IDENTIFIER (API)</span>
              <span className="text-neutral-200 font-bold break-all">{controller.id}</span>
            </div>
            <div className="p-2.5 bg-neutral-950 border border-neutral-800 rounded">
              <span className="text-neutral-500 block mb-0.5">W3C MAPPING STANDARD</span>
              <span className="text-neutral-200 font-bold">
                {controller.mapping ? `"${controller.mapping}"` : 'None (Raw / DirectInput)'}
              </span>
            </div>
            <div className="p-2.5 bg-neutral-950 border border-neutral-800 rounded">
              <span className="text-neutral-500 block mb-0.5">BUTTON CHANNELS</span>
              <span className="text-neutral-200 font-bold">{controller.buttons.length} Channels Detected</span>
            </div>
            <div className="p-2.5 bg-neutral-950 border border-neutral-800 rounded">
              <span className="text-neutral-500 block mb-0.5">ANALOG AXIS CHANNELS</span>
              <span className="text-neutral-200 font-bold">{controller.axes.length} Axes Detected</span>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-neutral-950 border border-neutral-800 rounded text-xs text-neutral-400 leading-relaxed">
            No active gamepad detected on slot {activeSlot}.<br />
            <strong>How to wake the connection:</strong> If your 2.4 GHz USB receiver is connected, press any button (e.g. A, B, or Home) on the EvoFox One S. Browsers require a user interaction on the gamepad before granting access to the Gamepad API.
          </div>
        )}
      </div>

      {/* Section 2: Live Input Inspector */}
      {controller && (
        <div className="border border-neutral-800 bg-neutral-900/70 p-4 rounded-lg flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
            <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
              2. LIVE INPUT INSPECTOR (INDEX-BASED, NO HARDCODED NAMES)
            </span>
            <span className="text-xs text-neutral-500">
              API Timestamp: {controller.timestamp.toFixed(2)} ms
            </span>
          </div>

          {/* Button array */}
          <div>
            <span className="text-xs text-neutral-400 block mb-2 font-bold">
              DIGITAL & ANALOG BUTTON MATRIX:
            </span>
            <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-9 gap-2">
              {controller.buttons.map(btn => {
                const isHeld = btn.pressed || btn.value > 0.1;
                return (
                  <div
                    key={btn.index}
                    className={`p-2 rounded border flex flex-col items-center justify-center transition-colors ${
                      isHeld
                        ? 'bg-emerald-950 border-emerald-500 text-emerald-200 font-bold'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    <span className="text-xs">Index [{btn.index}]</span>
                    <span className="text-[11px] mt-0.5">
                      {btn.pressed ? 'PRESSED' : 'RELEASED'}
                    </span>
                    <span className="text-[10px] opacity-75 font-mono">
                      val: {btn.value.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Axes live sliders */}
          <div>
            <span className="text-xs text-neutral-400 block mb-2 font-bold">
              ANALOG AXES (NUMERICAL VALUE & VISUAL DEFLECTION):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {controller.axes.map(axis => {
                const pct = ((axis.value + 1) / 2) * 100;
                return (
                  <div key={axis.index} className="p-2.5 bg-neutral-950 border border-neutral-800 rounded flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-400">Axis [{axis.index}]</span>
                      <span className="font-bold text-neutral-200">{axis.value.toFixed(4)}</span>
                    </div>
                    {/* Visual meter */}
                    <div className="w-full h-2 bg-neutral-800 rounded-full relative overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 absolute top-0"
                        style={{
                          left: axis.value >= 0 ? '50%' : `${pct}%`,
                          width: `${Math.abs(axis.value) * 50}%`,
                        }}
                      />
                      <div className="w-0.5 h-full bg-white absolute left-1/2 top-0" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Transition Event History Log */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-neutral-400 font-bold">
                RECENT INPUT TRANSITIONS (CHRONOLOGICAL EVENT LOG):
              </span>
              <button
                onClick={clearEventHistory}
                className="text-[11px] text-neutral-400 hover:text-white underline cursor-pointer"
              >
                Clear History
              </button>
            </div>
            <div className="h-32 overflow-y-auto bg-neutral-950 border border-neutral-800 p-2 rounded text-[11px] flex flex-col gap-1">
              {recentEvents.length === 0 ? (
                <span className="text-neutral-600 italic">No transitions recorded yet. Press buttons or move sticks to observe events.</span>
              ) : (
                recentEvents.map(evt => (
                  <div key={evt.id} className="flex items-center gap-2">
                    <span className="text-neutral-500">[{evt.timestamp.toFixed(1)}ms]</span>
                    <span className={
                      evt.type === 'button_down' ? 'text-emerald-400 font-bold' :
                      evt.type === 'button_up' ? 'text-neutral-400' : 'text-sky-400'
                    }>
                      {evt.description}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Section 3: Stick Calibration & Deadzone Calculation */}
      <div className="border border-neutral-800 bg-neutral-900/70 p-4 rounded-lg flex flex-col gap-4">
        <div className="border-b border-neutral-800 pb-2">
          <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
            3. ANALOG STICK CALIBRATION & SOFTWARE DEAD ZONE ENGINE
          </span>
          <p className="text-[11px] text-neutral-500 mt-1">
            <strong>Hardware vs Observed distinction:</strong> The Gamepad API reports normalized float coordinates. Physical stick centering springs always have mechanical hysteresis. Use this to measure true resting drift and full physical throw.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left Stick Card */}
          <div className="p-3 bg-neutral-950 border border-neutral-800 rounded flex flex-col gap-3">
            <span className="text-xs font-bold text-neutral-300">{leftStickCalib.label}</span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-neutral-900 rounded">
                <span className="text-neutral-500 block text-[10px]">RESTING CENTER OFFSET</span>
                <span className="font-bold text-neutral-200">
                  X: {leftStickCalib.restingCenter.x} | Y: {leftStickCalib.restingCenter.y}
                </span>
                <span className="text-[10px] text-neutral-500 block mt-0.5">
                  Noise: ±{leftStickCalib.restingNoise.x} / ±{leftStickCalib.restingNoise.y}
                </span>
              </div>
              <div className="p-2 bg-neutral-900 rounded">
                <span className="text-neutral-500 block text-[10px]">OBSERVED EXTENTS (MIN / MAX)</span>
                <span className="font-bold text-neutral-200">
                  X: [{leftStickCalib.observedMin.x}, {leftStickCalib.observedMax.x}]
                </span>
                <span className="font-bold text-neutral-200 block">
                  Y: [{leftStickCalib.observedMin.y}, {leftStickCalib.observedMax.y}]
                </span>
              </div>
            </div>

            <div className="p-2 bg-neutral-900/80 border border-neutral-800 rounded flex justify-between items-center text-xs">
              <div>
                <span className="text-neutral-400 block text-[11px]">CALCULATED DEAD ZONE CEILING:</span>
                <span className="text-[10px] text-neutral-500">Filters 100% of resting drift</span>
              </div>
              <span className="text-emerald-400 font-bold text-sm">
                {(leftStickCalib.recommendedDeadzone * 100).toFixed(1)}% ({leftStickCalib.recommendedDeadzone})
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => setLeftStickCalib(prev => ({ ...prev, isCalibratingCenter: !prev.isCalibratingCenter }))}
                className={`flex-1 py-1.5 px-2 rounded border text-xs cursor-pointer font-bold ${
                  leftStickCalib.isCalibratingCenter
                    ? 'bg-rose-950 text-rose-300 border-rose-600 animate-pulse'
                    : 'bg-neutral-900 text-neutral-300 border-neutral-700 hover:bg-neutral-800'
                }`}
              >
                {leftStickCalib.isCalibratingCenter ? 'STOP REST SAMPLING' : 'SAMPLE RESTING POSITION'}
              </button>
              <button
                onClick={() => setLeftStickCalib(prev => ({ ...prev, isCalibratingRange: !prev.isCalibratingRange }))}
                className={`flex-1 py-1.5 px-2 rounded border text-xs cursor-pointer font-bold ${
                  leftStickCalib.isCalibratingRange
                    ? 'bg-rose-950 text-rose-300 border-rose-600 animate-pulse'
                    : 'bg-neutral-900 text-neutral-300 border-neutral-700 hover:bg-neutral-800'
                }`}
              >
                {leftStickCalib.isCalibratingRange ? 'STOP RANGE RECORDING' : 'RECORD FULL RANGE'}
              </button>
            </div>
          </div>

          {/* Right Stick Card */}
          <div className="p-3 bg-neutral-950 border border-neutral-800 rounded flex flex-col gap-3">
            <span className="text-xs font-bold text-neutral-300">{rightStickCalib.label}</span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-neutral-900 rounded">
                <span className="text-neutral-500 block text-[10px]">RESTING CENTER OFFSET</span>
                <span className="font-bold text-neutral-200">
                  X: {rightStickCalib.restingCenter.x} | Y: {rightStickCalib.restingCenter.y}
                </span>
                <span className="text-[10px] text-neutral-500 block mt-0.5">
                  Noise: ±{rightStickCalib.restingNoise.x} / ±{rightStickCalib.restingNoise.y}
                </span>
              </div>
              <div className="p-2 bg-neutral-900 rounded">
                <span className="text-neutral-500 block text-[10px]">OBSERVED EXTENTS (MIN / MAX)</span>
                <span className="font-bold text-neutral-200">
                  X: [{rightStickCalib.observedMin.x}, {rightStickCalib.observedMax.x}]
                </span>
                <span className="font-bold text-neutral-200 block">
                  Y: [{rightStickCalib.observedMin.y}, {rightStickCalib.observedMax.y}]
                </span>
              </div>
            </div>

            <div className="p-2 bg-neutral-900/80 border border-neutral-800 rounded flex justify-between items-center text-xs">
              <div>
                <span className="text-neutral-400 block text-[11px]">CALCULATED DEAD ZONE CEILING:</span>
                <span className="text-[10px] text-neutral-500">Filters 100% of resting drift</span>
              </div>
              <span className="text-emerald-400 font-bold text-sm">
                {(rightStickCalib.recommendedDeadzone * 100).toFixed(1)}% ({rightStickCalib.recommendedDeadzone})
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => setRightStickCalib(prev => ({ ...prev, isCalibratingCenter: !prev.isCalibratingCenter }))}
                className={`flex-1 py-1.5 px-2 rounded border text-xs cursor-pointer font-bold ${
                  rightStickCalib.isCalibratingCenter
                    ? 'bg-rose-950 text-rose-300 border-rose-600 animate-pulse'
                    : 'bg-neutral-900 text-neutral-300 border-neutral-700 hover:bg-neutral-800'
                }`}
              >
                {rightStickCalib.isCalibratingCenter ? 'STOP REST SAMPLING' : 'SAMPLE RESTING POSITION'}
              </button>
              <button
                onClick={() => setRightStickCalib(prev => ({ ...prev, isCalibratingRange: !prev.isCalibratingRange }))}
                className={`flex-1 py-1.5 px-2 rounded border text-xs cursor-pointer font-bold ${
                  rightStickCalib.isCalibratingRange
                    ? 'bg-rose-950 text-rose-300 border-rose-600 animate-pulse'
                    : 'bg-neutral-900 text-neutral-300 border-neutral-700 hover:bg-neutral-800'
                }`}
              >
                {rightStickCalib.isCalibratingRange ? 'STOP RANGE RECORDING' : 'RECORD FULL RANGE'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Section 4: Input Telemetry & Sampling Interval Analytics */}
      <div className="border border-neutral-800 bg-neutral-900/70 p-4 rounded-lg flex flex-col gap-4">
        <div className="border-b border-neutral-800 pb-2 flex justify-between items-center">
          <div>
            <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
              4. INPUT TELEMETRY & STATE CHANGE INTERVALS
            </span>
            <p className="text-[11px] text-neutral-500 mt-0.5">
              Distinguishes browser frame ticks from actual observed input state changes to prevent misrepresenting rAF as controller USB polling rate.
            </p>
          </div>
          <button
            onClick={resetTelemetryStats}
            className="text-[11px] text-neutral-400 hover:text-white underline cursor-pointer"
          >
            Reset Metrics
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 bg-neutral-950 border border-neutral-800 rounded">
            <span className="text-neutral-500 block mb-0.5">OBSERVED INPUT CHANGES</span>
            <span className="text-white font-bold">{stateChangeIntervalStats.observedChanges} Events</span>
          </div>
          <div className="p-2.5 bg-neutral-950 border border-neutral-800 rounded">
            <span className="text-neutral-500 block mb-0.5">MEAN CHANGE INTERVAL</span>
            <span className="text-emerald-400 font-bold">
              {stateChangeIntervalStats.meanIntervalMs > 0 ? `${stateChangeIntervalStats.meanIntervalMs} ms` : 'Awaiting input'}
            </span>
          </div>
          <div className="p-2.5 bg-neutral-950 border border-neutral-800 rounded">
            <span className="text-neutral-500 block mb-0.5">INTERVAL VARIABILITY (STD DEV)</span>
            <span className="text-sky-400 font-bold">
              ±{stateChangeIntervalStats.stdDevMs} ms
            </span>
          </div>
          <div className="p-2.5 bg-neutral-950 border border-neutral-800 rounded">
            <span className="text-neutral-500 block mb-0.5">LAST OBSERVED INTERVAL</span>
            <span className="text-neutral-200 font-bold">
              {stateChangeIntervalStats.lastChangeIntervalMs} ms
            </span>
          </div>
        </div>
      </div>

      {/* Section 5: Telemetry Stream Export */}
      <div className="border border-neutral-800 bg-neutral-900/70 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider block">
            5. TELEMETRY DATA EXPORT (RAW RECORDINGS)
          </span>
          <span className="text-xs text-neutral-400">
            Recorded frames in buffer: <strong className="text-white">{recordedFrames.length}</strong> (Max 2,000 frames)
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (isRecordingTelemetry) {
                setIsRecordingTelemetry(false);
              } else {
                setRecordedFrames([]);
                telemetryFrameCountRef.current = 0;
                lastChangeSeenRef.current = performance.now();
                setIsRecordingTelemetry(true);
              }
            }}
            className={`px-3 py-2 rounded border text-xs font-bold cursor-pointer transition-colors ${
              isRecordingTelemetry
                ? 'bg-rose-950 text-rose-300 border-rose-600 animate-pulse'
                : 'bg-emerald-950 text-emerald-300 border-emerald-700 hover:bg-emerald-900'
            }`}
          >
            {isRecordingTelemetry ? 'STOP RECORDING' : 'RECORD TELEMETRY STREAM'}
          </button>

          <button
            onClick={handleExportCSV}
            disabled={recordedFrames.length === 0}
            className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 rounded text-xs font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            EXPORT CSV
          </button>

          <button
            onClick={handleExportJSON}
            disabled={recordedFrames.length === 0 && !controller}
            className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 rounded text-xs font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            EXPORT JSON
          </button>
        </div>
      </div>
        </>
      )}
    </div>
  );
};
