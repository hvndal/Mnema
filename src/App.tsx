import { useState } from 'react';
import { useGamepad } from './hooks/useGamepad';
import { ControllerDebugger } from './components/ControllerDebugger';
import { ExperimentRunner } from './components/ExperimentRunner';
import { ResultsView } from './components/ResultsView';
import { calculatePsychophysicsStats } from './utils/stats';
import type { TestParadigm, SingleTrialResult, PsychophysicsStats } from './types';
import { Zap, Crosshair, ArrowUpDown, ShieldAlert, Sparkles } from 'lucide-react';

export function App() {
  const [paradigm, setParadigm] = useState<TestParadigm>('simple');
  const [trialCount, setTrialCount] = useState<number>(5);
  const [testPhase, setTestPhase] = useState<'idle' | 'running' | 'results'>('idle');
  const [completedStats, setCompletedStats] = useState<PsychophysicsStats | null>(null);

  const { snapshot, isConnected, controllerIndex, pollingRateHz } = useGamepad();

  const handleStartTest = (selectedParadigm: TestParadigm) => {
    setParadigm(selectedParadigm);
    setTestPhase('running');
  };

  const handleTestComplete = (trials: SingleTrialResult[]) => {
    const stats = calculatePsychophysicsStats(trials);
    setCompletedStats(stats);
    setTestPhase('results');
  };

  const handleRestart = () => {
    setCompletedStats(null);
    setTestPhase('idle');
  };

  const hardwareName = snapshot?.id 
    ? (snapshot.id.includes('EvoFox') ? 'EvoFox One S' : snapshot.id.slice(0, 24)) 
    : 'Gamepad Controller';

  return (
    <div className="min-h-screen w-full bg-neutral-950 text-neutral-100 flex flex-col justify-between selection:bg-rose-500 selection:text-white">
      {/* Top Navigation / Brand */}
      <header className="w-full border-b border-neutral-900 bg-neutral-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center font-black font-mono text-white shadow-[0_0_15px_rgba(244,63,94,0.5)]">
              M
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold font-mono text-base tracking-wider text-white">MNEMA</span>
              <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest -mt-1">
                Gamepad Psychophysics Lab
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="hidden sm:inline text-neutral-500">POLLING:</span>
            <span className="px-2 py-1 rounded bg-neutral-900 border border-neutral-800 text-rose-400 font-bold">
              {pollingRateHz} Hz
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Arena */}
      <main className="w-full max-w-5xl mx-auto px-4 py-8 flex-1 flex flex-col items-center justify-center gap-8">
        {/* Hardware Status & Controller Debugger (Always available) */}
        <div className="w-full">
          <ControllerDebugger
            snapshot={snapshot}
            isConnected={isConnected}
            pollingRateHz={pollingRateHz}
          />
        </div>

        {/* Phase 1: Idle (Paradigm Selector) */}
        {testPhase === 'idle' && (
          <div className="w-full flex flex-col items-center gap-8 animate-in fade-in duration-200">
            {/* Header info */}
            <div className="text-center max-w-xl flex flex-col items-center gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono">
                <Sparkles className="w-3.5 h-3.5" />
                Raw Psychophysics • No Fake Brain Diagnostics
              </div>
              <h1 className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white">
                PRECISION REACTION
              </h1>
              <p className="text-sm font-mono text-neutral-400 leading-relaxed">
                Hardware-native testing engineered for the EvoFox One S and standard gamepads. Measure neuromuscular response latency, jitter, and fatigue curve.
              </p>
            </div>

            {/* Trial count selector */}
            <div className="flex items-center gap-2 p-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-mono">
              <span className="px-3 text-neutral-500">TRIAL COUNT:</span>
              {[5, 10, 20].map((count) => (
                <button
                  key={count}
                  onClick={() => setTrialCount(count)}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
                    trialCount === count
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {count} ROUNDS
                </button>
              ))}
            </div>

            {/* Paradigm Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              {/* Paradigm 1: Simple Reaction Time */}
              <div
                onClick={() => handleStartTest('simple')}
                className="group p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800 hover:border-emerald-500/60 hover:bg-neutral-900 cursor-pointer transition-all flex flex-col justify-between gap-4 shadow-lg hover:shadow-emerald-950/20"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-110 transition-transform">
                    <Zap className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold font-mono text-white mb-1">
                    Simple Reaction Time (SRT)
                  </h3>
                  <p className="text-xs font-mono text-neutral-400 leading-relaxed">
                    Visual stimulus trigger with unpredictable foreperiod jitter. Fire instantly using any controller button.
                  </p>
                </div>
                <div className="flex items-center justify-between text-xs font-mono text-emerald-400 font-bold pt-3 border-t border-neutral-800/80">
                  <span>BENCHMARK SPEED</span>
                  <span>START →</span>
                </div>
              </div>

              {/* Paradigm 2: 4-Choice Color Reaction */}
              <div
                onClick={() => handleStartTest('choice_color')}
                className="group p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800 hover:border-blue-500/60 hover:bg-neutral-900 cursor-pointer transition-all flex flex-col justify-between gap-4 shadow-lg hover:shadow-blue-950/20"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-3 group-hover:scale-110 transition-transform">
                    <Crosshair className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold font-mono text-white mb-1">
                    Choice Reaction (CRT: A/B/X/Y)
                  </h3>
                  <p className="text-xs font-mono text-neutral-400 leading-relaxed">
                    Stimulus presents a specific target color. Match visual input to controller face button with cognitive processing.
                  </p>
                </div>
                <div className="flex items-center justify-between text-xs font-mono text-blue-400 font-bold pt-3 border-t border-neutral-800/80">
                  <span>COGNITIVE LATENCY</span>
                  <span>START →</span>
                </div>
              </div>

              {/* Paradigm 3: 4-Choice D-Pad */}
              <div
                onClick={() => handleStartTest('choice_dpad')}
                className="group p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800 hover:border-purple-500/60 hover:bg-neutral-900 cursor-pointer transition-all flex flex-col justify-between gap-4 shadow-lg hover:shadow-purple-950/20"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-3 group-hover:scale-110 transition-transform">
                    <ArrowUpDown className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold font-mono text-white mb-1">
                    Directional D-Pad (Up/Down/Left/Right)
                  </h3>
                  <p className="text-xs font-mono text-neutral-400 leading-relaxed">
                    High-speed visual arrows demanding rapid spatial D-Pad actuation. Tests directional neuromuscular reflexes.
                  </p>
                </div>
                <div className="flex items-center justify-between text-xs font-mono text-purple-400 font-bold pt-3 border-t border-neutral-800/80">
                  <span>SPATIAL REFLEX</span>
                  <span>START →</span>
                </div>
              </div>

              {/* Paradigm 4: Go / No-Go */}
              <div
                onClick={() => handleStartTest('gonogo')}
                className="group p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800 hover:border-rose-500/60 hover:bg-neutral-900 cursor-pointer transition-all flex flex-col justify-between gap-4 shadow-lg hover:shadow-rose-950/20"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-3 group-hover:scale-110 transition-transform">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold font-mono text-white mb-1">
                    Go / No-Go (Inhibitory Control)
                  </h3>
                  <p className="text-xs font-mono text-neutral-400 leading-relaxed">
                    Fire rapidly on Green targets, but withhold response when the Red Skull appears. Tests motor inhibition.
                  </p>
                </div>
                <div className="flex items-center justify-between text-xs font-mono text-rose-400 font-bold pt-3 border-t border-neutral-800/80">
                  <span>MOTOR INHIBITION</span>
                  <span>START →</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Phase 2: Running Active Experiment */}
        {testPhase === 'running' && (
          <ExperimentRunner
            paradigm={paradigm}
            totalTrialsGoal={trialCount}
            onComplete={handleTestComplete}
            gamepadIndex={controllerIndex}
          />
        )}

        {/* Phase 3: Results & Share Card Export */}
        {testPhase === 'results' && completedStats && (
          <ResultsView
            stats={completedStats}
            paradigm={paradigm}
            hardwareName={hardwareName}
            pollingRateHz={pollingRateHz}
            onRestart={handleRestart}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-neutral-900 py-6 px-4 bg-neutral-950">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-neutral-500">
          <div>
            Mnema Psychophysics Lab • Open Source Game Controller Benchmark
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/hvndal/Mnema"
              target="_blank"
              rel="noreferrer"
              className="hover:text-neutral-300 transition-colors underline"
            >
              GitHub Repository
            </a>
            <span>•</span>
            <span>W3C Gamepad API + High-Resolution Timers</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
