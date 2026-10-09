import React, { useState } from 'react';
import type { GamepadSnapshot } from '../types';
import { STANDARD_BUTTON_NAMES, triggerRumble } from '../utils/gamepadConstants';
import { Gamepad2, Activity, Vibrate, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

interface ControllerDebuggerProps {
  snapshot: GamepadSnapshot | null;
  isConnected: boolean;
  pollingRateHz: number;
}

export const ControllerDebugger: React.FC<ControllerDebuggerProps> = ({
  snapshot,
  isConnected,
  pollingRateHz,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleTestRumble = () => {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = gamepads.find(gp => gp !== null) ?? null;
    triggerRumble(pad, 150, 0.8, 0.8);
  };

  return (
    <div className="w-full bg-neutral-900/80 border border-neutral-800 rounded-xl overflow-hidden backdrop-blur-md">
      {/* Header bar */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-neutral-800/50 transition-colors select-none"
      >
        <div className="flex items-center gap-3">
          <Gamepad2 className={`w-5 h-5 ${isConnected ? 'text-emerald-400' : 'text-neutral-500'}`} />
          <div className="flex flex-col text-left">
            <span className="text-xs font-semibold tracking-wider text-neutral-400 uppercase">
              Hardware Status
            </span>
            <span className="text-sm font-mono text-neutral-200">
              {isConnected 
                ? (snapshot?.id.length && snapshot.id.length > 36 ? `${snapshot.id.slice(0, 36)}...` : snapshot?.id || 'Connected Gamepad')
                : 'No Gamepad Detected (Connect EvoFox or Press Any Button)'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-neutral-950 border border-neutral-800 font-mono text-xs text-neutral-400">
            <Activity className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
            <span>{pollingRateHz} Hz</span>
          </div>

          <div className={`px-2 py-0.5 rounded text-xs font-mono font-medium ${
            isConnected ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
          }`}>
            {isConnected ? 'LIVE' : 'WAITING'}
          </div>

          {isOpen ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
        </div>
      </div>

      {/* Expanded diagnostic inspector */}
      {isOpen && (
        <div className="p-4 border-t border-neutral-800 bg-neutral-950/60 flex flex-col gap-4 text-xs font-mono">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded bg-neutral-900 border border-neutral-800 flex flex-col gap-1">
              <span className="text-neutral-500">MAPPING</span>
              <span className="text-neutral-200 font-semibold">{snapshot?.mapping || 'standard'}</span>
            </div>
            <div className="p-3 rounded bg-neutral-900 border border-neutral-800 flex flex-col gap-1">
              <span className="text-neutral-500">TIMESTAMP DELTA</span>
              <span className="text-neutral-200 font-semibold">{snapshot ? `${Math.round(snapshot.timestamp)} ms` : 'N/A'}</span>
            </div>
            <div className="p-3 rounded bg-neutral-900 border border-neutral-800 flex items-center justify-between">
              <div>
                <span className="text-neutral-500 block">HAPTICS / RUMBLE</span>
                <span className={snapshot?.vibrationSupported ? 'text-emerald-400 font-semibold' : 'text-neutral-400'}>
                  {snapshot?.vibrationSupported ? 'Supported' : 'Standard Web HID'}
                </span>
              </div>
              <button 
                onClick={handleTestRumble}
                className="px-2.5 py-1.5 rounded bg-rose-600/20 text-rose-400 border border-rose-500/40 hover:bg-rose-600/30 transition-colors flex items-center gap-1.5 active:scale-95"
              >
                <Vibrate className="w-3.5 h-3.5" />
                Pulse
              </button>
            </div>
          </div>

          {/* Buttons Live Matrix */}
          <div>
            <span className="text-neutral-400 block mb-2 font-semibold">BUTTON MATRIX ({snapshot?.buttons.length || 0} CHANNELS):</span>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {snapshot?.buttons.map((b, idx) => {
                const isPressed = b.pressed || b.value > 0.45;
                const label = STANDARD_BUTTON_NAMES[idx] || `B${idx}`;
                return (
                  <div
                    key={idx}
                    className={`p-2 rounded border flex flex-col items-center justify-center transition-all ${
                      isPressed
                        ? 'bg-rose-500 text-white border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.6)] scale-105'
                        : 'bg-neutral-900/60 text-neutral-400 border-neutral-800'
                    }`}
                  >
                    <span className="font-bold text-[11px] truncate">{label}</span>
                    <span className="text-[10px] opacity-70">
                      {idx === 6 || idx === 7 ? b.value.toFixed(2) : (b.pressed ? '1' : '0')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Axes live view */}
          {snapshot && snapshot.axes.length > 0 && (
            <div>
              <span className="text-neutral-400 block mb-2 font-semibold">ANALOG AXES:</span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {snapshot.axes.map((axis, idx) => (
                  <div key={idx} className="p-2 rounded bg-neutral-900 border border-neutral-800 flex items-center justify-between">
                    <span className="text-neutral-500">{idx === 0 ? 'LX' : idx === 1 ? 'LY' : idx === 2 ? 'RX' : 'RY'}</span>
                    <span className={`font-mono font-bold ${Math.abs(axis) > 0.1 ? 'text-amber-400' : 'text-neutral-300'}`}>
                      {axis.toFixed(3)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isConnected && (
            <div className="p-3 rounded bg-amber-950/40 border border-amber-800/60 text-amber-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                Browser security requires pressing any button on the EvoFox controller once so Chrome/Edge can activate the input connection.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
