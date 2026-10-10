import React, { useState } from 'react';
import { useControllerDiagnostics } from '../hooks/useControllerDiagnostics';
import { HomePage } from './HomePage';
import { ExperimentsHub } from './ExperimentsHub';
import { ControllerLab } from './ControllerLab';
import { ControllerIntegrationLab } from './ControllerIntegrationLab';
import { SessionHistoryView } from './SessionHistoryView';
import { PhoneGyroLab } from './phone/PhoneGyroLab';
import { ModeSelectorPortal } from './ModeSelectorPortal';
import { RetroCrtEffects } from './common/RetroCrtEffects';
import {
  createInitialStickCalibration,
} from '../utils/stickCalibration';
import type { StickCalibrationData } from '../types/telemetry';
import { ExternalLink, Gamepad2, Smartphone, LayoutGrid, Monitor, Volume2 } from 'lucide-react';
import { soundEngine } from '../utils/soundEngine';

export type MainNavTab = 'home' | 'experiments' | 'phone_gyro' | 'controller_lab' | 'integrations' | 'history';
export type AppMode = 'portal' | 'controller' | 'gyro';

export const ControllerDiagnosticsApp: React.FC = () => {
  const [currentMode, setCurrentMode] = useState<AppMode>('portal');
  const [activeTab, setActiveTab] = useState<MainNavTab>('home');
  const [initialExperiment, setInitialExperiment] = useState<'reaction' | 'target_acquisition' | 'continuous_tracking'>('reaction');
  const [initialPhoneTest, setInitialPhoneTest] = useState<any>('tremor_spectrum');

  // Retro CRT Shader and 8-Bit Audio Toggles
  const [crtEnabled, setCrtEnabled] = useState<boolean>(() => {
    return localStorage.getItem('mnema_crt_shader') !== 'false';
  });
  const [is8BitAudio, setIs8BitAudio] = useState<boolean>(true);

  const toggleCrt = () => {
    soundEngine.tick();
    setCrtEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('mnema_crt_shader', String(next));
      return next;
    });
  };

  const toggleAudioMode = () => {
    soundEngine.tick();
    setIs8BitAudio((prev) => {
      const next = !prev;
      soundEngine.is8BitMode = next;
      return next;
    });
  };

  const {
    controller,
    recentEvents,
    clearEventHistory,
    browserRenderHz,
    stateChangeIntervalStats,
    resetTelemetryStats,
    visibilityInterrupted,
    interruptionCount,
  } = useControllerDiagnostics({
    maxEventHistory: 40,
  });

  // Stick calibration state preserved across navigation
  const [leftStickCalib, setLeftStickCalib] = useState<StickCalibrationData>(() =>
    createInitialStickCalibration('Left Stick (Axes 0 & 1)', 0, 1)
  );
  const [rightStickCalib, setRightStickCalib] = useState<StickCalibrationData>(() =>
    createInitialStickCalibration('Right Stick (Axes 2 & 3)', 2, 3)
  );

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans bg-dither-matrix relative selection:bg-emerald-500 selection:text-black">
      {/* Global CRT Shader Layer & Click Sparks */}
      <RetroCrtEffects crtEnabled={crtEnabled} />

      {/* Top Global Arcade Marquee Navigation */}
      <header className="sticky top-0 z-40 bg-[#0d0f14]/95 backdrop-blur-md border-b border-emerald-500/20 shadow-[0_4px_24px_rgba(0,0,0,0.7)]">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          {/* Brand Marquee */}
          <div
            onClick={() => {
              soundEngine.coinInsert();
              setCurrentMode('portal');
            }}
            className="flex items-center gap-3 cursor-pointer select-none group shrink-0"
            title="Return to Arcade Portal"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-pixel text-xs shadow-[0_0_15px_rgba(34,197,94,0.3)] group-hover:bg-emerald-500 group-hover:text-black transition-all">
              M
            </div>
            <div className="flex flex-col">
              <span className="font-arcade text-sm tracking-wide text-zinc-100 group-hover:text-emerald-400 transition-colors glow-green">
                MNEMA
              </span>
              <span className="text-[10px] font-telemetry text-emerald-500/70 -mt-0.5 uppercase tracking-wider">
                Psychophysics Lab
              </span>
            </div>
          </div>

          {/* Master Arcade Cabinet Switch */}
          <div className="flex items-center gap-1 bg-zinc-950/90 p-1 rounded-xl border border-zinc-800 text-xs font-telemetry">
            <button
              onClick={() => {
                soundEngine.tick();
                setCurrentMode('portal');
              }}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                currentMode === 'portal'
                  ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 font-bold glow-green shadow-[0_0_10px_rgba(34,197,94,0.2)]'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Portal</span>
            </button>

            <button
              onClick={() => {
                soundEngine.coinInsert();
                setCurrentMode('controller');
                if (activeTab === 'phone_gyro') setActiveTab('home');
              }}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                currentMode === 'controller'
                  ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 font-bold glow-green shadow-[0_0_10px_rgba(34,197,94,0.2)]'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>1P Controller</span>
            </button>

            <button
              onClick={() => {
                soundEngine.coinInsert();
                setCurrentMode('gyro');
                setActiveTab('phone_gyro');
              }}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                currentMode === 'gyro'
                  ? 'bg-amber-950/80 border border-amber-500/40 text-amber-400 font-bold glow-amber shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>2P Sensor Rig</span>
            </button>
          </div>

          {/* Right Controls: CRT Toggle, 8-Bit Audio, FPS */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* CRT Shader Toggle */}
            <button
              onClick={toggleCrt}
              title={crtEnabled ? 'Disable CRT Scanline Shader' : 'Enable CRT Scanline Shader'}
              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-telemetry flex items-center gap-1.5 cursor-pointer transition-all ${
                crtEnabled
                  ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-400 glow-green'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{crtEnabled ? 'CRT: ON' : 'CRT: OFF'}</span>
            </button>

            {/* 8-Bit Sound Toggle */}
            <button
              onClick={toggleAudioMode}
              title={is8BitAudio ? 'Switch to Hi-Fi Sound' : 'Switch to 8-Bit Chiptune Sound'}
              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-telemetry flex items-center gap-1.5 cursor-pointer transition-all ${
                is8BitAudio
                  ? 'bg-amber-950/70 border-amber-500/40 text-amber-400 glow-amber'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{is8BitAudio ? '8-BIT' : 'HI-FI'}</span>
            </button>

            {/* Controller Connection Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-telemetry">
              <span className={`w-2 h-2 rounded-full ${controller ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="font-semibold text-zinc-300 text-[11px] hidden lg:inline">
                {controller ? (controller.id.includes('EvoFox') ? 'EvoFox One S' : '1P CONNECTED') : 'CREDIT 01'}
              </span>
              <span className="font-mono text-zinc-400 text-[11px] hidden sm:inline ml-1">
                {browserRenderHz} FPS
              </span>
            </div>
          </div>
        </div>

        {/* Controller Sub-Navigation Bar */}
        {currentMode === 'controller' && (
          <div className="border-t border-emerald-500/20 bg-[#0a0c10]/95 overflow-x-auto">
            <div className="max-w-6xl mx-auto px-4 py-2 flex items-center gap-1.5">
              {[
                { id: 'home', label: 'OVERVIEW' },
                { id: 'experiments', label: 'EXPERIMENTS' },
                { id: 'controller_lab', label: 'CALIBRATION LAB' },
                { id: 'integrations', label: 'INTEGRATIONS' },
                { id: 'history', label: 'HIGH SCORES & CARDS' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    soundEngine.tick();
                    setActiveTab(tab.id as MainNavTab);
                  }}
                  className={`px-3.5 py-1 rounded-md text-xs font-arcade whitespace-nowrap transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-emerald-500 text-black font-bold shadow-[0_0_12px_rgba(34,197,94,0.4)]'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-transparent hover:border-zinc-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Visibility warning alert */}
      {visibilityInterrupted && (
        <div className="max-w-6xl mx-auto w-full px-4 mt-3">
          <div className="p-3 bg-amber-950/80 border border-amber-500/40 text-amber-300 text-xs rounded-xl flex items-center justify-between font-telemetry">
            <span>
              ⚠️ <strong>Tab Inactive / Backgrounded:</strong> Browser suspended frame polling while tab was obscured ({interruptionCount} interruptions).
            </span>
          </div>
        </div>
      )}

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        {currentMode === 'portal' && (
          <ModeSelectorPortal
            controller={controller}
            browserRenderHz={browserRenderHz}
            onSelectMode={(mode) => {
              setCurrentMode(mode);
              if (mode === 'controller') {
                setActiveTab('home');
              } else if (mode === 'gyro') {
                setActiveTab('phone_gyro');
              }
            }}
          />
        )}

        {currentMode === 'gyro' && (
          <PhoneGyroLab initialTest={initialPhoneTest} />
        )}

        {currentMode === 'controller' && (
          <>
            {activeTab === 'home' && (
              <HomePage
                controller={controller}
                browserRenderHz={browserRenderHz}
                onNavigateTab={(tab) => {
                  if (tab === 'phone_gyro') {
                    setCurrentMode('gyro');
                    setActiveTab('phone_gyro');
                  } else {
                    setActiveTab(tab);
                  }
                }}
                onSelectExperiment={setInitialExperiment}
                onSelectPhoneTest={(test) => {
                  setInitialPhoneTest(test);
                  setCurrentMode('gyro');
                  setActiveTab('phone_gyro');
                }}
              />
            )}

            {activeTab === 'experiments' && (
              <ExperimentsHub
                controller={controller}
                browserRenderHz={browserRenderHz}
                initialSelected={initialExperiment}
              />
            )}

            {activeTab === 'controller_lab' && (
              <ControllerLab
                controller={controller}
                browserRenderHz={browserRenderHz}
                leftStickCalib={leftStickCalib}
                setLeftStickCalib={setLeftStickCalib}
                rightStickCalib={rightStickCalib}
                setRightStickCalib={setRightStickCalib}
                recentEvents={recentEvents}
                clearEventHistory={clearEventHistory}
                stateChangeIntervalStats={stateChangeIntervalStats}
                resetTelemetryStats={resetTelemetryStats}
              />
            )}

            {activeTab === 'integrations' && (
              <div className="bg-[#111319] border border-zinc-800 rounded-2xl p-6 shadow-sm">
                <ControllerIntegrationLab
                  controller={controller}
                  browserRenderHz={browserRenderHz}
                />
              </div>
            )}

            {activeTab === 'history' && (
              <div className="bg-[#111319] border border-zinc-800 rounded-2xl p-6 shadow-sm">
                <SessionHistoryView />
              </div>
            )}
          </>
        )}
      </main>

      {/* Retro Arcade Footer */}
      <footer className="border-t border-zinc-800/80 bg-[#0a0c10] py-6 mt-12 text-xs font-telemetry text-zinc-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-arcade text-zinc-300">MNEMA ARCADE</span>
            <span>•</span>
            <span>Psychophysics & Physical Sensor Laboratory</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/hvndal/Mnema"
              target="_blank"
              rel="noreferrer"
              className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 transition-colors"
            >
              GitHub Repository <ExternalLink className="w-3 h-3" />
            </a>
            <span>•</span>
            <span>W3C GAMEPAD API</span>
            <span>•</span>
            <span>GOOGLE STITCH DESIGN</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ControllerDiagnosticsApp;
