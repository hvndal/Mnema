import React, { useState } from 'react';
import type { RawGamepadState } from '../types/telemetry';
import { ReactionLab } from './ReactionLab';
import { TargetAcquisitionLab } from './TargetAcquisitionLab';
import { ContinuousTrackingLab } from './ContinuousTrackingLab';
import { Zap, Crosshair, Activity, Clock, Award } from 'lucide-react';

interface ExperimentsHubProps {
  controller: RawGamepadState | null;
  browserRenderHz: number;
  initialSelected?: 'reaction' | 'target_acquisition' | 'continuous_tracking';
}

export const ExperimentsHub: React.FC<ExperimentsHubProps> = ({
  controller,
  browserRenderHz,
  initialSelected = 'reaction',
}) => {
  const [selectedExp, setSelectedExp] = useState<'reaction' | 'target_acquisition' | 'continuous_tracking'>(initialSelected);

  const experimentInfo = {
    reaction: {
      title: 'Reaction-Time Lab',
      subtitle: 'Neuromuscular response latency benchmark',
      duration: '1 - 2 mins',
      inputs: 'Button [0] / Bumpers (LB & RB)',
      badge: 'Simple, Choice & Go/No-Go',
    },
    target_acquisition: {
      title: 'Target Acquisition',
      subtitle: "Fitts' Law cursor speed, path efficiency & endpoint error",
      duration: '2 - 3 mins',
      inputs: 'Left Stick + Trigger Confirmation',
      badge: 'Kinematic & Spatial',
    },
    continuous_tracking: {
      title: 'Continuous Pursuit Tracking',
      subtitle: 'Root-mean-square tracking error & stick steering lag',
      duration: '25 seconds',
      inputs: 'Left Analog Stick',
      badge: 'Pursuit Rotor Dynamics',
    },
  };

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6">
      {/* Experiment Selector Ribbon */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-2 flex flex-wrap gap-2 shadow-xs">
        <button
          onClick={() => setSelectedExp('reaction')}
          className={`flex-1 min-w-[200px] p-3 rounded-xl flex items-center gap-3 transition-all cursor-pointer text-left ${
            selectedExp === 'reaction'
              ? 'bg-violet-600 text-white shadow-sm'
              : 'hover:bg-zinc-50 text-zinc-700'
          }`}
        >
          <div className={`p-2 rounded-lg ${selectedExp === 'reaction' ? 'bg-violet-700 text-white' : 'bg-violet-50 text-violet-600'}`}>
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold block">1. Reaction-Time Lab</span>
            <span className={`text-[11px] ${selectedExp === 'reaction' ? 'text-violet-100' : 'text-zinc-400'}`}>SRT, Choice & No-Go</span>
          </div>
        </button>

        <button
          onClick={() => setSelectedExp('target_acquisition')}
          className={`flex-1 min-w-[200px] p-3 rounded-xl flex items-center gap-3 transition-all cursor-pointer text-left ${
            selectedExp === 'target_acquisition'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'hover:bg-zinc-50 text-zinc-700'
          }`}
        >
          <div className={`p-2 rounded-lg ${selectedExp === 'target_acquisition' ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-600'}`}>
            <Crosshair className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold block">2. Target Acquisition</span>
            <span className={`text-[11px] ${selectedExp === 'target_acquisition' ? 'text-emerald-100' : 'text-zinc-400'}`}>Fitts' Law Speed & Error</span>
          </div>
        </button>

        <button
          onClick={() => setSelectedExp('continuous_tracking')}
          className={`flex-1 min-w-[200px] p-3 rounded-xl flex items-center gap-3 transition-all cursor-pointer text-left ${
            selectedExp === 'continuous_tracking'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'hover:bg-zinc-50 text-zinc-700'
          }`}
        >
          <div className={`p-2 rounded-lg ${selectedExp === 'continuous_tracking' ? 'bg-sky-700 text-white' : 'bg-sky-50 text-sky-600'}`}>
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold block">3. Continuous Tracking</span>
            <span className={`text-[11px] ${selectedExp === 'continuous_tracking' ? 'text-sky-100' : 'text-zinc-400'}`}>Pursuit Rotor RMSE</span>
          </div>
        </button>
      </div>

      {/* Overview Metadata Bar */}
      <div className="bg-white border border-zinc-200 rounded-xl px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-600 shadow-xs">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-semibold text-zinc-800">
            <Award className="w-4 h-4 text-violet-600" />
            {experimentInfo[selectedExp].title}
          </span>
          <span className="hidden sm:inline text-zinc-300">|</span>
          <span className="hidden sm:inline text-zinc-500">{experimentInfo[selectedExp].subtitle}</span>
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1 text-zinc-500">
            <Clock className="w-3.5 h-3.5" />
            {experimentInfo[selectedExp].duration}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 font-medium">
            Controls: {experimentInfo[selectedExp].inputs}
          </span>
        </div>
      </div>

      {/* Active Experiment View Component */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
        {selectedExp === 'reaction' && (
          <ReactionLab controller={controller} browserRenderHz={browserRenderHz} />
        )}

        {selectedExp === 'target_acquisition' && (
          <TargetAcquisitionLab controller={controller} browserRenderHz={browserRenderHz} />
        )}

        {selectedExp === 'continuous_tracking' && (
          <ContinuousTrackingLab controller={controller} browserRenderHz={browserRenderHz} />
        )}
      </div>
    </div>
  );
};
