/**
 * Reaction Experiment Types & Data Models
 * Protocol Version: 2.1-controller-psychophysics
 */

export type ExperimentMode = 'simple' | 'choice' | 'gonogo';

export type TrialPhase = 
  | 'idle'             // Not started
  | 'verification'     // User verifying/testing button mappings
  | 'practice_intro'   // Prompting practice trials
  | 'foreperiod_delay' // Waiting for stimulus with random jitter
  | 'stimulus_active'  // Target stimulus displayed, timer actively recording
  | 'trial_feedback'   // Brief inter-trial feedback display
  | 'paused_hidden'    // Tab visibility lost, trial suspended/invalidated
  | 'summary';         // Experiment completed

export type TrialOutcome = 
  | 'correct_hit'      // Responded correctly within time window
  | 'correct_withhold' // For No-Go: successfully withheld response
  | 'premature'        // False start / responded during foreperiod
  | 'incorrect_choice' // Wrong button index pressed for target stimulus
  | 'false_alarm'      // No-Go commission error (pressed when told to withhold)
  | 'omission_timeout' // Failed to respond before stimulus timeout
  | 'invalidated';     // Tab visibility changed or window blurred during trial

export interface RawTrialRecord {
  sessionId: string;
  protocolVersion: string;
  experimentMode: ExperimentMode;
  isPractice: boolean;
  trialNumber: number; // 1-indexed
  stimulusType: string;
  targetButtonIndex: number | null; // null for No-Go
  targetButtonLabel: string;
  foreperiodDurationMs: number;
  stimulusOnsetTimestamp: number; // performance.now()
  responseTimestamp: number | null; // performance.now()
  responseTimeMs: number | null; // calculated reaction time
  buttonPressedIndex: number | null;
  buttonPressedLabel: string | null;
  outcome: TrialOutcome;
  isValid: boolean;
  invalidationReason: string | null;
}

export interface ReactionExperimentStats {
  sessionId: string;
  protocolVersion: string;
  mode: ExperimentMode;
  totalTrialsAttempted: number;
  scoredTrialsCount: number;
  validHitsCount: number;
  
  // Latency metrics (only valid correct hits)
  meanMs: number;
  medianMs: number;
  fastestMs: number;
  slowestMs: number;
  stdDevMs: number;
  iqrMs: number;

  // Accuracy and Error counts
  accuracyPercentage: number;
  prematureCount: number;
  timedOutCount: number;
  incorrectChoiceCount: number;
  
  // Specific to Go/No-Go
  correctWithholdsCount: number;
  falseAlarmsCount: number;
  
  // Histogram distribution of valid reaction times
  distribution: { binStart: number; binEnd: number; count: number }[];
}
