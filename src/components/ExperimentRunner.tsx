import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { TestParadigm, TestState, StimulusSignal, SingleTrialResult } from '../types';
import { STANDARD_BUTTON_NAMES, triggerRumble } from '../utils/gamepadConstants';
import { Zap, AlertOctagon, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Skull, ShieldCheck } from 'lucide-react';

interface ExperimentRunnerProps {
  paradigm: TestParadigm;
  totalTrialsGoal: number;
  onComplete: (trials: SingleTrialResult[]) => void;
  gamepadIndex: number;
}

export const ExperimentRunner: React.FC<ExperimentRunnerProps> = ({
  paradigm,
  totalTrialsGoal = 5,
  onComplete,
  gamepadIndex,
}) => {
  const [testState, setTestState] = useState<TestState>('ready');
  const [currentTrialIndex, setCurrentTrialIndex] = useState<number>(0);
  const [stimulus, setStimulus] = useState<StimulusSignal | null>(null);
  const [lastTrialLatency, setLastTrialLatency] = useState<number | null>(null);
  const [faultMessage, setFaultMessage] = useState<string | null>(null);

  const trialsRef = useRef<SingleTrialResult[]>([]);
  const stimulusTimestampRef = useRef<number>(0);
  const foreperiodTimerRef = useRef<number | null>(null);
  const testStateRef = useRef<TestState>('ready');
  testStateRef.current = testState;

  const currentForeperiodMsRef = useRef<number>(0);

  // Stop pending timers on unmount
  useEffect(() => {
    return () => {
      if (foreperiodTimerRef.current) {
        clearTimeout(foreperiodTimerRef.current);
      }
    };
  }, []);

  // Generate stimulus parameters depending on paradigm
  const createStimulusForParadigm = useCallback((mode: TestParadigm): StimulusSignal => {
    if (mode === 'simple') {
      return {
        type: 'simple',
        targetButtonLabel: 'ANY BUTTON',
        targetColor: '#10b981', // Neon green
      };
    }

    if (mode === 'choice_color') {
      // 4 Face buttons: A (0, Green), B (1, Red), X (2, Blue), Y (3, Yellow)
      const choices = [
        { idx: 0, label: 'A (BOTTOM)', color: '#10b981' },
        { idx: 1, label: 'B (RIGHT)', color: '#f43f5e' },
        { idx: 2, label: 'X (LEFT)', color: '#3b82f6' },
        { idx: 3, label: 'Y (TOP)', color: '#eab308' },
      ];
      const selected = choices[Math.floor(Math.random() * choices.length)];
      return {
        type: 'choice_color',
        targetButtonIndex: selected.idx,
        targetButtonLabel: selected.label,
        targetColor: selected.color,
      };
    }

    if (mode === 'choice_dpad') {
      // D-Pad: Up (12), Down (13), Left (14), Right (15)
      const dpadChoices = [
        { idx: 12, label: 'D-PAD UP', color: '#c084fc' },
        { idx: 13, label: 'D-PAD DOWN', color: '#c084fc' },
        { idx: 14, label: 'D-PAD LEFT', color: '#c084fc' },
        { idx: 15, label: 'D-PAD RIGHT', color: '#c084fc' },
      ];
      const selected = dpadChoices[Math.floor(Math.random() * dpadChoices.length)];
      return {
        type: 'choice_dpad',
        targetButtonIndex: selected.idx,
        targetButtonLabel: selected.label,
        targetColor: selected.color,
      };
    }

    // Go / No-Go (80% Go = Green A, 20% No-Go = Red Skull)
    const isNogo = Math.random() < 0.25;
    return {
      type: 'gonogo',
      targetButtonIndex: 0, // A button
      targetButtonLabel: isNogo ? 'DO NOT PRESS' : 'PRESS A NOW',
      targetColor: isNogo ? '#f43f5e' : '#10b981',
      isNogo,
    };
  }, []);

  // Arm and start next trial
  const armNextTrial = useCallback(() => {
    setFaultMessage(null);
    setStimulus(null);
    setTestState('waiting');

    // Unpredictable foreperiod delay between 1500ms and 4200ms
    const foreperiod = Math.floor(1500 + Math.random() * 2700);
    currentForeperiodMsRef.current = foreperiod;

    foreperiodTimerRef.current = window.setTimeout(() => {
      const stim = createStimulusForParadigm(paradigm);
      setStimulus(stim);
      stimulusTimestampRef.current = performance.now();
      setTestState('stimulus');

      // For Go/No-go: if it's a No-go trial, user must withhold for 1100ms
      if (stim.isNogo) {
        foreperiodTimerRef.current = window.setTimeout(() => {
          // Successfully withheld!
          recordTrialSuccess(0, stim, true);
        }, 1100);
      }
    }, foreperiod);
  }, [paradigm, createStimulusForParadigm]);

  const recordTrialSuccess = (reactionMs: number, stim: StimulusSignal, nogoSuccess: boolean = false) => {
    const newTrial: SingleTrialResult = {
      trialNumber: currentTrialIndex + 1,
      paradigm,
      reactionTimeMs: nogoSuccess ? 0 : Math.round(reactionMs * 10) / 10,
      fault: false,
      targetLabel: stim.targetButtonLabel,
      foreperiodMs: currentForeperiodMsRef.current,
      timestamp: performance.now(),
    };

    trialsRef.current.push(newTrial);
    setLastTrialLatency(newTrial.reactionTimeMs);
    setTestState('trial_result');

    const nextIndex = currentTrialIndex + 1;
    setCurrentTrialIndex(nextIndex);

    // Subtle vibration on hit
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    triggerRumble(gamepads[gamepadIndex] || null, 50, 0.3, 0.3);

    if (nextIndex >= totalTrialsGoal) {
      setTimeout(() => {
        onComplete(trialsRef.current);
      }, 700);
    } else {
      setTimeout(() => {
        armNextTrial();
      }, 1000);
    }
  };

  const recordFault = (reason: 'early_press' | 'wrong_button' | 'nogo_fail', message: string, pressedBtn?: string) => {
    if (foreperiodTimerRef.current) {
      clearTimeout(foreperiodTimerRef.current);
    }

    const newTrial: SingleTrialResult = {
      trialNumber: currentTrialIndex + 1,
      paradigm,
      reactionTimeMs: 0,
      fault: true,
      faultReason: reason,
      targetLabel: stimulus?.targetButtonLabel || 'WAITING STIMULUS',
      buttonPressedLabel: pressedBtn,
      foreperiodMs: currentForeperiodMsRef.current,
      timestamp: performance.now(),
    };

    trialsRef.current.push(newTrial);
    setFaultMessage(message);
    setTestState(reason === 'early_press' ? 'early_fault' : 'wrong_input');

    // Harder vibration on error
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    triggerRumble(gamepads[gamepadIndex] || null, 150, 0.9, 0.9);

    const nextIndex = currentTrialIndex + 1;
    setCurrentTrialIndex(nextIndex);

    if (nextIndex >= totalTrialsGoal) {
      setTimeout(() => {
        onComplete(trialsRef.current);
      }, 1100);
    } else {
      setTimeout(() => {
        armNextTrial();
      }, 1400);
    }
  };

  // Dedicated microsecond Gamepad polling loop for the active trial
  const prevButtonsRef = useRef<boolean[]>([]);
  useEffect(() => {
    let animId: number;

    const loop = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const pad = gamepads[gamepadIndex] || (gamepads.find(g => g !== null) ?? null);

      if (pad) {
        const now = performance.now();
        const prev = prevButtonsRef.current;

        for (let i = 0; i < pad.buttons.length; i++) {
          const btn = pad.buttons[i];
          const isPressed = btn.pressed || btn.value > 0.45;
          const wasPressed = !!prev[i];

          // Rising edge detected
          if (isPressed && !wasPressed) {
            handleInputPress(i, now);
            break;
          }
        }

        prevButtonsRef.current = pad.buttons.map(b => b.pressed || b.value > 0.45);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gamepadIndex, stimulus, testState]);

  // Handle keyboard fallback for development/testing if no gamepad handy
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const now = performance.now();
      
      // Map common keys to buttons: Space/Enter = A (0), ArrowUp=12, ArrowDown=13, ArrowLeft=14, ArrowRight=15
      if (e.code === 'Space' || e.code === 'Enter') {
        handleInputPress(0, now);
      } else if (e.code === 'ArrowUp') {
        handleInputPress(12, now);
      } else if (e.code === 'ArrowDown') {
        handleInputPress(13, now);
      } else if (e.code === 'ArrowLeft') {
        handleInputPress(14, now);
      } else if (e.code === 'ArrowRight') {
        handleInputPress(15, now);
      } else if (e.key === 'a' || e.key === 'A') {
        handleInputPress(0, now);
      } else if (e.key === 'b' || e.key === 'B') {
        handleInputPress(1, now);
      } else if (e.key === 'x' || e.key === 'X') {
        handleInputPress(2, now);
      } else if (e.key === 'y' || e.key === 'Y') {
        handleInputPress(3, now);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stimulus, testState]);

  const handleInputPress = (buttonIdx: number, inputTime: number) => {
    const state = testStateRef.current;
    const btnLabel = STANDARD_BUTTON_NAMES[buttonIdx] || `Button ${buttonIdx}`;

    if (state === 'ready') {
      // Any button press starts the trial series
      armNextTrial();
      return;
    }

    if (state === 'waiting') {
      // EARLY PRESS / FALSE START
      recordFault('early_press', 'FALSE START! Pressed before stimulus appeared.', btnLabel);
      return;
    }

    if (state === 'stimulus' && stimulus) {
      const latency = inputTime - stimulusTimestampRef.current;

      // Simple Reaction Time: Any button counts
      if (stimulus.type === 'simple') {
        recordTrialSuccess(latency, stimulus);
        return;
      }

      // Choice Reaction Time: Must match target button index
      if (stimulus.type === 'choice_color' || stimulus.type === 'choice_dpad') {
        if (stimulus.targetButtonIndex === buttonIdx) {
          recordTrialSuccess(latency, stimulus);
        } else {
          recordFault(
            'wrong_button',
            `WRONG BUTTON! Expected [${stimulus.targetButtonLabel}], but pressed [${btnLabel}]`,
            btnLabel
          );
        }
        return;
      }

      // Go / No-Go
      if (stimulus.type === 'gonogo') {
        if (stimulus.isNogo) {
          // Pressed on No-Go stimulus!
          recordFault('nogo_fail', 'INHIBITION FAULT! Pressed on a NO-GO trigger.', btnLabel);
        } else {
          recordTrialSuccess(latency, stimulus);
        }
        return;
      }
    }
  };

  return (
    <div className="w-full max-w-4xl flex flex-col items-center">
      {/* Trial Progress Bar */}
      <div className="w-full mb-4 flex items-center justify-between text-xs font-mono text-neutral-400">
        <span className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-rose-500" />
          TRIAL {Math.min(currentTrialIndex + 1, totalTrialsGoal)} OF {totalTrialsGoal}
        </span>
        <div className="flex gap-1.5">
          {Array.from({ length: totalTrialsGoal }).map((_, i) => (
            <div
              key={i}
              className={`w-6 h-2 rounded-full transition-all ${
                i < currentTrialIndex 
                  ? 'bg-rose-500' 
                  : i === currentTrialIndex 
                  ? 'bg-neutral-200 animate-pulse' 
                  : 'bg-neutral-800'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Primary Visual Arena */}
      <div
        className={`w-full min-h-[360px] sm:min-h-[420px] rounded-2xl flex flex-col items-center justify-center p-8 transition-all duration-75 relative select-none border ${
          testState === 'ready'
            ? 'bg-neutral-900 border-neutral-800 text-neutral-100'
            : testState === 'waiting'
            ? 'bg-neutral-950 border-neutral-800 text-neutral-400'
            : testState === 'stimulus'
            ? 'bg-emerald-950/90 border-emerald-500 text-white shadow-[0_0_80px_rgba(16,185,129,0.3)]'
            : testState === 'early_fault' || testState === 'wrong_input'
            ? 'bg-rose-950/90 border-rose-500 text-white shadow-[0_0_80px_rgba(244,63,94,0.4)]'
            : 'bg-neutral-900 border-neutral-700 text-neutral-100'
        }`}
      >
        {/* State: Ready */}
        {testState === 'ready' && (
          <div className="flex flex-col items-center text-center gap-4 animate-in fade-in">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-2">
              <Zap className="w-8 h-8" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-white">
              TRIGGER READY
            </h2>
            <p className="text-sm font-mono text-neutral-400 max-w-md">
              Rest thumb on controller. Press <strong className="text-rose-400">ANY BUTTON</strong> on the EvoFox to begin trial sequence.
            </p>
            <div className="px-4 py-2 rounded-lg bg-neutral-950 border border-neutral-800 font-mono text-xs text-neutral-400 mt-2">
              Unpredictable delays prevent rhythm guessing • Anti-cheat edge detection
            </div>
          </div>
        )}

        {/* State: Waiting (Foreperiod jitter) */}
        {testState === 'waiting' && (
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-full border-2 border-neutral-700 border-t-rose-500 animate-spin mb-2" />
            <span className="text-xl sm:text-2xl font-mono font-bold text-neutral-300 tracking-wider">
              HOLD... DO NOT PRESS
            </span>
            <span className="text-xs font-mono text-neutral-500">
              Anticipation filter active. Early press will incur a fault.
            </span>
          </div>
        )}

        {/* State: Stimulus Display */}
        {testState === 'stimulus' && stimulus && (
          <div className="flex flex-col items-center text-center gap-6 animate-in zoom-in-90 duration-75">
            {stimulus.type === 'simple' && (
              <>
                <div className="w-28 h-28 rounded-full bg-emerald-500 flex items-center justify-center text-neutral-950 shadow-[0_0_50px_rgba(16,185,129,0.8)] animate-ping-once">
                  <Zap className="w-16 h-16 fill-neutral-950" />
                </div>
                <div className="text-4xl sm:text-6xl font-black font-mono tracking-tight text-emerald-300">
                  FIRE NOW!
                </div>
              </>
            )}

            {stimulus.type === 'choice_color' && (
              <>
                <div 
                  style={{ backgroundColor: stimulus.targetColor }}
                  className="w-28 h-28 rounded-2xl flex items-center justify-center text-neutral-950 font-black font-mono text-4xl shadow-2xl"
                >
                  {stimulus.targetButtonLabel.charAt(0)}
                </div>
                <div className="text-3xl sm:text-5xl font-black font-mono tracking-tight">
                  PRESS {stimulus.targetButtonLabel}
                </div>
              </>
            )}

            {stimulus.type === 'choice_dpad' && (
              <>
                <div className="w-28 h-28 rounded-2xl bg-purple-600 flex items-center justify-center text-white shadow-2xl">
                  {stimulus.targetButtonIndex === 12 && <ArrowUp className="w-16 h-16" />}
                  {stimulus.targetButtonIndex === 13 && <ArrowDown className="w-16 h-16" />}
                  {stimulus.targetButtonIndex === 14 && <ArrowLeft className="w-16 h-16" />}
                  {stimulus.targetButtonIndex === 15 && <ArrowRight className="w-16 h-16" />}
                </div>
                <div className="text-3xl sm:text-5xl font-black font-mono tracking-tight">
                  {stimulus.targetButtonLabel}
                </div>
              </>
            )}

            {stimulus.type === 'gonogo' && (
              <>
                {stimulus.isNogo ? (
                  <>
                    <div className="w-28 h-28 rounded-full bg-rose-600 flex items-center justify-center text-white shadow-[0_0_60px_rgba(244,63,94,0.8)]">
                      <Skull className="w-16 h-16" />
                    </div>
                    <div className="text-4xl sm:text-6xl font-black font-mono tracking-tight text-rose-300">
                      HOLD! NO-GO!
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-28 h-28 rounded-full bg-emerald-500 flex items-center justify-center text-neutral-950 shadow-[0_0_50px_rgba(16,185,129,0.8)]">
                      <ShieldCheck className="w-16 h-16" />
                    </div>
                    <div className="text-4xl sm:text-6xl font-black font-mono tracking-tight text-emerald-300">
                      PRESS A NOW!
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* State: Fault display */}
        {(testState === 'early_fault' || testState === 'wrong_input') && (
          <div className="flex flex-col items-center text-center gap-4 animate-in shake duration-200">
            <div className="w-16 h-16 rounded-full bg-rose-500/20 border border-rose-500 flex items-center justify-center text-rose-400">
              <AlertOctagon className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-black font-mono text-rose-300 tracking-tight">
              TRIAL FAULT RECORDED
            </h3>
            <p className="text-sm font-mono text-rose-200 max-w-md">
              {faultMessage}
            </p>
          </div>
        )}

        {/* State: Single trial result pause */}
        {testState === 'trial_result' && (
          <div className="flex flex-col items-center text-center gap-3 animate-in zoom-in-95">
            <span className="text-xs font-mono text-neutral-400 uppercase tracking-widest">
              TRIAL {currentTrialIndex} RECORDED
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-6xl sm:text-7xl font-extrabold font-mono text-emerald-400">
                {lastTrialLatency !== null && lastTrialLatency > 0 ? lastTrialLatency : 'WITHHELD'}
              </span>
              {lastTrialLatency !== null && lastTrialLatency > 0 && (
                <span className="text-2xl font-mono text-emerald-500 font-bold">ms</span>
              )}
            </div>
            <span className="text-xs font-mono text-neutral-500">Preparing next trial...</span>
          </div>
        )}
      </div>
    </div>
  );
};
