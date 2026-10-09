import React, { useState } from 'react';
import { usePhoneSensors } from '../../hooks/usePhoneSensors';
import type { GyroDomain, GyroTestId } from '../../types/gyroLab';

// Test Components
import { PhoneSteadinessTest } from './PhoneSteadinessTest';
import { PhoneBalanceTest } from './PhoneBalanceTest';
import { TandemWalkTest } from './TandemWalkTest';
import { SitToStandTest } from './SitToStandTest';

import { PhoneProprioceptionTest } from './PhoneProprioceptionTest';
import { MirrorMatchTest } from './MirrorMatchTest';
import { SubjectiveVerticalTest } from './SubjectiveVerticalTest';
import { ReturnToZeroTest } from './ReturnToZeroTest';

import { WristFlipTest } from './WristFlipTest';
import { SmoothnessTest } from './SmoothnessTest';
import { TiltReactionTest } from './TiltReactionTest';
import { InternalMetronomeTest } from './InternalMetronomeTest';

import { DualTaskTest } from './DualTaskTest';
import { TiltMazeInvertedTest } from './TiltMazeInvertedTest';
import { FatigueCurveTest } from './FatigueCurveTest';
import { TwoPlayerDuelTest } from './TwoPlayerDuelTest';

import {
  Activity,
  Compass,
  Target,
  Smartphone,
  ShieldCheck,
  AlertTriangle,
  QrCode,
  Laptop,
  Footprints,
  Armchair,
  Split,
  EyeOff,
  Rotate3D,
  RefreshCw,
  Infinity as InfinityIcon,
  Zap,
  Music,
  Brain,
  TrendingUp,
  Users,
} from 'lucide-react';

interface PhoneGyroLabProps {
  initialTest?: GyroTestId;
}

