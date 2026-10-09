/**
 * Precision & Tracking Lab Types & Contracts
 * Protocol Version: 3.0-controller-precision-tracking
 */

export interface Point2D {
  x: number;
  y: number;
}

// -------------------------------------------------------------
// EXPERIMENT A: TARGET ACQUISITION
// -------------------------------------------------------------

export type AcquisitionTargetSize = 'small' | 'medium' | 'large';
export type AcquisitionDistanceCategory = 'short' | 'medium' | 'long';
export type AcquisitionOutcome = 'hit' | 'miss_button' | 'timeout' | 'invalidated';

export interface AcquisitionTargetConfig {
  id: string;
  x: number;
  y: number;
  radius: number;
  sizeCategory: AcquisitionTargetSize;
}

export interface RawAcquisitionTrialRecord {
  sessionId: string;
  protocolVersion: string;
  isPractice: boolean;
  trialNumber: number;
  targetId: string;
  targetX: number;
  targetY: number;
  targetRadius: number;
  sizeCategory: AcquisitionTargetSize;
  distanceCategory: AcquisitionDistanceCategory;
  cursorStartX: number;
  cursorStartY: number;
  cursorFinalX: number;
  cursorFinalY: number;
  targetAppearanceTimeMs: number;
  confirmationTimeMs: number | null;
  acquisitionTimeMs: number | null;
  shortestDistancePx: number;
  actualPathLengthPx: number;
  pathEfficiency: number; // shortest / actual (or 1.0 if shortest == 0 and actual == 0)
  endpointErrorPx: number; // Euclidean distance from cursor to target center
  overshootCount: number; // Times the cursor trajectory intersected target radius, exited, then re-entered
  outcome: AcquisitionOutcome;
  isValid: boolean;
  invalidationReason: string | null;
}

export interface TargetAcquisitionStats {
  sessionId: string;
  totalTrialsAttempted: number;
  scoredTrialsCount: number;
  validHitsCount: number;
  missCount: number;
  timeoutCount: number;
  invalidCount: number;
  hitRatePercentage: number;
  timeoutRatePercentage: number;
  
  // Latency metrics (only valid hits)
  medianAcquisitionTimeMs: number;
  meanAcquisitionTimeMs: number;
  stdDevAcquisitionTimeMs: number;
  
  // Precision & kinematic metrics
  meanEndpointErrorPx: number;
  meanPathEfficiency: number;
  totalOvershoots: number;
  meanOvershootsPerHit: number;

  // Breakdown by target size
  bySize: Record<AcquisitionTargetSize, { count: number; meanTimeMs: number; meanErrorPx: number; hitRate: number }>;

  // Breakdown by distance category
  byDistance: Record<AcquisitionDistanceCategory, { count: number; meanTimeMs: number; meanEfficiency: number; hitRate: number }>;
}

// -------------------------------------------------------------
// EXPERIMENT B: CONTINUOUS TRACKING
// -------------------------------------------------------------

export type TrackingPattern = 'sinusoidal' | 'waypoint' | 'lissajous';
export type TrackingDifficulty = 'normal' | 'fast';

export interface TrackingSample {
  timestampMs: number;
  elapsedMs: number;
  targetX: number;
  targetY: number;
  cursorX: number;
  cursorY: number;
  distanceErrorPx: number;
  isInsideTargetRadius: boolean;
  isInterrupted: boolean;
}

export interface ContinuousTrackingStats {
  sessionId: string;
  pattern: TrackingPattern;
  difficulty: TrackingDifficulty;
  totalDurationMs: number;
  totalSamplesRecorded: number;
  targetRadiusPx: number;

  meanTrackingErrorPx: number;
  rmseTrackingErrorPx: number; // Root-mean-square error
  maxTrackingErrorPx: number;
  timeInTargetPercentage: number; // % of time cursor was within target radius
  
  // Hand/stick kinematics (estimated)
  totalCursorDistancePx: number;
  correctionFrequencyHz: number; // directional reversals per second
  estimatedLagMs: number | null; // cross-correlation peak offset if statistically valid
}
