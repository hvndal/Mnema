import React from 'react';
import type { RawGamepadState } from '../types/telemetry';
import { ControllerSchematic } from './ControllerSchematic';
import { Play, Sparkles, Activity, ShieldCheck, Zap, Crosshair, ArrowRight, Smartphone, Compass, Target } from 'lucide-react';

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
      {/* Hero Section */}
      <section className="flex flex-col lg:flex-row items-center justify-between gap-8 bg-gradient-to-br from-white via-violet-50/30 to-white border border-zinc-200/80 rounded-3xl p-8 lg:p-10 shadow-sm relative overflow-hidden">
        <div className="flex flex-col items-start gap-4 max-w-xl z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-100 text-violet-800 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            Controller Psychophysics & Precision
          </div>

          <h1 className="text-3xl lg:text-4xl font-extrabold text-zinc-900 tracking-tight leading-tight">
            Explore your controller's true reaction and precision.
          </h1>

          <p className="text-sm text-zinc-600 leading-relaxed">
            Zero marketing fluff or pseudo-science. Benchmark high-speed reaction time, Fitts' law target acquisition, and continuous pursuit tracking with native EvoFox gamepad polling.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => {
                onSelectExperiment('reaction');
                onNavigateTab('experiments');
              }}
              className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <Play className="w-4 h-4 fill-white" />
              Start Reaction Test
            </button>

            <button
              onClick={() => onNavigateTab('controller_lab')}
              className="px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-800 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
            >
              Inspect & Calibrate Stick
            </button>
          </div>
        </div>

        {/* Live Controller Card */}
        <div className="w-full max-w-md flex flex-col items-center gap-3 z-10">
          <div className="w-full flex items-center justify-between px-2 text-xs font-medium text-zinc-500">
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${controller ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
              {controller ? (controller.id.includes('EvoFox') ? 'EvoFox One S' : 'Gamepad Connected') : 'Awaiting Controller Press'}
            </span>
            <span className="font-mono text-zinc-400 flex items-center gap-1">
              <Activity className="w-3 h-3 text-violet-600" />
              {browserRenderHz} FPS
            </span>
          </div>

          <ControllerSchematic controller={controller} />
          
          <span className="text-[11px] text-zinc-400 text-center">
            {controller 
              ? 'Inputs highlight dynamically in real time'
              : 'Press any button on your EvoFox controller to wake browser Gamepad access'}
          </span>
        </div>
      </section>

      {/* Quick Access Experiment Cards */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Featured Experiments</h2>
            <p className="text-xs text-zinc-500">Choose a psychophysics benchmark to measure your physical motor performance.</p>
          </div>
          <button
            onClick={() => onNavigateTab('experiments')}
            className="text-xs font-semibold text-violet-600 hover:text-violet-700 flex items-center gap-1 cursor-pointer"
          >
            View all tests <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Reaction Time Card */}
          <div
            onClick={() => {
              onSelectExperiment('reaction');
              onNavigateTab('experiments');
            }}
            className="p-6 rounded-2xl bg-white border border-zinc-200 hover:border-violet-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-5 group"
          >
            <div className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 group-hover:text-violet-600 transition-colors">
                Reaction-Time Lab
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Simple reaction time, 2-choice color/spatial variants, and Go/No-Go motor inhibition with anti-anticipation jitter.
              </p>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-zinc-100 text-xs font-semibold text-violet-600">
              <span>20 Trials • ~2 mins</span>
              <span className="group-hover:translate-x-1 transition-transform">Launch →</span>
            </div>
          </div>

          {/* Target Acquisition Card */}
          <div
            onClick={() => {
              onSelectExperiment('target_acquisition');
              onNavigateTab('experiments');
            }}
            className="p-6 rounded-2xl bg-white border border-zinc-200 hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-5 group"
          >
            <div className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Crosshair className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 group-hover:text-emerald-600 transition-colors">
                Target Acquisition
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Fitts' Law cursor speed, path efficiency, endpoint accuracy, and overshoot counts across small to large radii.
              </p>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-zinc-100 text-xs font-semibold text-emerald-600">
              <span>20 Targets • ~2.5 mins</span>
              <span className="group-hover:translate-x-1 transition-transform">Launch →</span>
            </div>
          </div>

          {/* Continuous Tracking Card */}
          <div
            onClick={() => {
              onSelectExperiment('continuous_tracking');
              onNavigateTab('experiments');
            }}
            className="p-6 rounded-2xl bg-white border border-zinc-200 hover:border-sky-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-5 group"
          >
            <div className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 group-hover:text-sky-600 transition-colors">
                Continuous Tracking
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Pursuit rotor analog stick steering following deterministic sinusoidal, waypoint, and lissajous trajectories.
              </p>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-zinc-100 text-xs font-semibold text-sky-600">
              <span>25s Run • RMSE Metrics</span>
              <span className="group-hover:translate-x-1 transition-transform">Launch →</span>
            </div>
          </div>
        </div>
      </section>

      {/* Phone Gyroscope & Sensor Psychophysics Section */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-800 text-[11px] font-bold mb-1">
              <Smartphone className="w-3 h-3" /> Mobile IMU & Gyroscope Tests
            </div>
            <h2 className="text-xl font-bold text-zinc-900 tracking-tight">Smartphone Sensor Lab</h2>
            <p className="text-xs text-zinc-500">Measure natural physiological tremor, Romberg balance ratio, and blind joint proprioception.</p>
          </div>
          <button
            onClick={() => onNavigateTab('phone_gyro')}
            className="text-xs font-semibold text-violet-600 hover:text-violet-700 flex items-center gap-1 cursor-pointer"
          >
            Open Gyro Lab <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Steadiness Test */}
          <div
            onClick={() => {
              onSelectPhoneTest?.('steadiness');
              onNavigateTab('phone_gyro');
            }}
            className="p-6 rounded-2xl bg-white border border-zinc-200 hover:border-violet-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-5 group"
          >
            <div className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 group-hover:text-violet-600 transition-colors">
                Arm-Length Steadiness
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Hold phone at arm’s length for 30s. Measures micro-shake and runs an FFT to extract your natural 8–12 Hz physiological tremor frequency.
              </p>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-zinc-100 text-xs font-semibold text-violet-600">
              <span>30s Test • FFT Spectrum</span>
              <span className="group-hover:translate-x-1 transition-transform">Launch →</span>
            </div>
          </div>

          {/* Romberg Balance Test */}
          <div
            onClick={() => {
              onSelectPhoneTest?.('balance');
              onNavigateTab('phone_gyro');
            }}
            className="p-6 rounded-2xl bg-white border border-zinc-200 hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-5 group"
          >
            <div className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Compass className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 group-hover:text-emerald-600 transition-colors">
                Vestibular Balance (Romberg)
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Phone against chest, single-leg stance: 15s eyes open vs 15s eyes closed. Calculates the Romberg Sway Quotient to quantify visual reliance.
              </p>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-zinc-100 text-xs font-semibold text-emerald-600">
              <span>Two-Phase • Statokinesiogram</span>
              <span className="group-hover:translate-x-1 transition-transform">Launch →</span>
            </div>
          </div>

          {/* Blind Proprioception Test */}
          <div
            onClick={() => {
              onSelectPhoneTest?.('proprioception');
              onNavigateTab('phone_gyro');
            }}
            className="p-6 rounded-2xl bg-white border border-zinc-200 hover:border-amber-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-5 group"
          >
            <div className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Target className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 group-hover:text-amber-600 transition-colors">
                Blind Tilt Proprioception
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Tilt phone to assigned degree (e.g. 30°) with eyes closed/shielded. Measures joint position sense, signed overshoot, and kinesthetic calibration.
              </p>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-zinc-100 text-xs font-semibold text-amber-600">
              <span>3 Trials • Angular Error</span>
              <span className="group-hover:translate-x-1 transition-transform">Launch →</span>
            </div>
          </div>
        </div>
      </section>

      {/* Honest Methodology Banner */}
      <section className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5 flex items-start gap-3.5 text-xs text-zinc-600 leading-relaxed">
        <ShieldCheck className="w-5 h-5 text-violet-600 shrink-0 mt-0.5" />
        <div>
          <strong className="text-zinc-800">Honest Experimental Methodology:</strong> All scores reflect physical actuation latency, rendered cursor coordinate errors, and controller polling rates. Mnema never claims to assess medical diagnostics, ADHD, or cognitive IQ.
        </div>
      </section>
    </div>
  );
};