export const PhoneGyroLab: React.FC<PhoneGyroLabProps> = ({ initialTest = 'tremor_spectrum' }) => {
  const [activeDomain, setActiveDomain] = useState<GyroDomain>('body_control');
  const [activeTest, setActiveTest] = useState<GyroTestId>(initialTest);

  const {
    permission,
    requestPermission,
    isHardwareAvailable,
    isSimulated,
    setIsSimulated,
    latestMotion,
    latestOrientation,
    sensorHz,
    simulatedPitch,
    setSimulatedPitch,
    simulatedTremorAmp,
    setSimulatedTremorAmp,
  } = usePhoneSensors();

  // Test definitions categorized by domain
  const domainTests: Record<GyroDomain, { id: GyroTestId; label: string; desc: string; icon: any }[]> = {
    body_control: [
      { id: 'tremor_spectrum', label: 'Tremor Spectrum', desc: '30s hold, rotation rate FFT, 8-12 Hz peak', icon: Activity },
      { id: 'sway_map', label: 'Sway Map (Romberg)', desc: 'Chest hold, eyes open vs closed scribble ratio', icon: Compass },
      { id: 'tandem_walk', label: 'Tandem Walk', desc: '10 heel-to-toe steps, trunk wobble per step', icon: Footprints },
      { id: 'sit_to_stand', label: '5x Sit-to-Stand', desc: 'Chair stands, timing and rise smoothness', icon: Armchair },
    ],
    body_sense: [
      { id: 'blind_angle', label: 'Blind Angle', desc: 'Tilt to 30° without looking; reveal error', icon: Target },
      { id: 'mirror_match', label: 'Mirror Match', desc: 'Left hand tilt matched by right hand', icon: Split },
      { id: 'subjective_vertical', label: 'Subjective Vertical', desc: 'Hold perfectly upright with eyes closed', icon: EyeOff },
      { id: 'return_to_zero', label: 'Return to Zero', desc: 'Spin on chair eyes closed, face start', icon: Rotate3D },
    ],
    timing_movement: [
      { id: 'wrist_flip_speed', label: 'Wrist Flip Speed', desc: 'Rapid 10s alternation, rhythm decay CV', icon: RefreshCw },
      { id: 'smoothness_score', label: 'Smoothness Score', desc: 'Air figure-eight jerk minimization', icon: InfinityIcon },
      { id: 'tilt_reaction_time', label: 'Tilt Reaction Time', desc: 'Flick on flash, gyro onset timestamp', icon: Zap },
      { id: 'internal_metronome', label: 'Internal Metronome', desc: '100 BPM rock, silent pacing drift', icon: Music },
    ],
    brain_load: [
      { id: 'dual_task_cost', label: 'Dual-Task Cost', desc: 'Steadiness drop under serial-7 mental math', icon: Brain },
      { id: 'tilt_maze_inverted', label: 'Inverted Tilt Maze', desc: 'Steer marble, mid-run inverted axes', icon: Compass },
      { id: 'fatigue_curve', label: 'Fatigue Curve', desc: '60s/120s hold, tremor amplitude climb', icon: TrendingUp },
    ],
    presentation_social: [
      { id: 'two_player_duel', label: '2-Player Stillness Duel', desc: 'Pass & play sudden-death stillness challenge', icon: Users },
    ],
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6">
      {/* Top Mobile Sensors Notification / Permission Card */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-zinc-900">Mobile IMU & Gyroscope Psychophysics</h3>
              {isHardwareAvailable ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Live IMU ({sensorHz} Hz)
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-semibold border border-amber-200 flex items-center gap-1">
                  <Laptop className="w-3 h-3" /> Desktop Simulator
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              14 sensory tests measuring neuromotor control, joint proprioception, cerebellar timing, and cognitive-motor interference.
            </p>
          </div>
        </div>

        {/* Action button for iOS permission or Simulator toggle */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {permission === 'prompt' && (
            <button
              onClick={requestPermission}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Smartphone className="w-3.5 h-3.5" />
              Enable Phone Sensors
            </button>
          )}

          {permission === 'denied' && (
            <div className="text-xs text-rose-600 font-medium flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Sensor permission denied
            </div>
          )}

          <button
            onClick={() => setIsSimulated(!isSimulated)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              isSimulated
                ? 'bg-zinc-100 border-zinc-300 text-zinc-800'
                : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            {isSimulated ? 'Using Desktop Simulator' : 'Switch to Simulator'}
          </button>
        </div>
      </div>

      {/* Domain Navigation Tabs */}
      <div className="flex overflow-x-auto gap-1.5 bg-zinc-100 p-1 rounded-2xl">
        {[
          { id: 'body_control', label: '1. Body Control', icon: Activity },
          { id: 'body_sense', label: '2. Body Sense', icon: Target },
          { id: 'timing_movement', label: '3. Timing & Quality', icon: RefreshCw },
          { id: 'brain_load', label: '4. Brain Load', icon: Brain },
          { id: 'presentation_social', label: '5. Social Duel', icon: Users },
        ].map((d) => {
          const Icon = d.icon;
          const isActive = activeDomain === d.id;
          return (
            <button
              key={d.id}
              onClick={() => {
                setActiveDomain(d.id as GyroDomain);
                setActiveTest(domainTests[d.id as GyroDomain][0].id);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                isActive ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-violet-600' : 'text-zinc-400'}`} />
              {d.label}
            </button>
          );
        })}
      </div>

      {/* Sub-Test Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {domainTests[activeDomain].map((test) => {
          const Icon = test.icon;
          const isSelected = activeTest === test.id;
          return (
            <div
              key={test.id}
              onClick={() => setActiveTest(test.id)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                isSelected
                  ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                  : 'bg-white text-zinc-800 border-zinc-200 hover:border-zinc-300 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs">{test.label}</span>
                <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-violet-600'}`} />
              </div>
              <p className={`text-[11px] leading-snug ${isSelected ? 'text-violet-100' : 'text-zinc-500'}`}>
                {test.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* Active Test Execution Container */}
      <div className="bg-white border border-zinc-200 rounded-3xl p-6 sm:p-8 shadow-xs">
        {/* Domain 1: Body Control */}
        {activeTest === 'tremor_spectrum' && (
          <PhoneSteadinessTest
            latestMotion={latestMotion}
            sensorHz={sensorHz}
            isSimulated={isSimulated}
            simulatedTremorAmp={simulatedTremorAmp}
            setSimulatedTremorAmp={setSimulatedTremorAmp}
          />
        )}
        {activeTest === 'sway_map' && (
          <PhoneBalanceTest
            latestOrientation={latestOrientation}
            sensorHz={sensorHz}
            isSimulated={isSimulated}
          />
        )}
        {activeTest === 'tandem_walk' && (
          <TandemWalkTest
            latestMotion={latestMotion}
            latestOrientation={latestOrientation}
            sensorHz={sensorHz}
            isSimulated={isSimulated}
          />
        )}
        {activeTest === 'sit_to_stand' && (
          <SitToStandTest
            latestMotion={latestMotion}
            sensorHz={sensorHz}
            isSimulated={isSimulated}
          />
        )}

        {/* Domain 2: Body Sense */}
        {activeTest === 'blind_angle' && (
          <PhoneProprioceptionTest
            latestOrientation={latestOrientation}
            sensorHz={sensorHz}
            isSimulated={isSimulated}
            simulatedPitch={simulatedPitch}
            setSimulatedPitch={setSimulatedPitch}
          />
        )}
        {activeTest === 'mirror_match' && (
          <MirrorMatchTest
            latestOrientation={latestOrientation}
            sensorHz={sensorHz}
            isSimulated={isSimulated}
          />
        )}
        {activeTest === 'subjective_vertical' && (
          <SubjectiveVerticalTest
            latestOrientation={latestOrientation}
            sensorHz={sensorHz}
            isSimulated={isSimulated}
          />
        )}
        {activeTest === 'return_to_zero' && (
          <ReturnToZeroTest
            latestOrientation={latestOrientation}
            sensorHz={sensorHz}
            isSimulated={isSimulated}
          />
        )}

        {/* Domain 3: Timing and Movement Quality */}
        {activeTest === 'wrist_flip_speed' && (
          <WristFlipTest
            latestMotion={latestMotion}
            sensorHz={sensorHz}
            isSimulated={isSimulated}
          />
        )}
        {activeTest === 'smoothness_score' && (
          <SmoothnessTest
            latestMotion={latestMotion}
            sensorHz={sensorHz}
            isSimulated={isSimulated}
          />
        )}
        {activeTest === 'tilt_reaction_time' && (
          <TiltReactionTest
            latestMotion={latestMotion}
            sensorHz={sensorHz}
            isSimulated={isSimulated}
          />
        )}
        {activeTest === 'internal_metronome' && (
          <InternalMetronomeTest
            latestOrientation={latestOrientation}
            sensorHz={sensorHz}
            isSimulated={isSimulated}
          />
        )}

        {/* Domain 4: Brain Load */}
        {activeTest === 'dual_task_cost' && (
          <DualTaskTest
            latestMotion={latestMotion}
            sensorHz={sensorHz}
            isSimulated={isSimulated}
          />
        )}
        {activeTest === 'tilt_maze_inverted' && (
          <TiltMazeInvertedTest
            latestOrientation={latestOrientation}
            sensorHz={sensorHz}
            isSimulated={isSimulated}
          />
        )}
        {activeTest === 'fatigue_curve' && (
          <FatigueCurveTest
            latestMotion={latestMotion}
            sensorHz={sensorHz}
            isSimulated={isSimulated}
          />
        )}

        {/* Domain 5: Social Duel */}
        {activeTest === 'two_player_duel' && (
          <TwoPlayerDuelTest
            latestMotion={latestMotion}
            sensorHz={sensorHz}
            isSimulated={isSimulated}
          />
        )}
      </div>

      {/* Explicit Disclaimer Notice */}
      <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-zinc-500 leading-relaxed">
        <ShieldCheck className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
        <div>
          <strong className="text-zinc-700">Recreational Psychophysics Tool:</strong> Smartphone accelerometers and gyroscopes vary significantly across hardware manufacturers and calibration baselines. This tool is built as an educational and sensory playground, not a clinical neuro-diagnostic instrument.
        </div>
      </div>

      {/* Mobile QR Helper */}
      <div className="bg-violet-50/50 border border-violet-100 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-600">
        <div className="flex items-center gap-3">
          <QrCode className="w-5 h-5 text-violet-600 shrink-0" />
          <div>
            <span className="font-bold text-zinc-800 block">Open on your smartphone</span>
            <span className="text-[11px] text-zinc-500">
              Visit <strong>https://hvndal.github.io/Mnema/</strong> on mobile Safari or Chrome for real IMU motion events.
            </span>
          </div>
        </div>
        <a
          href="https://hvndal.github.io/Mnema/"
          target="_blank"
          rel="noreferrer"
          className="text-violet-700 font-bold hover:underline shrink-0"
        >
          Open Live URL ↗
        </a>
      </div>
    </div>
  );
};
