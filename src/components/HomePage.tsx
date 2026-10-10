import React from 'react';
import type { RawGamepadState } from '../types/telemetry';
import { ControllerSchematic } from './ControllerSchematic';
import { Play, Activity, ShieldCheck, Zap, Crosshair, ArrowRight, Smartphone, Compass, Target } from 'lucide-react';
import { soundEngine } from '../utils/soundEngine';

interface HomePageProps {
  controller: RawGamepadState | null;
  browserRenderHz: number;
  onNavigateTab: (tab: 'experiments' | 'phone_gyro' | 'controller_lab' | 'integrations' | 'history') => void;
  onSelectExperiment: (expId: 'reaction' | 'target_acquisition' | 'continuous_tracking') => void;
  onSelectPhoneTest?: (test: 'steadiness' | 'balance' | 'proprioception') => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  controller,
  browserRenderHz,
  onNavigateTab,
  onSelectExperiment,
  onSelectPhoneTest,
}) => {
  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-10 py-2">
      {/* Arcade Hero Section */}
      <section className="flex flex-col lg:flex-row items-center justify-between gap-8 bg-[#111319] border border-emerald-500/30 rounded-3xl p-8 lg:p-10 shadow-sm relative overflow-hidden box-glow-green">
        <div className="flex flex-col items-start gap-4 max-w-xl z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 font-telemetry text-xs font-semibold glow-green">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            [ 1P COIN-OP PSYCHOPHYSICS SUITE ]
          </div>

          <h1 className="text-3xl lg:text-4xl font-arcade text-zinc-100 tracking-tight leading-tight glow-green">
            EXPLORE TRUE MOTOR REACTION & CONTROLLER PRECISION
          </h1>

          <p className="font-telemetry text-xs sm:text-sm text-zinc-400 leading-relaxed">
            Zero marketing fluff. Benchmark millisecond input lag, Fitts' law target acquisition, and continuous pursuit tracking with native 2.4 GHz EvoFox gamepad polling.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => {
                soundEngine.coinInsert();
                onSelectExperiment('reaction');
                onNavigateTab('experiments');
              }}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-arcade font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(34,197,94,0.4)] transition-all cursor-pointer active:scale-95"
            >
              <Play className="w-4 h-4 fill-black" />
              START REACTION TEST
            </button>

            <button
              onClick={() => {
                soundEngine.tick();
                onNavigateTab('controller_lab');
              }}
              className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-telemetry font-bold flex items-center gap-2 transition-all cursor-pointer"
            >
              INSPECT & CALIBRATE STICK
            </button>
          </div>
        </div>

        {/* Live Controller Card */}
        <div className="w-full max-w-md flex flex-col items-center gap-3 z-10 bg-zinc-950/80 p-5 rounded-2xl border border-zinc-800">
          <div className="w-full flex items-center justify-between px-2 text-xs font-telemetry text-zinc-400">
            <span className="flex items-center gap-1.5 font-bold">
              <span className={`w-2 h-2 rounded-full ${controller ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              {controller ? (controller.id.includes('EvoFox') ? 'EvoFox One S' : 'GAMEPAD CONNECTED') : 'AWAITING PRESS'}
            </span>
            <span className="font-mono text-emerald-400 flex items-center gap-1">
              <Activity className="w-3 h-3 text-emerald-400" />
              {browserRenderHz} FPS
            </span>
          </div>

          <ControllerSchematic controller={controller} />
          
          <span className="text-[11px] font-telemetry text-zinc-500 text-center">
            {controller 
              ? 'Inputs highlight dynamically in real time'
              : 'Press any button on your EvoFox gamepad to wake browser Gamepad access'}
          </span>
        </div>
      </section>

      {/* Featured Controller Experiments */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-arcade text-zinc-100 tracking-tight glow-green">FEATURED CONTROLLER BENCHMARKS</h2>
            <p className="font-telemetry text-xs text-zinc-400">Choose a psychophysics benchmark to measure your physical motor performance.</p>
          </div>
          <button
            onClick={() => {
              soundEngine.tick();
              onNavigateTab('experiments');
            }}
            className="text-xs font-arcade text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer glow-green"
          >
            VIEW ALL TESTS <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Reaction Time Card */}
          <div
            onClick={() => {
              soundEngine.coinInsert();
              onSelectExperiment('reaction');
              onNavigateTab('experiments');
            }}
            className="p-6 rounded-2xl bg-[#12141a] border border-zinc-800 hover:border-emerald-500/40 hover:shadow-[0_0_20px_rgba(34,197,94,0.15)] transition-all cursor-pointer flex flex-col justify-between gap-5 group"
          >
            <div className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-base font-arcade text-zinc-100 group-hover:text-emerald-400 transition-colors">
                Reaction-Time Lab
              </h3>
              <p className="text-xs font-telemetry text-zinc-400 leading-relaxed">
                Simple reaction time, 2-choice color/spatial variants, and Go/No-Go motor inhibition with anti-anticipation jitter.
              </p>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80 text-xs font-telemetry text-emerald-400">
              <span>20 Trials • ~2 mins</span>
              <span className="group-hover:translate-x-1 transition-transform">Launch →</span>
            </div>
          </div>

          {/* Target Acquisition Card */}
          <div
            onClick={() => {
              soundEngine.coinInsert();
              onSelectExperiment('target_acquisition');
              onNavigateTab('experiments');
            }}
            className="p-6 rounded-2xl bg-[#12141a] border border-zinc-800 hover:border-emerald-500/40 hover:shadow-[0_0_20px_rgba(34,197,94,0.15)] transition-all cursor-pointer flex flex-col justify-between gap-5 group"
          >
            <div className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold">
                <Crosshair className="w-5 h-5" />
              </div>
              <h3 className="text-base font-arcade text-zinc-100 group-hover:text-emerald-400 transition-colors">
                Target Acquisition
              </h3>
              <p className="text-xs font-telemetry text-zinc-400 leading-relaxed">
                Fitts' Law cursor speed, path efficiency, endpoint accuracy, and overshoot counts across small to large radii.
              </p>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80 text-xs font-telemetry text-emerald-400">
              <span>20 Targets • ~2.5 mins</span>
              <span className="group-hover:translate-x-1 transition-transform">Launch →</span>
            </div>
          </div>

          {/* Continuous Tracking Card */}
          <div
            onClick={() => {
              soundEngine.coinInsert();
              onSelectExperiment('continuous_tracking');
              onNavigateTab('experiments');
            }}
            className="p-6 rounded-2xl bg-[#12141a] border border-zinc-800 hover:border-emerald-500/40 hover:shadow-[0_0_20px_rgba(34,197,94,0.15)] transition-all cursor-pointer flex flex-col justify-between gap-5 group"
          >
            <div className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="text-base font-arcade text-zinc-100 group-hover:text-emerald-400 transition-colors">
                Continuous Tracking
              </h3>
              <p className="text-xs font-telemetry text-zinc-400 leading-relaxed">
                Pursuit rotor analog stick steering following deterministic sinusoidal, waypoint, and lissajous trajectories.
              </p>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80 text-xs font-telemetry text-emerald-400">
              <span>25s Run • RMSE Metrics</span>
              <span className="group-hover:translate-x-1 transition-transform">Launch →</span>
            </div>
          </div>
        </div>
      </section>

      {/* Phone Sensor & Gyroscope Section */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/30 text-amber-400 font-telemetry text-[11px] font-bold mb-1 glow-amber">
              <Smartphone className="w-3 h-3" /> 2P RIG // 32 SENSOR MODALITIES
            </div>
            <h2 className="text-xl font-arcade text-zinc-100 tracking-tight glow-amber">SMARTPHONE SENSOR LABORATORY</h2>
            <p className="font-telemetry text-xs text-zinc-400">Measure natural physiological tremor, Romberg balance ratio, and blind joint proprioception.</p>
          </div>
          <button
            onClick={() => {
              soundEngine.tick();
              onNavigateTab('phone_gyro');
            }}
            className="text-xs font-arcade text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer glow-amber"
          >
            OPEN SENSOR RIG <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Steadiness Test */}
          <div
            onClick={() => {
              soundEngine.tick();
              onSelectPhoneTest?.('steadiness');
              onNavigateTab('phone_gyro');
            }}
            className="p-6 rounded-2xl bg-[#12141a] border border-zinc-800 hover:border-amber-500/40 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)] transition-all cursor-pointer flex flex-col justify-between gap-5 group"
          >
            <div className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="text-base font-arcade text-zinc-100 group-hover:text-amber-400 transition-colors">
                Arm-Length Steadiness
              </h3>
              <p className="text-xs font-telemetry text-zinc-400 leading-relaxed">
                Hold phone at arm’s length for 30s. Measures micro-shake and runs an FFT to extract your natural 8–12 Hz physiological tremor frequency.
              </p>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80 text-xs font-telemetry text-amber-400">
              <span>30s Test • FFT Spectrum</span>
              <span className="group-hover:translate-x-1 transition-transform">Launch →</span>
            </div>
          </div>

          {/* Romberg Balance Test */}
          <div
            onClick={() => {
              soundEngine.tick();
              onSelectPhoneTest?.('balance');
              onNavigateTab('phone_gyro');
            }}
            className="p-6 rounded-2xl bg-[#12141a] border border-zinc-800 hover:border-amber-500/40 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)] transition-all cursor-pointer flex flex-col justify-between gap-5 group"
          >
            <div className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold">
                <Compass className="w-5 h-5" />
              </div>
              <h3 className="text-base font-arcade text-zinc-100 group-hover:text-amber-400 transition-colors">
                Vestibular Balance (Romberg)
              </h3>
              <p className="text-xs font-telemetry text-zinc-400 leading-relaxed">
                Phone against chest, single-leg stance: 15s eyes open vs 15s eyes closed. Calculates the Romberg Sway Quotient to quantify visual reliance.
              </p>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80 text-xs font-telemetry text-amber-400">
              <span>Two-Phase • Sway Ratio</span>
              <span className="group-hover:translate-x-1 transition-transform">Launch →</span>
            </div>
          </div>

          {/* Blind Proprioception Test */}
          <div
            onClick={() => {
              soundEngine.tick();
              onSelectPhoneTest?.('proprioception');
              onNavigateTab('phone_gyro');
            }}
            className="p-6 rounded-2xl bg-[#12141a] border border-zinc-800 hover:border-amber-500/40 hover:shadow-[0_0_20px_rgba(245,158,11,0.15)] transition-all cursor-pointer flex flex-col justify-between gap-5 group"
          >
            <div className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold">
                <Target className="w-5 h-5" />
              </div>
              <h3 className="text-base font-arcade text-zinc-100 group-hover:text-amber-400 transition-colors">
                Blind Tilt Proprioception
              </h3>
              <p className="text-xs font-telemetry text-zinc-400 leading-relaxed">
                Tilt phone to assigned degree (e.g. 30°) with eyes closed/shielded. Measures joint position sense, signed overshoot, and kinesthetic calibration.
              </p>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80 text-xs font-telemetry text-amber-400">
              <span>3 Trials • Angular Error</span>
              <span className="group-hover:translate-x-1 transition-transform">Launch →</span>
            </div>
          </div>
        </div>
      </section>

      {/* Methodology Banner */}
      <section className="bg-[#12141a] border border-zinc-800 rounded-2xl p-5 flex items-start gap-3.5 text-xs font-telemetry text-zinc-400 leading-relaxed">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-zinc-200">Honest Experimental Methodology:</strong> All scores reflect physical actuation latency, rendered cursor coordinate errors, and controller polling rates. Mnema never claims to assess medical diagnostics, ADHD, or cognitive IQ.
        </div>
      </section>
    </div>
  );
};
