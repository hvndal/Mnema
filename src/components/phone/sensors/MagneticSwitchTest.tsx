import React, { useState, useEffect, useRef } from 'react';
import type { OrientationSample } from '../../../types/phoneSensors';
import { ToggleLeft, MousePointerClick, RotateCcw, Sparkles } from 'lucide-react';
import { soundEngine } from '../../../utils/soundEngine';

interface MagneticSwitchTestProps {
  latestOrientation: OrientationSample | null;
  sensorHz?: number;
  isSimulated?: boolean;
}

export const MagneticSwitchTest: React.FC<MagneticSwitchTestProps> = ({
  latestOrientation,
}) => {
  const [clickCount, setClickCount] = useState<number>(0);
  const [lastClickTime, setLastClickTime] = useState<string>('None');
  const [isTriggered, setIsTriggered] = useState<boolean>(false);

  const prevAlphaRef = useRef<number>(0);
  const debounceRef = useRef<number>(0);

  // Detect magnetic pulse from orientation or manual trigger
  useEffect(() => {
    if (!latestOrientation) return;

    const alpha = latestOrientation.alpha || 0;
    const delta = Math.abs(alpha - prevAlphaRef.current);
    prevAlphaRef.current = alpha;

    const now = performance.now();
    // Rapid angular pulse > 15 deg in 1 frame mimics magnetic sliding disturbance
    if (delta > 18 && now - debounceRef.current > 400) {
      debounceRef.current = now;
      fireMagneticClick();
    }
  }, [latestOrientation]);

  const fireMagneticClick = () => {
    soundEngine.completeFanfare();
    setIsTriggered(true);
    setClickCount((c) => c + 1);
    setLastClickTime(new Date().toLocaleTimeString());

    setTimeout(() => {
      setIsTriggered(false);
    }, 250);
  };

  const handleReset = () => {
    setClickCount(0);
    setLastClickTime('None');
    soundEngine.tick();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Intro Header */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-800 text-[11px] font-bold mb-2">
            <ToggleLeft className="w-3.5 h-3.5" />
            Contactless Hall-Effect Switch
          </div>
          <h3 className="text-xl font-black text-zinc-900">Contactless Magnetic Button (Google Cardboard)</h3>
          <p className="text-xs text-zinc-500 max-w-xl mt-1 leading-relaxed">
            Google Cardboard's iconic VR input had zero wires or touch connections: it was simply a sliding neodymium ring magnet held by a rubber band on the headset's cardboard chassis. When pulled, the compass magnetometer registers a sudden spike and fires a click event!
          </p>
        </div>

        <button
          onClick={handleReset}
          className="px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer self-start"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset Counter
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Interactive Virtual Magnet Trigger */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-xs">
          <div
            className={`w-28 h-28 rounded-3xl flex items-center justify-center transition-all duration-150 shadow-md ${
              isTriggered
                ? 'bg-violet-600 text-white scale-110 shadow-violet-200'
                : 'bg-zinc-100 text-zinc-600 hover:bg-violet-50 hover:text-violet-700'
            }`}
          >
            <MousePointerClick className="w-12 h-12" />
          </div>

          <h4 className="text-lg font-black text-zinc-900 mt-4">
            {isTriggered ? '⚡ MAGNETIC PULSE TRIGGERED!' : 'Awaiting Sliding Magnet'}
          </h4>
          <p className="text-xs text-zinc-400 max-w-xs mt-1">
            Slide any small magnet past the top corner of your phone, or click below to simulate the sliding ring.
          </p>

          <button
            onClick={fireMagneticClick}
            className="mt-6 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer active:scale-95"
          >
            Slide Virtual Magnet Ring (Simulate Click)
          </button>
        </div>

        {/* Counter and Telemetry */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              CONTACTLESS CLICKS REGISTERED
            </span>

            <div className="flex items-baseline gap-2 my-2">
              <span className="text-6xl font-black font-mono text-zinc-900 tracking-tight">
                {clickCount}
              </span>
              <span className="text-xl font-bold text-violet-600">Clicks</span>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                <span className="text-zinc-500 block text-[11px]">Last Click Time</span>
                <span className="font-mono font-bold text-zinc-800">{lastClickTime}</span>
              </div>
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                <span className="text-zinc-500 block text-[11px]">Debounce Guard</span>
                <span className="font-mono font-bold text-emerald-600">400 ms Active</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-100 text-[11px] text-zinc-500 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-600 shrink-0" />
            <span>Zero wear-and-tear mechanical buttons using pure ambient magnetic induction.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
