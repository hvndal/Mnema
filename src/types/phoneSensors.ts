/**
/**
 * Types and interfaces for Phone Gyroscope & Accelerometer Psychophysics
 * - Steadiness (Physiological Tremor FFT)
 * - Balance (Romberg Ratio: Eyes Open vs Closed)
 * - Proprioception (Blind Joint Angle / Tilt Reproduction)
 */

export interface MotionSample {
  timestamp: number; // performance.now()
  accelX: number; // m/s²
  accelY: number;
  accelZ: number;
  magnitude: number; // sqrt(x^2 + y^2 + z^2)
  rotAlpha?: number; // deg/s
  rotBeta?: number;
  rotGamma?: number;
}

export interface OrientationSample {
  timestamp: number;
  alpha: number; // 0-360 deg (compass)
  beta: number;  // -180 to 180 deg (pitch: front/back)
  gamma: number; // -90 to 90 deg (roll: left/right)
}

// 1. Steadiness Test Types
export interface SteadinessResult {
  durationSeconds: number;
  sampleCount: number;
  effectiveSamplingRateHz: number;
  peakFrequencyHz: number; // Peak tremor frequency (typically 7-12 Hz)
  peakPower: number; // Power at peak
  rmsAcceleration: number; // Overall shake magnitude (m/s²)
  steadinessScore: number; // 0-100 score
  classification: 'High Stability' | 'Normal Physiological Tremor' | 'Elevated Tremor' | 'Significant Movement';
  spectralData: {
    frequencies: number[]; // Frequencies in Hz (0-25 Hz)
    power: number[]; // Normalized PSD
  };
  timeSeriesSummary: {
    times: number[]; // Seconds
    magnitudes: number[]; // m/s²
  };
}

// 2. Balance (Romberg) Test Types
export interface PosturalSwayMetrics {
  durationSeconds: number;
  sampleCount: number;
  pathLength: number; // Total degrees or displacement traversed
  meanVelocity: number; // deg/s
  rmsSway: number; // RMS displacement
  area95: number; // 95% confidence ellipse area (deg²)
  trajectory: { x: number; y: number }[]; // Medial-lateral (gamma) vs Anterior-posterior (beta)
}

export interface BalanceTestResult {
  eyesOpen: PosturalSwayMetrics;
  eyesClosed: PosturalSwayMetrics;
  rombergRatio: number; // Sway_closed / Sway_open
  visualReliancePercent: number; // % balance contributed by vision (0-100%)
  classification: 'Vestibular/Proprioceptive Dominant' | 'Balanced Integration' | 'Vision Dependent' | 'Extreme Visual Reliance';
  posturalStabilityScore: number; // 0-100 overall balance score
}

// 3. Proprioception Test Types
export interface ProprioceptionTrial {
  trialIndex: number;
  targetAngleDeg: number;
  actualAngleDeg: number;
  signedErrorDeg: number; // actual - target
  absoluteErrorDeg: number; // |actual - target|
  direction: 'pitch' | 'roll';
  confidenceDurationMs: number;
}

export interface ProprioceptionResult {
  trials: ProprioceptionTrial[];
  meanAbsoluteErrorDeg: number;
  meanSignedErrorDeg: number;
  tendency: 'Overshoot' | 'Undershoot' | 'Calibrated';
  accuracyScore: number; // 0-100
  rating: 'S-Tier (Gymnast Acuity)' | 'A-Tier (Athletic Acuity)' | 'B-Tier (Average Human Acuity)' | 'C-Tier (Position Drift)';
}

export type PhoneSensorPermissionState = 'prompt' | 'granted' | 'denied' | 'unsupported';
