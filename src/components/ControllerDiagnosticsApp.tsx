import React, { useState } from 'react';
import { useControllerDiagnostics } from '../hooks/useControllerDiagnostics';
import { HomePage } from './HomePage';
import { ExperimentsHub } from './ExperimentsHub';
import { ControllerLab } from './ControllerLab';
import { ControllerIntegrationLab } from './ControllerIntegrationLab';
import { SessionHistoryView } from './SessionHistoryView';
import { PhoneGyroLab } from './phone/PhoneGyroLab';
import {
  createInitialStickCalibration,
} from '../utils/stickCalibration';
import type { StickCalibrationData } from '../types/telemetry';
import { ExternalLink } from 'lucide-react';

export type MainNavTab = 'home' | 'experiments' | 'phone_gyro' | 'controller_lab' | 'integrations' | 'history';

export const ControllerDiagnosticsApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MainNavTab>('home');
  const [initialExperiment, setInitialExperiment] = useState<'reaction' | 'target_acquisition' | 'continuous_tracking'>('reaction');
  const [initialPhoneTest, setInitialPhoneTest] = useState<'steadiness' | 'balance' | 'proprioception'>('steadiness');

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
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-zinc-200">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Brand */}
          <div
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-3 cursor-pointer select-none group"
          >
            <div className="w-9 h-9 rounded-xl bg-violet-600 text-white flex items-center justify-center font-black shadow-sm group-hover:bg-violet-700 transition-colors">
              M
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-sm tracking-tight text-zinc-900">MNEMA</span>
              <span className="text-[10px] text-zinc-500 font-medium -mt-0.5">Controller Psychophysics</span>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="hidden md:flex items-center gap-1 bg-zinc-100 p-1 rounded-xl">
            {[
              { id: 'home', label: 'Home' },
              { id: 'phone_gyro', label: 'Phone Gyro' },
              { id: 'experiments', label: 'Controller Tests' },
              { id: 'controller_lab', label: 'Controller Lab' },
              { id: 'integrations', label: 'Integrations' },
              { id: 'history', label: 'History & Cards' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as MainNavTab)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Right Status Badge */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-xs">
              <span className={`w-2 h-2 rounded-full ${controller ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
              <span className="font-medium text-zinc-700 text-[11px]">
                {controller ? (controller.id.includes('EvoFox') ? 'EvoFox One S' : 'Gamepad Connected') : 'Awaiting Press'}
              </span>
            </div>

            <span className="hidden sm:inline font-mono text-[11px] text-zinc-400 font-medium">
              {browserRenderHz} FPS
            </span>
          </div>
        </div>

        {/* Mobile secondary tab row */}
        <div className="flex md:hidden overflow-x-auto px-4 py-2 border-t border-zinc-100 gap-1 bg-white">
          {[
            { id: 'home', label: 'Home' },
            { id: 'phone_gyro', label: 'Phone Gyro' },
            { id: 'experiments', label: 'Controller' },
            { id: 'controller_lab', label: 'Lab' },
            { id: 'integrations', label: 'Integrations' },
            { id: 'history', label: 'History' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as MainNavTab)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-violet-600 text-white'
                  : 'bg-zinc-100 text-zinc-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
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
        {activeTab === 'home' && (
          <HomePage
            controller={controller}
            browserRenderHz={browserRenderHz}
            onNavigateTab={setActiveTab}
            onSelectExperiment={setInitialExperiment}
            onSelectPhoneTest={(test) => {
              setInitialPhoneTest(test);
              setActiveTab('phone_gyro');
            }}
          />
        )}

        {activeTab === 'phone_gyro' && (
          <PhoneGyroLab initialTest={initialPhoneTest} />
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
