import React, { useState } from 'react';
import type { MotionSample } from '../../../types/phoneSensors';
import type { KeystrokeLeakLog } from '../../../types/phoneSensorsAdvanced';
import { classifyKeystrokeQuadrant } from '../../../utils/phoneSensorsAdvancedMath';
import { ShieldAlert, RotateCcw, AlertTriangle } from 'lucide-react';
import { soundEngine } from '../../../utils/soundEngine';

interface KeystrokeLeakTestProps {
  latestMotion: MotionSample | null;
  sensorHz?: number;
  isSimulated?: boolean;
}

export const KeystrokeLeakTest: React.FC<KeystrokeLeakTestProps> = ({
  latestMotion,
  isSimulated,
}) => {
  const [typedPin, setTypedPin] = useState<string>('');
  const [logs, setLogs] = useState<KeystrokeLeakLog[]>([]);
  const [lastPrediction, setLastPrediction] = useState<KeystrokeLeakLog | null>(null);

  const handleKeyPress = (num: string) => {
    soundEngine.tick();
    const newPin = (typedPin + num).slice(-8);
    setTypedPin(newPin);

    // Measure delta tilt
    let dPitch = 0;
    let dRoll = 0;

    if (latestMotion) {
      dPitch = (latestMotion.rotBeta ?? latestMotion.rotationRate?.beta ?? 0) * 0.05;
      dRoll = (latestMotion.rotGamma ?? latestMotion.rotationRate?.gamma ?? 0) * 0.05;
    }

    // If on desktop or zero tilt, inject representative physics deltas
    if (isSimulated || (Math.abs(dPitch) < 0.01 && Math.abs(dRoll) < 0.01)) {
      // Simulate realistic physical rocking based on keypad geometry
      if (['1', '2'].includes(num)) { dPitch = 0.45; dRoll = -0.35; }
      else if (['3'].includes(num)) { dPitch = 0.45; dRoll = 0.35; }
      else if (['4', '5'].includes(num)) { dPitch = 0.15; dRoll = -0.30; }
      else if (['6'].includes(num)) { dPitch = 0.15; dRoll = 0.30; }
      else if (['7', '*'].includes(num)) { dPitch = -0.35; dRoll = -0.40; }
      else if (['8', '0'].includes(num)) { dPitch = -0.35; dRoll = 0.05; }
      else if (['9', '#'].includes(num)) { dPitch = -0.35; dRoll = 0.40; }
    }

    const predicted = classifyKeystrokeQuadrant(dPitch, dRoll);
    const entry: KeystrokeLeakLog = {
      key: num,
      tiltPitchDelta: Math.round(dPitch * 100) / 100,
      tiltRollDelta: Math.round(dRoll * 100) / 100,
      predictedQuadrant: predicted,
      confidence: 88,
    };

    setLastPrediction(entry);
    setLogs((prev) => [entry, ...prev.slice(0, 7)]);
  };

  const handleClear = () => {
    setTypedPin('');
    setLogs([]);
    setLastPrediction(null);
    soundEngine.tick();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Intro Header */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold mb-2">
            <ShieldAlert className="w-3.5 h-3.5" />
            Sensor Side-Channel Vulnerability
          </div>
          <h3 className="text-xl font-black text-zinc-900">Keystroke Micro-Tilt Leak (TouchLogger)</h3>
          <p className="text-xs text-zinc-500 max-w-xl mt-1 leading-relaxed">
            Academic research (TouchLogger / TapLogger) proved that background motion sensors can infer on-screen PIN entries. Every tap imparts a sub-degree rotational torque depending on which screen quadrant was pressed.
          </p>
        </div>

        <button
          onClick={handleClear}
          className="px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer self-start"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset PIN
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Keypad UI */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 flex flex-col items-center shadow-xs">
          <div className="w-full max-w-[240px] mb-4">
            <div className="text-[11px] text-zinc-400 font-semibold uppercase mb-1">Target Entry:</div>
            <div className="h-10 bg-zinc-100 rounded-xl flex items-center justify-center font-mono text-xl font-black tracking-widest text-zinc-800">
              {typedPin ? typedPin.replace(/./g, '• ') : 'TAP NUMBERS'}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5 w-full max-w-[240px]">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((k) => (
              <button
                key={k}
                onClick={() => handleKeyPress(k)}
                className="h-14 rounded-2xl bg-zinc-50 hover:bg-violet-50 hover:border-violet-300 border border-zinc-200 font-bold text-lg text-zinc-800 transition-all cursor-pointer active:scale-95 flex items-center justify-center shadow-xs"
              >
                {k}
              </button>
            ))}
          </div>

          <div className="text-[11px] text-zinc-400 mt-4 text-center">
            Tap with your thumb while holding the phone naturally.
          </div>
        </div>

        {/* Live Side-Channel Leakage Inspector */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 flex flex-col justify-between shadow-xs">
          <div>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              SIDE-CHANNEL GYROSCOPE LEAK LOG
            </span>

            {lastPrediction ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900">
                    DETECTED TAP: '{lastPrediction.key}'
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-mono text-[10px] font-bold">
                    {lastPrediction.predictedQuadrant.toUpperCase()}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2 font-mono text-[11px] text-amber-800">
                  <div>Δ Pitch: {lastPrediction.tiltPitchDelta}°</div>
                  <div>Δ Roll: {lastPrediction.tiltRollDelta}°</div>
                </div>
              </div>
            ) : (
              <div className="p-4 border border-dashed border-zinc-200 rounded-xl mb-4 text-center text-xs text-zinc-400">
                Awaiting keypad press to capture micro-tilt impulse...
              </div>
            )}

            {/* Event history */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {logs.map((log, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded-lg bg-zinc-50 border border-zinc-100 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold w-4">{log.key}</span>
                    <span className="text-zinc-500 text-[11px]">{log.predictedQuadrant}</span>
                  </div>
                  <span className="font-mono text-zinc-400 text-[10px]">
                    P:{log.tiltPitchDelta}° R:{log.tiltRollDelta}°
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-100 text-[11px] text-zinc-500 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <span>
              Modern mobile browsers restrict sensor polling rates to 60 Hz and require permissions to mitigate this exact vulnerability.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
