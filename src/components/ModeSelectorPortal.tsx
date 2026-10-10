import React from 'react';
import type { RawGamepadState } from '../types/telemetry';
import { Gamepad2, Smartphone, Zap, Activity, Compass, Target, ArrowRight, Radio, Eye, Waves } from 'lucide-react';
import { soundEngine } from '../utils/soundEngine';

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
  const handleSelect = (mode: 'controller' | 'gyro') => {
    soundEngine.coinInsert();
    onSelectMode(mode);
  };

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-8 py-6">
      {/* Arcade Marquee Header */}
      <div className="flex flex-col items-center text-center gap-3 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 font-arcade text-xs tracking-wider glow-green shadow-[0_0_15px_rgba(34,197,94,0.2)]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          [ INSERT COIN // 2-PLAYER HUMAN PERFORMANCE LAB ]
        </div>

        <h1 className="text-3xl sm:text-5xl font-arcade text-zinc-100 tracking-tight glow-green">
          MNEMA <span className="text-emerald-400 font-pixel text-xl sm:text-3xl">ARCADE</span>
        </h1>

        <p className="font-telemetry text-xs sm:text-sm text-zinc-400 max-w-xl leading-relaxed">
          High-precision psychophysics benchmark & physical computing laboratory. Calibrated for gamepad input lag, joint proprioception, and smartphone IMU sensors.
        </p>

        <div className="flex items-center gap-3 text-[11px] font-telemetry text-zinc-500 mt-1">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            DISPLAY CADENCE: <strong className="text-emerald-400">{browserRenderHz} FPS</strong>
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800">
            AUDIO: <strong className="text-amber-400">8-BIT CHIP</strong>
          </span>
        </div>
      </div>

      {/* Twin Arcade Cabinets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* CABINET 1: Gamepad Controller Lab */}
        <div
          onClick={() => handleSelect('controller')}
          className="group relative bg-[#111319] border-2 border-emerald-500/30 hover:border-emerald-400 rounded-3xl p-7 sm:p-9 transition-all duration-200 cursor-pointer flex flex-col justify-between gap-6 overflow-hidden box-glow-green hover:shadow-[0_0_35px_rgba(34,197,94,0.25)] hover:-translate-y-1"
        >
          {/* Top Marquee Bar */}
          <div className="flex justify-between items-start">
            <div className="w-14 h-14 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-black transition-all flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.2)]">
              <Gamepad2 className="w-8 h-8" />
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-950/80 border border-zinc-800 text-[11px] font-telemetry font-bold">
              <span className={`w-2 h-2 rounded-full ${controller ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className={controller ? 'text-emerald-400 glow-green' : 'text-zinc-400'}>
                {controller ? '1P GAMEPAD ONLINE' : '2.4GHz USB AWAITING'}
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-pixel text-[10px] text-emerald-400 uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/20">
                1P CABINET
              </span>
              <span className="font-telemetry text-[11px] text-zinc-500">
                W3C Gamepad API
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-arcade text-zinc-100 group-hover:text-emerald-400 transition-colors">
              Controller Lab
            </h2>

            <p className="font-telemetry text-xs text-zinc-400 mt-2 leading-relaxed">
              Sub-frame reaction time, Fitts' Law target acquisition, continuous pursuit tracking, and 2D stick drift diagnostic for the EvoFox One S gamepad.
            </p>
          </div>

          {/* Feature Badges */}
          <div className="grid grid-cols-2 gap-2.5 text-xs font-telemetry">
            <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-center gap-2.5">
              <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-zinc-300 font-semibold text-[11px]">Sub-Frame SRT Lab</span>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-center gap-2.5">
              <Target className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-zinc-300 font-semibold text-[11px]">Fitts' Law Acquisition</span>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-center gap-2.5">
              <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-zinc-300 font-semibold text-[11px]">Pursuit Rotor RMSE</span>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-center gap-2.5">
              <Compass className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-zinc-300 font-semibold text-[11px]">2D Stick Drift Polar</span>
            </div>
          </div>

          {/* Bottom Action Footer */}
          <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-between">
            <span className="font-telemetry text-[11px] text-zinc-500">
              Low-latency hardware polling
            </span>
            <div className="flex items-center gap-2 font-arcade text-xs text-emerald-400 group-hover:translate-x-1 transition-transform glow-green">
              <span>ENTER 1P CABINET</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* CABINET 2: Smartphone Sensor & Gyro Lab */}
        <div
          onClick={() => handleSelect('gyro')}
          className="group relative bg-[#131118] border-2 border-amber-500/30 hover:border-amber-400 rounded-3xl p-7 sm:p-9 transition-all duration-200 cursor-pointer flex flex-col justify-between gap-6 overflow-hidden box-glow-amber hover:shadow-[0_0_35px_rgba(245,158,11,0.25)] hover:-translate-y-1"
        >
          {/* Top Marquee Bar */}
          <div className="flex justify-between items-start">
            <div className="w-14 h-14 rounded-2xl bg-amber-950/80 border border-amber-500/40 text-amber-400 group-hover:bg-amber-500 group-hover:text-black transition-all flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              <Smartphone className="w-8 h-8" />
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-950/80 border border-zinc-800 text-[11px] font-telemetry font-bold">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-amber-400 glow-amber">32 SENSORS ONLINE</span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-pixel text-[10px] text-amber-400 uppercase tracking-widest px-2 py-0.5 rounded bg-amber-950/60 border border-amber-500/20">
                2P RIG
              </span>
              <span className="font-telemetry text-[11px] text-zinc-500">
                Gyro • Accel • Mag • Sonar • Optics
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-arcade text-zinc-100 group-hover:text-amber-400 transition-colors">
              Sensor Laboratory
            </h2>

            <p className="font-telemetry text-xs text-zinc-400 mt-2 leading-relaxed">
              32-experiment mobile physical computing suite: 30s Tremor FFT, RPM tachometer, ultrasonic sonar radar, seismocardiography, and dead reckoning.
            </p>
          </div>

          {/* Feature Badges */}
          <div className="grid grid-cols-2 gap-2.5 text-xs font-telemetry">
            <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-center gap-2.5">
              <Waves className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-zinc-300 font-semibold text-[11px]">Tremor FFT & Balance</span>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-center gap-2.5">
              <Radio className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-zinc-300 font-semibold text-[11px]">RPM Tachometer</span>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-center gap-2.5">
              <Compass className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-zinc-300 font-semibold text-[11px]">Studs & Mag Atlas</span>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-center gap-2.5">
              <Eye className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-zinc-300 font-semibold text-[11px]">Sonar & Muon Detector</span>
            </div>
          </div>

          {/* Bottom Action Footer */}
          <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-between">
            <span className="font-telemetry text-[11px] text-zinc-500">
              Desktop simulation & mobile IMU
            </span>
            <div className="flex items-center gap-2 font-arcade text-xs text-amber-400 group-hover:translate-x-1 transition-transform glow-amber">
              <span>ENTER SENSOR RIG</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Disclaimer & Retro Footer Bar */}
      <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-telemetry text-zinc-500">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>RECREATIONAL & EDUCATIONAL PHYSICAL COMPUTING EXPERIMENT SUITE</span>
        </div>
        <div className="flex items-center gap-4">
          <span>ZERO BACKEND</span>
          <span>•</span>
          <span>W3C GAMEPAD API</span>
          <span>•</span>
          <span>DEVICE SENSORS</span>
        </div>
      </div>
    </div>
  );
};
