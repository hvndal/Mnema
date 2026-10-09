import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { RawGamepadState } from '../types/telemetry';
import type {
  ExperimentMode,
  TrialPhase,
  TrialOutcome,
  RawTrialRecord,
  ReactionExperimentStats,
} from '../types/experiment';
import { calculateExperimentStats } from '../utils/experimentStats';
import { exportExperimentJSON, exportExperimentCSV } from '../utils/experimentExport';

interface ReactionLabProps {
  controller: RawGamepadState | null;
  browserRenderHz: number;
}

const TIMEOUT_LIMIT_MS = 1500; // Documented timeout for missed responses
const SCORED_TRIALS_TOTAL = 20; // 20 scored trials per requirement
const PRACTICE_TRIALS_TOTAL = 3; // 3 practice trials

export const ReactionLab: React.FC<ReactionLabProps> = ({ controller, browserRenderHz }) => {
  // Mode selection
  const [mode, setMode] = useState<ExperimentMode>('simple');
  const [phase, setPhase] = useState<TrialPhase>('idle');
  const [sessionId, setSessionId] = useState<string>(() => `session-${Date.now()}`);

  // Button verification state
  const [testedButtons, setTestedButtons] = useState<Record<number, boolean>>({});

  // Trial progression
  const [currentTrialNumber, setCurrentTrialNumber] = useState<number>(0);
  const [isPractice, setIsPractice] = useState<boolean>(true);
  const [currentStimulus, setCurrentStimulus] = useState<{
    type: string;
    targetButtonIndex: number | null;
    targetButtonLabel: string;
    displaySide: 'center' | 'left' | 'right';
    isNoGo: boolean;
  } | null>(null);

  // Active trial state feedback
  const [lastOutcome, setLastOutcome] = useState<{
    outcome: TrialOutcome;
    latencyMs: number | null;
    message: string;
  } | null>(null);

  // Completed results
  const [experimentSummary, setExperimentSummary] = useState<ReactionExperimentStats | null>(null);

  // Trial records storage
  const trialsHistoryRef = useRef<RawTrialRecord[]>([]);

  // Timers and precision timestamps
  const stimulusOnsetRef = useRef<number>(0);
  const foreperiodTimerRef = useRef<number | null>(null);
  const timeoutTimerRef = useRef<number | null>(null);
  const currentForeperiodMsRef = useRef<number>(0);
  const trialPhaseRef = useRef<TrialPhase>('idle');
  trialPhaseRef.current = phase;

  // Track button transitions specifically in the experiment loop (rising edges)
  const prevButtonsRef = useRef<boolean[]>([]);
  const hasRespondedThisTrialRef = useRef<boolean>(false);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (foreperiodTimerRef.current) clearTimeout(foreperiodTimerRef.current);
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
    };
  }, []);

  // Monitor visibility interruptions to pause and invalidate trial if hidden
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && (trialPhaseRef.current === 'foreperiod_delay' || trialPhaseRef.current === 'stimulus_active')) {
        // Clear active timers
        if (foreperiodTimerRef.current) clearTimeout(foreperiodTimerRef.current);
        if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);

        // Invalidate active trial
        const invalidatedTrial: RawTrialRecord = {
          sessionId,
          protocolVersion: '2.1-controller-psychophysics',
          experimentMode: mode,
          isPractice,
          trialNumber: currentTrialNumber + 1,
          stimulusType: currentStimulus?.type || 'INTERRUPTED',
          targetButtonIndex: currentStimulus?.targetButtonIndex ?? null,
          targetButtonLabel: currentStimulus?.targetButtonLabel || 'N/A',
          foreperiodDurationMs: currentForeperiodMsRef.current,
          stimulusOnsetTimestamp: stimulusOnsetRef.current,
          responseTimestamp: null,
          responseTimeMs: null,
          buttonPressedIndex: null,
          buttonPressedLabel: null,
          outcome: 'invalidated',
          isValid: false,
          invalidationReason: 'Browser tab became hidden / window lost focus',
        };

        trialsHistoryRef.current.push(invalidatedTrial);
        setPhase('paused_hidden');
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [sessionId, mode, isPractice, currentTrialNumber, currentStimulus]);

  // Button mapping specifications for each mode
  const getRequiredButtonsForMode = useCallback((m: ExperimentMode): { index: number; label: string; role: string }[] => {
    switch (m) {
      case 'simple':
        return [{ index: 0, label: 'Button [0]', role: 'Primary Reaction Button (Bottom Face / A)' }];
      case 'choice':
        return [
          { index: 4, label: 'Button [4]', role: 'Left Stimulus (Left Bumper / LB)' },
          { index: 5, label: 'Button [5]', role: 'Right Stimulus (Right Bumper / RB)' },
        ];
      case 'gonogo':
        return [{ index: 0, label: 'Button [0]', role: 'Go Trigger Button (Bottom Face / A)' }];
    }
  }, []);

  // Arm and schedule next trial
  const scheduleNextTrial = useCallback((_trialIdx: number, _practiceMode: boolean) => {
    hasRespondedThisTrialRef.current = false;
    setLastOutcome(null);
    setCurrentStimulus(null);
    setPhase('foreperiod_delay');

    // Random foreperiod delay between 1,600ms and 3,800ms to eliminate anticipation
    const foreperiod = Math.floor(1600 + Math.random() * 2200);
    currentForeperiodMsRef.current = foreperiod;

    foreperiodTimerRef.current = window.setTimeout(() => {
      // Formulate stimulus parameters
      let stimType = 'SIMPLE_FLASH';
      let targetIdx: number | null = 0;
      let targetLbl = 'Button [0]';
      let displaySide: 'center' | 'left' | 'right' = 'center';
      let isNoGo = false;

      if (mode === 'simple') {
        stimType = 'SIMPLE_GO';
        targetIdx = 0;
        targetLbl = 'Button [0]';
        displaySide = 'center';
      } else if (mode === 'choice') {
        const isLeft = Math.random() < 0.5;
        if (isLeft) {
          stimType = 'CHOICE_LEFT';
          targetIdx = 4; // Left bumper
          targetLbl = 'Button [4] (LEFT)';
          displaySide = 'left';
        } else {
          stimType = 'CHOICE_RIGHT';
          targetIdx = 5; // Right bumper
          targetLbl = 'Button [5] (RIGHT)';
          displaySide = 'right';
        }
      } else if (mode === 'gonogo') {
        // 75% Go, 25% No-Go
        isNoGo = Math.random() < 0.25;
        if (isNoGo) {
          stimType = 'NOGO_STOP';
          targetIdx = null;
          targetLbl = 'WITHHOLD (NO-GO)';
          displaySide = 'center';
        } else {
          stimType = 'GO_TARGET';
          targetIdx = 0;
          targetLbl = 'Button [0] (GO)';
          displaySide = 'center';
        }
      }

      setCurrentStimulus({
        type: stimType,
        targetButtonIndex: targetIdx,
        targetButtonLabel: targetLbl,
        displaySide,
        isNoGo,
      });

      stimulusOnsetRef.current = performance.now();
      setPhase('stimulus_active');

      // Schedule omission timeout limit
      timeoutTimerRef.current = window.setTimeout(() => {
        if (!hasRespondedThisTrialRef.current) {
          handleTrialTimeout(isNoGo, stimType, targetIdx, targetLbl);
        }
      }, TIMEOUT_LIMIT_MS);
    }, foreperiod);
  }, [mode]);

  // Timeout handler
  const handleTrialTimeout = (
    isNoGo: boolean,
    stimType: string,
    targetIdx: number | null,
    targetLbl: string
  ) => {
    hasRespondedThisTrialRef.current = true;
    const now = performance.now();

    if (isNoGo) {
      // Successfully withheld response on No-Go trial!
      recordTrialResult({
        stimulusType: stimType,
        targetButtonIndex: targetIdx,
        targetButtonLabel: targetLbl,
        stimulusOnset: stimulusOnsetRef.current,
        responseTimestamp: null,
        reactionTimeMs: null,
        buttonPressedIndex: null,
        buttonPressedLabel: null,
        outcome: 'correct_withhold',
        isValid: true,
        invalidationReason: null,
        feedbackMsg: 'CORRECT WITHHOLD (NO-GO)',
      });
    } else {
      // Missed response on Go/Choice trial
      recordTrialResult({
        stimulusType: stimType,
        targetButtonIndex: targetIdx,
        targetButtonLabel: targetLbl,
        stimulusOnset: stimulusOnsetRef.current,
        responseTimestamp: now,
        reactionTimeMs: null,
        buttonPressedIndex: null,
        buttonPressedLabel: null,
        outcome: 'omission_timeout',
        isValid: false,
        invalidationReason: `Exceeded timeout limit of ${TIMEOUT_LIMIT_MS} ms`,
        feedbackMsg: `TIMEOUT: Missed stimulus (> ${TIMEOUT_LIMIT_MS}ms)`,
      });
    }
  };

  // Record trial record and transition to next
  const recordTrialResult = (data: {
    stimulusType: string;
    targetButtonIndex: number | null;
    targetButtonLabel: string;
    stimulusOnset: number;
    responseTimestamp: number | null;
    reactionTimeMs: number | null;
    buttonPressedIndex: number | null;
    buttonPressedLabel: string | null;
    outcome: TrialOutcome;
    isValid: boolean;
    invalidationReason: string | null;
    feedbackMsg: string;
  }) => {
    if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
    if (foreperiodTimerRef.current) clearTimeout(foreperiodTimerRef.current);

    const record: RawTrialRecord = {
      sessionId,
      protocolVersion: '2.1-controller-psychophysics',
      experimentMode: mode,
      isPractice,
      trialNumber: currentTrialNumber + 1,
      stimulusType: data.stimulusType,
      targetButtonIndex: data.targetButtonIndex,
      targetButtonLabel: data.targetButtonLabel,
      foreperiodDurationMs: currentForeperiodMsRef.current,
      stimulusOnsetTimestamp: data.stimulusOnset,
      responseTimestamp: data.responseTimestamp,
      responseTimeMs: data.reactionTimeMs ? Math.round(data.reactionTimeMs * 100) / 100 : null,
      buttonPressedIndex: data.buttonPressedIndex,
      buttonPressedLabel: data.buttonPressedLabel,
      outcome: data.outcome,
      isValid: data.isValid,
      invalidationReason: data.invalidationReason,
    };

    trialsHistoryRef.current.push(record);
    setLastOutcome({
      outcome: data.outcome,
      latencyMs: record.responseTimeMs,
      message: data.feedbackMsg,
    });
    setPhase('trial_feedback');

    const nextTrial = currentTrialNumber + 1;
    setCurrentTrialNumber(nextTrial);

    const limit = isPractice ? PRACTICE_TRIALS_TOTAL : SCORED_TRIALS_TOTAL;

    window.setTimeout(() => {
      if (nextTrial >= limit) {
        if (isPractice) {
          // Finished practice -> prompt scored test
          setIsPractice(false);
          setCurrentTrialNumber(0);
          setPhase('practice_intro');
        } else {
          // Finished full experiment!
          const stats = calculateExperimentStats(trialsHistoryRef.current, sessionId, mode);
          setExperimentSummary(stats);
          setPhase('summary');

          // Persist session to local history
          import('../utils/sessionStorage').then(({ saveSession }) => {
            saveSession({
              id: sessionId,
              timestamp: new Date().toISOString(),
              experimentType: 'reaction',
              protocolVersion: stats.protocolVersion,
              hardwareName: controller ? (controller.id.includes('EvoFox') ? 'EvoFox One S' : controller.id.slice(0, 24)) : 'Standard Gamepad',
              controllerId: controller?.id || null,
              settingsSummary: { mode },
              sampleCount: stats.validHitsCount,
              hasInterruptedTrials: trialsHistoryRef.current.some(t => !t.isValid),
              dataQualityWarnings: stats.prematureCount > 3 ? ['High rate of premature anticipations recorded'] : [],
              reactionStats: stats,
              rawReactionTrials: trialsHistoryRef.current,
            }).catch(console.error);
          });
        }
      } else {
        scheduleNextTrial(nextTrial, isPractice);
      }
    }, 1200);
  };

  // Controller edge polling during active experiment
  useEffect(() => {
    if (!controller) return;

    const currentButtons = controller.buttons;
    const prev = prevButtonsRef.current;
    const now = performance.now();

    currentButtons.forEach((btn, idx) => {
      const isDown = btn.pressed || btn.value > 0.45;
      const wasDown = !!prev[idx];

      // Detect rising edge (button pressed this frame)
      if (isDown && !wasDown) {
        handleButtonPress(idx, btn.value, now);
      }
    });

    prevButtonsRef.current = currentButtons.map(b => b.pressed || b.value > 0.45);
  }, [controller]);

  // Handle rising edge button input based on phase
  const handleButtonPress = (btnIndex: number, _btnVal: number, inputTime: number) => {
    // 1. Button verification phase
    if (phase === 'verification') {
      setTestedButtons(prev => ({ ...prev, [btnIndex]: true }));
      return;
    }

    // 2. Foreperiod delay -> PREMATURE FALSE START
    if (phase === 'foreperiod_delay') {
      if (foreperiodTimerRef.current) clearTimeout(foreperiodTimerRef.current);
      recordTrialResult({
        stimulusType: 'PREMATURE_FAULT',
        targetButtonIndex: mode === 'choice' ? null : 0,
        targetButtonLabel: 'Foreperiod Delay Active',
        stimulusOnset: 0,
        responseTimestamp: inputTime,
        reactionTimeMs: null,
        buttonPressedIndex: btnIndex,
        buttonPressedLabel: `Button [${btnIndex}]`,
        outcome: 'premature',
        isValid: false,
        invalidationReason: 'False start: Button pressed prior to visual stimulus onset',
        feedbackMsg: 'FALSE START! Pressed before stimulus appeared.',
      });
      return;
    }

    // 3. Active stimulus -> Measure reaction time
    if (phase === 'stimulus_active' && currentStimulus && !hasRespondedThisTrialRef.current) {
      hasRespondedThisTrialRef.current = true;
      const latency = inputTime - stimulusOnsetRef.current;

      // Handle Simple Reaction Time
      if (mode === 'simple') {
        if (btnIndex === 0) {
          recordTrialResult({
            stimulusType: currentStimulus.type,
            targetButtonIndex: 0,
            targetButtonLabel: 'Button [0]',
            stimulusOnset: stimulusOnsetRef.current,
            responseTimestamp: inputTime,
            reactionTimeMs: latency,
            buttonPressedIndex: btnIndex,
            buttonPressedLabel: `Button [${btnIndex}]`,
            outcome: 'correct_hit',
            isValid: true,
            invalidationReason: null,
            feedbackMsg: `HIT: ${latency.toFixed(1)} ms`,
          });
        } else {
          recordTrialResult({
            stimulusType: currentStimulus.type,
            targetButtonIndex: 0,
            targetButtonLabel: 'Button [0]',
            stimulusOnset: stimulusOnsetRef.current,
            responseTimestamp: inputTime,
            reactionTimeMs: latency,
            buttonPressedIndex: btnIndex,
            buttonPressedLabel: `Button [${btnIndex}]`,
            outcome: 'incorrect_choice',
            isValid: false,
            invalidationReason: `Expected designated Button [0], received Button [${btnIndex}]`,
            feedbackMsg: `WRONG BUTTON: Pressed Button [${btnIndex}], expected Button [0]`,
          });
        }
        return;
      }

      // Handle Choice Reaction Time
      if (mode === 'choice') {
        if (btnIndex === currentStimulus.targetButtonIndex) {
          recordTrialResult({
            stimulusType: currentStimulus.type,
            targetButtonIndex: currentStimulus.targetButtonIndex,
            targetButtonLabel: currentStimulus.targetButtonLabel,
            stimulusOnset: stimulusOnsetRef.current,
            responseTimestamp: inputTime,
            reactionTimeMs: latency,
            buttonPressedIndex: btnIndex,
            buttonPressedLabel: `Button [${btnIndex}]`,
            outcome: 'correct_hit',
            isValid: true,
            invalidationReason: null,
            feedbackMsg: `CORRECT CHOICE: ${latency.toFixed(1)} ms`,
          });
        } else {
          recordTrialResult({
            stimulusType: currentStimulus.type,
            targetButtonIndex: currentStimulus.targetButtonIndex,
            targetButtonLabel: currentStimulus.targetButtonLabel,
            stimulusOnset: stimulusOnsetRef.current,
            responseTimestamp: inputTime,
            reactionTimeMs: latency,
            buttonPressedIndex: btnIndex,
            buttonPressedLabel: `Button [${btnIndex}]`,
            outcome: 'incorrect_choice',
            isValid: false,
            invalidationReason: `Incorrect choice: Pressed Button [${btnIndex}], target was ${currentStimulus.targetButtonLabel}`,
            feedbackMsg: `INCORRECT CHOICE! Expected ${currentStimulus.targetButtonLabel}`,
          });
        }
        return;
      }

      // Handle Go / No-Go
      if (mode === 'gonogo') {
        if (currentStimulus.isNoGo) {
          // Pressed on No-Go target!
          recordTrialResult({
            stimulusType: currentStimulus.type,
            targetButtonIndex: null,
            targetButtonLabel: 'NO-GO WITHHOLD',
            stimulusOnset: stimulusOnsetRef.current,
            responseTimestamp: inputTime,
            reactionTimeMs: latency,
            buttonPressedIndex: btnIndex,
            buttonPressedLabel: `Button [${btnIndex}]`,
            outcome: 'false_alarm',
            isValid: false,
            invalidationReason: 'Inhibition failure: Responded on No-Go stimulus',
            feedbackMsg: 'FALSE ALARM! Responded on a NO-GO stimulus.',
          });
        } else {
          // Go target hit
          if (btnIndex === 0) {
            recordTrialResult({
              stimulusType: currentStimulus.type,
              targetButtonIndex: 0,
              targetButtonLabel: 'Button [0]',
              stimulusOnset: stimulusOnsetRef.current,
              responseTimestamp: inputTime,
              reactionTimeMs: latency,
              buttonPressedIndex: btnIndex,
              buttonPressedLabel: `Button [${btnIndex}]`,
              outcome: 'correct_hit',
              isValid: true,
              invalidationReason: null,
              feedbackMsg: `GO HIT: ${latency.toFixed(1)} ms`,
            });
          } else {
            recordTrialResult({
              stimulusType: currentStimulus.type,
              targetButtonIndex: 0,
              targetButtonLabel: 'Button [0]',
              stimulusOnset: stimulusOnsetRef.current,
              responseTimestamp: inputTime,
              reactionTimeMs: latency,
              buttonPressedIndex: btnIndex,
              buttonPressedLabel: `Button [${btnIndex}]`,
              outcome: 'incorrect_choice',
              isValid: false,
              invalidationReason: `Pressed Button [${btnIndex}], expected Button [0]`,
              feedbackMsg: `WRONG BUTTON: Pressed Button [${btnIndex}]`,
            });
          }
        }
        return;
      }
    }
  };

  // Keyboard accessibility / fallback testing
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const now = performance.now();
      if (e.code === 'Space' || e.code === 'Enter') {
        handleButtonPress(0, 1.0, now);
      } else if (e.key === 'q' || e.key === 'Q' || e.code === 'KeyQ') {
        handleButtonPress(4, 1.0, now); // Left bumper equivalent
      } else if (e.key === 'e' || e.key === 'E' || e.code === 'KeyE') {
        handleButtonPress(5, 1.0, now); // Right bumper equivalent
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [phase, currentStimulus]);

  // Restart / Reset
  const handleReset = () => {
    if (foreperiodTimerRef.current) clearTimeout(foreperiodTimerRef.current);
    if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
    setSessionId(`session-${Date.now()}`);
    trialsHistoryRef.current = [];
    setExperimentSummary(null);
    setCurrentTrialNumber(0);
    setIsPractice(true);
    setPhase('idle');
  };

  const requiredButtons = getRequiredButtonsForMode(mode);
  const allVerified = requiredButtons.every(b => testedButtons[b.index]);

  return (
    <div className="w-full flex flex-col gap-6 font-mono text-neutral-200">
      {/* Paradigm Selector Bar */}
      <div className="border border-neutral-800 bg-neutral-900/90 p-3 rounded-lg flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-neutral-500 font-bold uppercase">REACTION PARADIGM:</span>
          {(['simple', 'choice', 'gonogo'] as ExperimentMode[]).map(m => (
            <button
              key={m}
              disabled={phase !== 'idle' && phase !== 'summary'}
              onClick={() => {
                setMode(m);
                setTestedButtons({});
                handleReset();
              }}
              className={`px-3 py-1 rounded border text-xs font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                mode === m
                  ? 'bg-neutral-200 text-neutral-950 border-white'
                  : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
              }`}
            >
              {m === 'simple' ? 'SIMPLE SRT' : m === 'choice' ? 'CHOICE CRT' : 'GO / NO-GO'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="text-neutral-500">PROTOCOL:</span>
          <span className="text-neutral-300 font-bold">v2.1 Psychophysics</span>
          <span className="text-neutral-600">|</span>
          <span className="text-neutral-500">RENDER:</span>
          <span className="text-emerald-400 font-bold">{browserRenderHz} FPS</span>
        </div>
      </div>

      {/* Main Experiment Arena */}
      <div className="border border-neutral-800 bg-neutral-900/70 p-6 rounded-lg flex flex-col gap-6 min-h-[460px] justify-between">
        {/* Phase: IDLE / INSTRUCTIONS */}
        {phase === 'idle' && (
          <div className="flex flex-col gap-5 max-w-2xl">
            <h2 className="text-lg font-bold text-white tracking-wide">
              {mode === 'simple' && 'SIMPLE REACTION-TIME TEST (SRT)'}
              {mode === 'choice' && '2-CHOICE REACTION-TIME TEST (LEFT VS RIGHT)'}
              {mode === 'gonogo' && 'GO / NO-GO INHIBITORY CONTROL TEST'}
            </h2>

            <div className="text-xs text-neutral-300 space-y-2 leading-relaxed bg-neutral-950 p-4 border border-neutral-800 rounded">
              {mode === 'simple' && (
                <>
                  <p>• <strong>Objective:</strong> Measure elapsed time from visual onset until button actuation.</p>
                  <p>• <strong>Target Button:</strong> Actuate designated <strong>Button [0]</strong> (Bottom Face button / A) as soon as the green target appears.</p>
                  <p>• <strong>Anti-Anticipation:</strong> Waiting interval is randomized (1,600ms – 3,800ms). Premature presses before stimulus onset are recorded as false starts.</p>
                  <p>• <strong>Test Plan:</strong> 3 practice trials (unscored) followed by 20 scored trials.</p>
                </>
              )}
              {mode === 'choice' && (
                <>
                  <p>• <strong>Objective:</strong> Measure cognitive discrimination latency between spatial stimuli.</p>
                  <p>• <strong>Target Buttons:</strong> Left stimulus requires <strong>Button [4]</strong> (LB). Right stimulus requires <strong>Button [5]</strong> (RB).</p>
                  <p>• <strong>Metrics Tracked:</strong> Correct latency, decision accuracy, incorrect button selection, and missed responses.</p>
                  <p>• <strong>Test Plan:</strong> 3 practice trials (unscored) followed by 20 scored trials.</p>
                </>
              )}
              {mode === 'gonogo' && (
                <>
                  <p>• <strong>Objective:</strong> Measure motor inhibition control under frequent response priming.</p>
                  <p>• <strong>Rules:</strong> Rapidly press <strong>Button [0]</strong> on Green GO targets (~75% frequency). Completely withhold and do not press on Red NO-GO stimuli (~25% frequency).</p>
                  <p>• <strong>Errors Tracked:</strong> False alarms (commission errors on No-Go) and omissions (missed Go targets).</p>
                  <p>• <strong>Test Plan:</strong> 3 practice trials (unscored) followed by 20 scored trials.</p>
                </>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setPhase('verification')}
                className="px-4 py-2 bg-neutral-200 text-neutral-950 font-bold text-xs rounded hover:bg-white cursor-pointer"
              >
                VERIFY CONTROLLER BUTTONS & START →
              </button>
            </div>
          </div>
        )}

        {/* Phase: BUTTON MAPPING VERIFICATION */}
        {phase === 'verification' && (
          <div className="flex flex-col gap-4 max-w-xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              VERIFY INPUT CHANNELS BEFORE STARTING
            </h3>
            <p className="text-xs text-neutral-400">
              Press each required controller button to confirm index mapping on your EvoFox One S:
            </p>

            <div className="flex flex-col gap-2">
              {requiredButtons.map(btn => (
                <div
                  key={btn.index}
                  className={`p-3 rounded border flex justify-between items-center text-xs ${
                    testedButtons[btn.index]
                      ? 'bg-emerald-950/80 border-emerald-600 text-emerald-200'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                  }`}
                >
                  <div>
                    <span className="font-bold text-white block">{btn.label}</span>
                    <span className="text-[11px] opacity-75">{btn.role}</span>
                  </div>
                  <span className="font-bold text-xs">
                    {testedButtons[btn.index] ? '✓ VERIFIED' : 'WAITING FOR PRESS'}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-2">
              <button
                disabled={!allVerified}
                onClick={() => {
                  trialsHistoryRef.current = [];
                  setCurrentTrialNumber(0);
                  setIsPractice(true);
                  scheduleNextTrial(0, true);
                }}
                className="px-4 py-2 bg-emerald-500 text-neutral-950 font-bold text-xs rounded hover:bg-emerald-400 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                BEGIN PRACTICE TRIALS (3 ROUNDS) →
              </button>
              <button
                onClick={() => setPhase('idle')}
                className="px-3 py-2 bg-neutral-900 border border-neutral-800 text-neutral-400 text-xs rounded hover:text-white cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Phase: PRACTICE FINISHED INTRODUCING SCORED */}
        {phase === 'practice_intro' && (
          <div className="flex flex-col gap-4 max-w-xl">
            <div className="p-3 bg-blue-950/60 border border-blue-700 text-blue-200 text-xs rounded">
              ✓ <strong>PRACTICE COMPLETE:</strong> You have completed 3 practice trials. These will be completely excluded from the scored dataset.
            </div>
            <h3 className="text-sm font-bold text-white">READY FOR 20 SCORED TRIALS</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Focus on the screen. Maintain a neutral rest posture between trials without pre-pressing the buttons.
            </p>
            <div>
              <button
                onClick={() => {
                  trialsHistoryRef.current = []; // Clear practice trials from history or flag them
                  setCurrentTrialNumber(0);
                  setIsPractice(false);
                  scheduleNextTrial(0, false);
                }}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded cursor-pointer"
              >
                START 20 SCORED TRIALS NOW →
              </button>
            </div>
          </div>
        )}

        {/* Phase: ACTIVE TRIAL RUNNER (Foreperiod, Stimulus, Feedback) */}
        {(phase === 'foreperiod_delay' || phase === 'stimulus_active' || phase === 'trial_feedback') && (
          <div className="flex flex-col flex-1 justify-between gap-6">
            {/* Header info */}
            <div className="flex justify-between items-center text-xs text-neutral-400 border-b border-neutral-800 pb-2">
              <span className="font-bold">
                {isPractice ? 'PRACTICE TRIAL' : 'SCORED TRIAL'} {currentTrialNumber + 1} OF {isPractice ? PRACTICE_TRIALS_TOTAL : SCORED_TRIALS_TOTAL}
              </span>
              <span className="text-[11px] text-neutral-500">
                FOREPERIOD: {currentForeperiodMsRef.current} ms JITTER
              </span>
            </div>

            {/* Stimulus Presentation Area */}
            <div className="flex-1 min-h-[220px] flex items-center justify-center relative">
              {/* Neutral waiting state */}
              {phase === 'foreperiod_delay' && (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-full border-2 border-neutral-700 border-t-neutral-300 animate-spin" />
                  <span className="text-sm font-bold text-neutral-400 tracking-wider">
                    WAIT FOR STIMULUS (HOLD REST)
                  </span>
                  <span className="text-[11px] text-neutral-600">
                    Premature actuation will record a false start
                  </span>
                </div>
              )}

              {/* Active stimulus presentation */}
              {phase === 'stimulus_active' && currentStimulus && (
                <div className="w-full flex justify-center items-center">
                  {/* Center Stimulus (Simple or Go/No-Go) */}
                  {currentStimulus.displaySide === 'center' && (
                    <div
                      className={`w-36 h-36 rounded-lg flex flex-col items-center justify-center text-center p-3 font-bold shadow-2xl transition-all ${
                        currentStimulus.isNoGo
                          ? 'bg-rose-600 text-white shadow-rose-900/50'
                          : 'bg-emerald-500 text-neutral-950 shadow-emerald-900/50'
                      }`}
                    >
                      <span className="text-xl tracking-wider">
                        {currentStimulus.isNoGo ? 'NO-GO!' : 'GO!'}
                      </span>
                      <span className="text-xs mt-1">
                        {currentStimulus.isNoGo ? 'DO NOT PRESS' : 'PRESS BUTTON [0]'}
                      </span>
                    </div>
                  )}

                  {/* Choice Left vs Right Stimulus */}
                  {currentStimulus.displaySide !== 'center' && (
                    <div className="w-full flex justify-between items-center px-12">
                      <div
                        className={`w-36 h-36 rounded-lg flex flex-col items-center justify-center p-3 font-bold transition-all ${
                          currentStimulus.displaySide === 'left'
                            ? 'bg-sky-500 text-neutral-950 shadow-sky-900/50 scale-105'
                            : 'bg-neutral-950 border border-neutral-800 text-neutral-700 opacity-20'
                        }`}
                      >
                        <span className="text-2xl">← LEFT</span>
                        <span className="text-xs mt-1">PRESS BUTTON [4]</span>
                      </div>

                      <div
                        className={`w-36 h-36 rounded-lg flex flex-col items-center justify-center p-3 font-bold transition-all ${
                          currentStimulus.displaySide === 'right'
                            ? 'bg-purple-500 text-neutral-950 shadow-purple-900/50 scale-105'
                            : 'bg-neutral-950 border border-neutral-800 text-neutral-700 opacity-20'
                        }`}
                      >
                        <span className="text-2xl">RIGHT →</span>
                        <span className="text-xs mt-1">PRESS BUTTON [5]</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Inter-trial Feedback */}
              {phase === 'trial_feedback' && lastOutcome && (
                <div className="flex flex-col items-center gap-1.5 animate-in fade-in">
                  <span className={`text-base font-bold ${
                    lastOutcome.outcome === 'correct_hit' || lastOutcome.outcome === 'correct_withhold'
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}>
                    {lastOutcome.message}
                  </span>
                  <span className="text-xs text-neutral-500">Preparing next trial...</span>
                </div>
              )}
            </div>

            {/* Trial progress line */}
            <div className="w-full h-1.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{
                  width: `${((currentTrialNumber) / (isPractice ? PRACTICE_TRIALS_TOTAL : SCORED_TRIALS_TOTAL)) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Phase: PAUSED DUE TO TAB VISIBILITY */}
        {phase === 'paused_hidden' && (
          <div className="flex flex-col gap-4 max-w-xl">
            <div className="p-4 bg-amber-950/80 border border-amber-700 text-amber-200 text-xs rounded leading-relaxed">
              ⚠️ <strong>TRIAL INVALIDATED & SUSPENDED:</strong> The browser tab lost visibility or focus during the trial. To ensure rigorous psychophysics timing data, this trial was invalidated.
            </div>
            <div>
              <button
                onClick={() => {
                  scheduleNextTrial(currentTrialNumber, isPractice);
                }}
                className="px-4 py-2 bg-neutral-200 text-neutral-950 font-bold text-xs rounded hover:bg-white cursor-pointer"
              >
                RESUME TEST PROTOCOL →
              </button>
            </div>
          </div>
        )}

        {/* Phase: COMPLETED SUMMARY & EXPORT */}
        {phase === 'summary' && experimentSummary && (
          <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white uppercase tracking-wider">
                  EXPERIMENT COMPLETE // RESULTS SUMMARY
                </h3>
                <span className="text-xs text-neutral-500">
                  Session ID: {experimentSummary.sessionId} • Protocol: {experimentSummary.protocolVersion}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => exportExperimentCSV(trialsHistoryRef.current, experimentSummary)}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 rounded text-xs font-bold cursor-pointer"
                >
                  EXPORT RAW CSV
                </button>
                <button
                  onClick={() => exportExperimentJSON({
                    exportTimestamp: new Date().toISOString(),
                    userAgent: navigator.userAgent,
                    controllerMetadata: controller ? {
                      id: controller.id,
                      mapping: controller.mapping,
                      timestamp: controller.timestamp,
                    } : null,
                    summary: experimentSummary,
                    trials: trialsHistoryRef.current,
                  })}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 rounded text-xs font-bold cursor-pointer"
                >
                  EXPORT RAW JSON
                </button>
              </div>
            </div>

            {/* Primary Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded">
                <span className="text-neutral-500 block text-[11px]">MEDIAN LATENCY (PRIMARY)</span>
                <span className="text-2xl font-bold text-emerald-400 mt-1 block">
                  {experimentSummary.medianMs > 0 ? `${experimentSummary.medianMs} ms` : 'N/A'}
                </span>
                <span className="text-[10px] text-neutral-600 block mt-0.5">Robust against outlier skew</span>
              </div>

              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded">
                <span className="text-neutral-500 block text-[11px]">MEAN LATENCY</span>
                <span className="text-2xl font-bold text-neutral-200 mt-1 block">
                  {experimentSummary.meanMs > 0 ? `${experimentSummary.meanMs} ms` : 'N/A'}
                </span>
                <span className="text-[10px] text-neutral-600 block mt-0.5">Arithmetic average</span>
              </div>

              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded">
                <span className="text-neutral-500 block text-[11px]">LATENCY JITTER (STD DEV)</span>
                <span className="text-2xl font-bold text-sky-400 mt-1 block">
                  ±{experimentSummary.stdDevMs} ms
                </span>
                <span className="text-[10px] text-neutral-600 block mt-0.5">Neuromotor variability</span>
              </div>

              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded">
                <span className="text-neutral-500 block text-[11px]">ACCURACY RATE</span>
                <span className="text-2xl font-bold text-purple-400 mt-1 block">
                  {experimentSummary.accuracyPercentage}%
                </span>
                <span className="text-[10px] text-neutral-600 block mt-0.5">
                  {experimentSummary.validHitsCount} / {experimentSummary.scoredTrialsCount} Correct
                </span>
              </div>
            </div>

            {/* Secondary stats & error breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 bg-neutral-950 border border-neutral-800 rounded">
                <span className="text-neutral-500 block text-[10px]">FASTEST / SLOWEST</span>
                <span className="font-bold text-neutral-300">
                  {experimentSummary.fastestMs} ms / {experimentSummary.slowestMs} ms
                </span>
              </div>
              <div className="p-2.5 bg-neutral-950 border border-neutral-800 rounded">
                <span className="text-neutral-500 block text-[10px]">PREMATURE RESPONSES</span>
                <span className={`font-bold ${experimentSummary.prematureCount > 0 ? 'text-amber-400' : 'text-neutral-400'}`}>
                  {experimentSummary.prematureCount} False Starts
                </span>
              </div>
              <div className="p-2.5 bg-neutral-950 border border-neutral-800 rounded">
                <span className="text-neutral-500 block text-[10px]">INCORRECT / MISSED</span>
                <span className="font-bold text-rose-400">
                  {experimentSummary.incorrectChoiceCount + experimentSummary.timedOutCount} Errors
                </span>
              </div>
              {mode === 'gonogo' && (
                <div className="p-2.5 bg-neutral-950 border border-neutral-800 rounded">
                  <span className="text-neutral-500 block text-[10px]">NO-GO INHIBITION</span>
                  <span className="font-bold text-neutral-300">
                    {experimentSummary.correctWithholdsCount} Withheld / {experimentSummary.falseAlarmsCount} False Alarms
                  </span>
                </div>
              )}
            </div>

            {/* Response Time Distribution (Histogram) */}
            {experimentSummary.distribution.length > 0 && (
              <div className="p-4 bg-neutral-950 border border-neutral-800 rounded flex flex-col gap-2">
                <span className="text-xs font-bold text-neutral-300">
                  RESPONSE TIME DISTRIBUTION (VALID CORRECT HITS):
                </span>
                <div className="h-28 flex items-end gap-2 pt-2 border-b border-neutral-800">
                  {experimentSummary.distribution.map((bin, i) => {
                    const max = Math.max(...experimentSummary.distribution.map(d => d.count), 1);
                    const pct = (bin.count / max) * 100;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
                        <span className="text-[10px] text-neutral-400">{bin.count}</span>
                        <div
                          style={{ height: `${Math.max(pct, 8)}%` }}
                          className="w-full bg-emerald-500/80 rounded-t"
                        />
                        <span className="text-[10px] text-neutral-500">{bin.binStart}ms</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Honest Scientific Disclaimer */}
            <div className="p-3 bg-neutral-950 border border-neutral-800 rounded text-[11px] text-neutral-500 leading-normal">
              <strong>Measurement methodology note:</strong> These measurements represent pure elapsed time between the browser's visual update frame and USB HID controller button edge detection on this setup. They are physical performance measurements and do not calculate IQ, attention span, or neurological diagnostics.
            </div>

            <div>
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-neutral-200 text-neutral-950 font-bold text-xs rounded hover:bg-white cursor-pointer"
              >
                RETEST OR SELECT ANOTHER MODE →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
