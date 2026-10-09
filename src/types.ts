export interface GamepadSnapshot {
  connected: boolean;
  id: string;
  mapping: string;
  timestamp: number;
  buttons: {
    pressed: boolean;
    value: number;
    touched?: boolean;
  }[];
  axes: number[];
  vibrationSupported: boolean;
}

export type InputMode = 'gamepad' | 'keyboard';

export type TestParadigm = 
  | 'simple'          // Simple Reaction Time (Press any button on stimulus)
  | 'choice_color'    // 4-choice: Color matches face button (A=Green, B=Red, X=Blue, Y=Yellow)
  | 'choice_dpad'     // 4-choice: Arrow direction matches D-Pad (Up, Down, Left, Right)
  | 'gonogo';         // Go / No-Go: Fire on Green circle, withhold on Red skull

export type TestState = 
  | 'idle'            // Waiting to begin trial series
  | 'ready'           // Arming the trigger / "Hold Ready"
  | 'waiting'         // Random foreperiod delay active (jitter interval)
  | 'stimulus'        // Target presented, timer actively running
  | 'early_fault'     // Pressed too early (false start penalty)
  | 'wrong_input'     // Wrong button pressed in choice task
  | 'trial_result'    // Brief pause displaying single trial latency
  | 'completed';      // All trials finished, show full psychophysics stats

export interface StimulusSignal {
  type: TestParadigm;
  targetButtonIndex?: number; // Standard index: 0=A, 1=B, 2=X, 3=Y, 12=Up, 13=Down, 14=Left, 15=Right
  targetButtonLabel: string;
  targetColor: string;
  isNogo?: boolean;
}

export interface SingleTrialResult {
  trialNumber: number;
  paradigm: TestParadigm;
  reactionTimeMs: number; // millisecond high-res precision
  fault: boolean;
  faultReason?: 'early_press' | 'wrong_button' | 'nogo_fail' | 'timeout';
  targetLabel: string;
  buttonPressedLabel?: string;
  foreperiodMs: number; // foreperiod duration used for this trial
  timestamp: number;
}

export interface PsychophysicsStats {
  totalTrials: number;
  validTrials: number;
  falseStarts: number;
  wrongInputs: number;
  mean: number;
  median: number;
  fastest: number;
  slowest: number;
  stdDev: number; // Neuromotor variability / jitter
  iqr: number;    // Interquartile range
  fatigueSlope: number; // Trend across rounds (positive = slowing down, negative = warming up)
  distribution: { binStart: number; binEnd: number; count: number }[];
}
