import React from 'react';
import type { RawGamepadState } from '../types/telemetry';
import { Gamepad2, Smartphone, Zap, Activity, Compass, Target, ArrowRight, ShieldCheck, Sparkles, Brain } from 'lucide-react';

interface ModeSelectorPortalProps {
  controller: RawGamepadState | null;
  browserRenderHz: number;
  onSelectMode: (mode: 'controller' | 'gyro') => void;
}

export const ModeSelectorPortal: React.FC<ModeSelectorPortalProps> = ({
  controller,
  browserRenderHz,
  onSelectMode,
}) => {
  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-8 py-4">
      {/* Hero Welcome Header */}
      <div className="flex flex-col items-center text-center gap-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-100 text-violet-800 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          Two-Sided Human Performance Laboratory
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 tracking-tight">
          Select Your Sensory Testing Mode
        </h1>
        <p className="text-sm text-zinc-500 leading-relaxed">
          Benchmark human motor reaction, joint position sense, tremor frequency, and neuromotor control. Choose your hardware interface below.
        </p>
      </div>

      {/* Two-Sided Portal Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SIDE 1: Gamepad Controller Lab */}
        <div
          onClick={() => onSelectMode('controller')}
          className="group relative bg-white border border-zinc-200 hover:border-violet-400 rounded-3xl p-8 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-6 overflow-hidden"
        >
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div className="w-14 h-14 rounded-2xl bg-zinc-100 group-hover:bg-violet-600 text-zinc-800 group-hover:text-white transition-colors flex items-center justify-center">
                <Gamepad2 className="w-7 h-7" />
              </div>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-xs font-semibold">
                <span className={`w-2 h-2 rounded-full ${controller ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
                <span className="text-zinc-700 font-mono text-[11px]">
                  {controller ? 'Gamepad Connected' : 'USB / 2.4GHz Gamepad'}
                </span>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-bold text-violet-600 uppercase tracking-wider block mb-1">
                Hardware Edition
              </span>
              <h2 className="text-2xl font-bold text-zinc-900 group-hover:text-violet-600 transition-colors">
                Controller Performance Lab
              </h2>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                Ground-up psychophysics testing designed for the EvoFox One S and standard gamepads via the browser Gamepad API.
              </p>
            </div>

            {/* Feature list pills */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-2">
              <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center gap-2">
                <Zap className="w-4 h-4 text-violet-600 shrink-0" />
                <span className="font-semibold text-zinc-700">Sub-Frame Reaction Lab</span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold text-zinc-700">Fitts' Law Acquisition</span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center gap-2">
                <Activity className="w-4 h-4 text-sky-600 shrink-0" />
                <span className="font-semibold text-zinc-700">Continuous Pursuit Rotor</span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center gap-2">
                <Compass className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="font-semibold text-zinc-700">2D Stick Drift Calibration</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
            <span className="text-xs font-semibold text-zinc-400 font-mono">
              Display Cadence: {browserRenderHz} FPS
            </span>
            <div className="inline-flex items-center gap-2 text-sm font-bold text-violet-600 group-hover:translate-x-1 transition-transform">
              Enter Controller Lab <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* SIDE 2: Smartphone Gyroscope Lab */}
        <div
          onClick={() => onSelectMode('gyro')}
          className="group relative bg-white border border-zinc-200 hover:border-violet-400 rounded-3xl p-8 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-6 overflow-hidden"
        >
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div className="w-14 h-14 rounded-2xl bg-violet-50 group-hover:bg-violet-600 text-violet-600 group-hover:text-white transition-colors flex items-center justify-center">
                <Smartphone className="w-7 h-7" />
              </div>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-violet-50 border border-violet-200 text-xs font-semibold text-violet-700">
                <span className="w-2 h-2 rounded-full bg-violet-600 animate-pulse" />
                <span className="font-mono text-[11px]">Mobile IMU &amp; Gyroscope</span>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-bold text-violet-600 uppercase tracking-wider block mb-1">
                Smartphone Sensor & Psychophysics Edition
              </span>
              <h2 className="text-2xl font-bold text-zinc-900 group-hover:text-violet-600 transition-colors">
                Phone Gyroscope & Physical Sensor Lab
              </h2>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                Zero installation. Turn your smartphone into a physical computing lab: Gyroscope, Accelerometer, Magnetometer, Barometer, Ultrasound Sonar, Camera PPG, and Sensor Fusion.
              </p>
            </div>

            {/* Feature list pills */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-2">
              <div className="p-2.5 rounded-xl bg-violet-50/50 border border-violet-100 flex items-center gap-2">
                <Activity className="w-4 h-4 text-violet-600 shrink-0" />
                <span className="font-semibold text-zinc-700">14 Neuromotor Psychophysics Tests</span>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100 flex items-center gap-2">
                <Compass className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold text-zinc-700">RPM Tachometer & Swing Analyser</span>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50/50 border border-amber-100 flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="font-semibold text-zinc-700">Metal Detector & Barometer Floors</span>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-50/50 border border-purple-100 flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-600 shrink-0" />
                <span className="font-semibold text-zinc-700">Ultrasound Sonar & Doppler Radar</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
            <span className="text-xs font-semibold text-zinc-400">
              31 Laboratory Experiments Included
            </span>
            <div className="inline-flex items-center gap-2 text-sm font-bold text-violet-600 group-hover:translate-x-1 transition-transform">
              Enter Sensor & Gyro Lab <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Grounded Disclaimer Banner */}
      <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5 flex items-start gap-3.5 text-xs text-zinc-600 leading-relaxed max-w-3xl mx-auto w-full">
        <ShieldCheck className="w-5 h-5 text-violet-600 shrink-0 mt-0.5" />
        <div>
          <strong className="text-zinc-800">Recreational Benchmark, Not a Medical Diagnostic:</strong> Phone sensor hardware varies significantly across models and brands. Metrics are designed for personal curiosity and comparison on the same physical device.
        </div>
      </div>
    </div>
  );
};
