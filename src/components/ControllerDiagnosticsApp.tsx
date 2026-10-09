import React, { useState } from 'react';
import { useControllerDiagnostics } from '../hooks/useControllerDiagnostics';
import { HomePage } from './HomePage';
import { ExperimentsHub } from './ExperimentsHub';
import { ControllerLab } from './ControllerLab';
import { ControllerIntegrationLab } from './ControllerIntegrationLab';
import { SessionHistoryView } from './SessionHistoryView';
import { PhoneGyroLab } from './phone/PhoneGyroLab';
import { ModeSelectorPortal } from './ModeSelectorPortal';
import {
  createInitialStickCalibration,
} from '../utils/stickCalibration';
import type { StickCalibrationData } from '../types/telemetry';
import { ExternalLink, Gamepad2, Smartphone, LayoutGrid } from 'lucide-react';

export type MainNavTab = 'home' | 'experiments' | 'phone_gyro' | 'controller_lab' | 'integrations' | 'history';
export type AppMode = 'portal' | 'controller' | 'gyro';

export const ControllerDiagnosticsApp: React.FC = () => {
  const [currentMode, setCurrentMode] = useState<AppMode>('portal');
  const [activeTab, setActiveTab] = useState<MainNavTab>('home');
  const [initialExperiment, setInitialExperiment] = useState<'reaction' | 'target_acquisition' | 'continuous_tracking'>('reaction');
  const [initialPhoneTest, setInitialPhoneTest] = useState<any>('tremor_spectrum');

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
    <div className="min-h-screen bg-[#fafafc] text-zinc-900 flex flex-col font-sans">
      {/* Top Global Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-zinc-200">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-2">
          {/* Brand */}
          <div
            onClick={() => setCurrentMode('portal')}
            className="flex items-center gap-3 cursor-pointer select-none group shrink-0"
            title="Return to Main Portal"
          >
            <div className="w-9 h-9 rounded-xl bg-violet-600 text-white flex items-center justify-center font-black shadow-sm group-hover:bg-violet-700 transition-colors">
              M
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-sm tracking-tight text-zinc-900">MNEMA</span>
              <span className="text-[10px] text-zinc-500 font-medium -mt-0.5">Psychophysics Lab</span>
            </div>
          </div>

          {/* Master Two-Sided Mode Selector Toggle */}
          <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setCurrentMode('portal')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                currentMode === 'portal'
                  ? 'bg-white text-zinc-900 shadow-xs font-bold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Portal</span>
            </button>

            <button
              onClick={() => {
                setCurrentMode('controller');
                if (activeTab === 'phone_gyro') setActiveTab('home');
              }}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                currentMode === 'controller'
                  ? 'bg-white text-violet-700 shadow-xs font-bold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5 text-violet-600" />
              <span>Controller</span>
            </button>

            <button
              onClick={() => {
                setCurrentMode('gyro');
                setActiveTab('phone_gyro');
              }}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                currentMode === 'gyro'
                  ? 'bg-white text-violet-700 shadow-xs font-bold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-violet-600" />
              <span>Phone Gyro</span>
            </button>
          </div>

          {/* Right Status Badge */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-xs">
              <span className={`w-2 h-2 rounded-full ${controller ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
              <span className="font-medium text-zinc-700 text-[11px] hidden sm:inline">
                {controller ? (controller.id.includes('EvoFox') ? 'EvoFox One S' : 'Gamepad Connected') : 'Awaiting Press'}
              </span>
              <span className="font-medium text-zinc-700 text-[11px] sm:hidden">
                {controller ? 'Connected' : 'Offline'}
              </span>
            </div>

            <span className="hidden md:inline font-mono text-[11px] text-zinc-400 font-medium">
              {browserRenderHz} FPS
            </span>
          </div>
        </div>

        {/* Controller Sub-Navigation Bar (shown when Controller Mode is active) */}
        {currentMode === 'controller' && (
          <div className="border-t border-zinc-100 bg-white/80 overflow-x-auto">
            <div className="max-w-6xl mx-auto px-4 py-1.5 flex items-center gap-1">
              {[
                { id: 'home', label: 'Overview' },
                { id: 'experiments', label: 'Experiments' },
                { id: 'controller_lab', label: 'Controller Lab' },
                { id: 'integrations', label: 'Integrations' },
                { id: 'history', label: 'History & Cards' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as MainNavTab)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-violet-600 text-white'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
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
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-center justify-between">
            <span>
              ⚠️ <strong>Tab Inactive / Hidden:</strong> Browser suspended frame polling while tab was obscured ({interruptionCount} interruptions).
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
              <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
                <ControllerIntegrationLab
                  controller={controller}
                  browserRenderHz={browserRenderHz}
                />
              </div>
            )}

            {activeTab === 'history' && (
              <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
                <SessionHistoryView />
              </div>
            )}
          </>
        )}
      </main>

      {/* Light-first Clean Footer */}
      <footer className="border-t border-zinc-200 bg-white py-6 mt-12 text-xs text-zinc-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-700">Mnema</span>
            <span>•</span>
            <span>Controller-native psychophysics & precision testing</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/hvndal/Mnema"
              target="_blank"
              rel="noreferrer"
              className="text-violet-600 hover:text-violet-700 font-semibold flex items-center gap-1"
            >
              GitHub Repository <ExternalLink className="w-3 h-3" />
            </a>
            <span>•</span>
            <span>W3C Gamepad API</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ControllerDiagnosticsApp;
