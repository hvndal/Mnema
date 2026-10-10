/**
 * Type definitions for Advanced Smartphone Sensor Experiments:
 * Gyroscope, Accelerometer, Magnetometer, Barometer, Acoustic, Optical, and Sensor Fusion.
 */

// Gyroscope Experiments
export interface RpmSample {
  timestamp: number;
  rpm: number;
  axis: 'yaw' | 'pitch' | 'roll' | 'composite';
  rawDegPerSec: number;
}

export interface SwingPhaseMetrics {
  takeawayDurationMs: number;
  accelerationDurationMs: number;
  peakSpeedDegPerSec: number;
  peakAngularAccelDegPerSec2: number;
  impactSpeedKmh: number;
  followThroughDurationMs: number;
  totalSwingDurationMs: number;
  smoothnessScore: number;
}

export interface AirWritingStrokePoint {
  x: number;
  y: number;
  timestamp: number;
  pressure?: number;
}

export type AirWritingShape = 'circle' | 'square' | 'triangle' | 'heart' | 'star' | 'infinity' | 'zigzag' | 'unknown';

export interface KeystrokeLeakLog {
  key: string;
  tiltPitchDelta: number;
  tiltRollDelta: number;
  predictedQuadrant: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  confidence: number;
}

// Accelerometer Experiments
export interface ElevatorHeightSample {
  timestamp: number;
  accelZ: number;
  velocityZ: number;
  displacementMeters: number;
}

export interface SeismocardiogramSample {
  timestamp: number;
  scgRaw: number;
  scgFiltered: number;
  respirationFiltered: number;
}

export interface ScgResults {
  estimatedBpm: number;
  respirationBreathsPerMin: number;
  rhythmRegularityPct: number;
  signalToNoiseRatioDb: number;
}

export interface EarthquakeTriggerEvent {
  timestamp: number;
  staLtaRatio: number;
  peakGroundAccelG: number;
  intensityCategory: 'Not Felt' | 'Weak' | 'Light' | 'Moderate' | 'Strong' | 'Severe';
  shakingDurationMs: number;
}

export interface PotholeIncident {
  id: string;
  timestamp: number;
  joltPeakG: number;
  durationMs: number;
  severity: 'minor' | 'moderate' | 'severe';
}

// Magnetometer Experiments
export interface MagneticReading {
  timestamp: number;
  fluxMicroTesla: number;
  deltaFromBaseline: number;
  anomalyDetected: boolean;
}

export interface MagneticFingerprintNode {
  nodeId: string;
  name: string;
  timestamp: number;
  vector: { x: number; y: number; z: number; magnitude: number };
}

// Barometer Experiments
export interface BarometerSample {
  timestamp: number;
  pressureHpa: number;
  relativeAltitudeM: number;
  estimatedFloor: number;
  verticalSpeedMps: number;
}

export interface RoomPressurePulse {
  timestamp: number;
  deltaHpa: number;
  eventType: 'door_slam' | 'hvac_cycle' | 'window_gust' | 'ambient';
}

// Acoustic Experiments
export interface SonarEchoResult {
  distanceCm: number;
  timeOfFlightMs: number;
  confidencePct: number;
}

export interface DopplerGestureState {
  direction: 'approaching' | 'receding' | 'stationary' | 'waving';
  relativeVelocityMps: number;
  dopplerShiftHz: number;
  confidence: number;
}

export interface FskMessagePayload {
  rawText: string;
  markFrequencyHz: number;
  spaceFrequencyHz: number;
  baudRate: number;
  transmissionDurationMs: number;
}

export interface SpirometryLungMetrics {
  fev1Liters: number;
  peakExpiratoryFlowLps: number;
  forcedVitalCapacityLiters: number;
  exhaleDurationSec: number;
}

// Optical Experiments
export interface PpgPulseReading {
  timestamp: number;
  rawRed: number;
  filteredRed: number;
  isPeak: boolean;
}

export interface PpgHrvResult {
  bpm: number;
  rmssdMs: number;
  sdnnMs: number;
  signalQualityPct: number;
}

export interface CosmicRayHit {
  id: string;
  timestamp: number;
  x: number;
  y: number;
  clusterSizePixels: number;
  energyLuminance: number;
  thumbnailBase64?: string;
}

export interface SpectrometerEmissionPeak {
  wavelengthNm: number;
  relativeIntensity: number;
  colorHex: string;
  elementOrSourceHint: string;
}

// Sensor Fusion Experiments
export interface DeadReckoningStep {
  stepIndex: number;
  timestamp: number;
  stepLengthMeters: number;
  headingDeg: number;
  xMeters: number;
  yMeters: number;
}

export interface SurfaceClassificationResult {
  surfaceType: 'Hard Wood / Metal Desk' | 'Soft Cushion / Bed' | 'Handheld / In-Air' | 'Hollow Resonance Box';
  vibrationDecayHalfLifeMs: number;
  dominantResonantFreqHz: number;
  dampingRatio: number;
}

export interface SensorIdCalibrationFingerprint {
  accelBias: { x: number; y: number; z: number };
  gyroThermalDrift: { roll: number; pitch: number; yaw: number };
  interAxisCrossTalkPct: number;
  uniqueDeviceDigestHex: string;
}
