/**
 * Core types for raw controller telemetry, input events, and calibration
 */

export interface RawGamepadState {
  index: number;
  id: string;
  mapping: string;
  connected: boolean;
  timestamp: number;
  buttons: {
    index: number;
    pressed: boolean;
    value: number;
    touched?: boolean;
  }[];
  axes: {
    index: number;
    value: number;
  }[];
}

export type InputTransitionType = 'button_down' | 'button_up' | 'axis_moved';

export interface InputTransitionEvent {
  id: string;
  timestamp: number; // performance.now()
  hardwareTimestamp: number; // gamepad.timestamp
  type: InputTransitionType;
  targetIndex: number;
  value: number;
  previousValue: number;
  description: string;
}

export interface StickCalibrationData {
  axisXIndex: number;
  axisYIndex: number;
  label: string;
  isCalibratingCenter: boolean;
  isCalibratingRange: boolean;
  
  // Resting center metrics
  centerSampleCount: number;
  restingCenter: { x: number; y: number };
  restingNoise: { x: number; y: number }; // Max deviation from rest
  
  // Full range metrics
  observedMin: { x: number; y: number };
  observedMax: { x: number; y: number };

  // Calculated software deadzone recommendations
  recommendedDeadzone: number;
}

export interface TelemetryFrame {
  sampleIndex: number;
  sampleTime: number; // performance.now()
  hardwareTimestamp: number; // gamepad.timestamp
  hasStateChanged: boolean;
  timeSinceLastChangeMs: number;
  buttons: { index: number; pressed: boolean; value: number }[];
  axes: { index: number; value: number }[];
}

export interface TelemetrySummary {
  sampleCount: number;
  stateChangeCount: number;
  samplingIntervalMean: number; // rAF tick interval
  samplingIntervalStdDev: number;
  stateChangeIntervalMean: number; // Observed interval between actual input alterations
  stateChangeIntervalStdDev: number;
  pageVisibilityHiddenEvents: number;
}
