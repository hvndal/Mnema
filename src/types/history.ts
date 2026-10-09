/**
 * Unified Session History Data Contracts
 * Protocol Versions:
 * - 2.1-controller-psychophysics (Reaction)
 * - 3.0-controller-precision-tracking (Acquisition / Tracking)
 * - 1.0-controller-diagnostics (Diagnostics / Calibration)
 */

import type { ReactionExperimentStats, RawTrialRecord } from './experiment';
import type { TargetAcquisitionStats, RawAcquisitionTrialRecord, ContinuousTrackingStats, TrackingSample } from './precisionTracking';
import type { StickCalibrationData } from './telemetry';

export type SessionExperimentType = 'reaction' | 'target_acquisition' | 'continuous_tracking' | 'diagnostics_calibration';

export interface StoredSessionRecord {
  id: string; // Unique Session UUID/ID
  timestamp: string; // ISO 8601 string
  experimentType: SessionExperimentType;
  protocolVersion: string;
  hardwareName: string;
  controllerId: string | null;
  settingsSummary: Record<string, any>;
  sampleCount: number;
  hasInterruptedTrials: boolean;
  dataQualityWarnings: string[];

  // Typed experiment summaries (only the corresponding field is populated)
  reactionStats?: ReactionExperimentStats;
  acquisitionStats?: TargetAcquisitionStats;
  trackingStats?: ContinuousTrackingStats;
  calibrationStats?: {
    leftStick: StickCalibrationData;
    rightStick: StickCalibrationData;
    buttonCount: number;
    axisCount: number;
  };

  // Optional raw trial archives (preserves raw observations separately)
  rawReactionTrials?: RawTrialRecord[];
  rawAcquisitionTrials?: RawAcquisitionTrialRecord[];
  rawTrackingSamples?: TrackingSample[];
}

export interface SessionComparisonResult {
  compatible: boolean;
  experimentType: SessionExperimentType;
  incompatibilityReason?: string;
  hardwareDifferenceWarning?: string;
  metrics: {
    key: string;
    label: string;
    unit: string;
    higherIsBetter: boolean | null; // null if neutral (e.g. sample count)
    values: { sessionId: string; date: string; value: number | string }[];
    delta?: { absolute: number; percentage: number; description: string };
  }[];
}
