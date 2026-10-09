/**
 * Gyroscope & Motion Psychophysics Type Definitions
 * Covers all 4 sensory domains:
 * 1. Body Control (Tremor, Sway Map, Tandem Walk, Sit-to-Stand)
 * 2. Body Sense (Blind Angle, Mirror Match, Subjective Vertical, Return to Zero)
 * 3. Timing & Movement Quality (Wrist Flip, Smoothness, Tilt Reaction, Metronome)
 * 4. Brain Load (Dual-Task Cost, Inverted Maze, Fatigue Curve)
 * Plus Presentation & Social (Before/After, 2-Player Duel, Signature Card)
 */

export type GyroDomain = 'body_control' | 'body_sense' | 'timing_movement' | 'brain_load' | 'presentation_social';

export type GyroTestId =
  // Body Control
  | 'tremor_spectrum'
  | 'sway_map'
  | 'tandem_walk'
  | 'sit_to_stand'
  // Body Sense
  | 'blind_angle'
  | 'mirror_match'
  | 'subjective_vertical'
  | 'return_to_zero'
  // Timing & Movement Quality
  | 'wrist_flip_speed'
  | 'smoothness_score'
  | 'tilt_reaction_time'
  | 'internal_metronome'
  // Brain Load
  | 'dual_task_cost'
  | 'tilt_maze_inverted'
  | 'fatigue_curve'
  // Presentation & Social
  | 'before_after_mode'
  | 'two_player_duel';

// 1. Tandem Walk Result
export interface TandemWalkResult {
  stepCount: number;
  targetSteps: number;
  totalDurationSeconds: number;
  averageTrunkWobbleDeg: number; // Lateral roll wobble per step
  wobblePerStep: number[];
  cadenceStepsPerMin: number;
  trunkStabilityScore: number; // 0-100
  stabilityRating: 'Rock Solid' | 'Good Balance' | 'Moderate Trunk Sway' | 'Marked Wobble';
}

// 2. Sit-to-Stand Result
export interface SitToStandResult {
  completedReps: number;
  targetReps: number;
  totalDurationSeconds: number;
  meanRiseDurationSeconds: number;
  riseDurations: number[]; // seconds per rise
  smoothnessIndex: number; // Jerk-based smoothness (0-100)
  peakSurgeAccelerationMs2: number;
  powerRating: 'Explosive & Smooth' | 'Healthy Mobility' | 'Deliberate / Hesitant' | 'Struggling';
}

// 3. Mirror Match Result
export interface MirrorMatchResult {
  leftHandAngleDeg: number;
  rightHandAngleDeg: number;
  asymmetryDeltaDeg: number; // |left - right|
  asymmetryDirection: 'Left Bias' | 'Right Bias' | 'Symmetric';
  bilateralScore: number; // 0-100
  classification: 'Perfect Symmetry (<2°)' | 'Normal Asymmetry (<5°)' | 'Lateral Mismatch (>5°)';
}

// 4. Subjective Visual Vertical (SVV) Result
export interface SubjectiveVerticalResult {
  trials: { actualRollDeg: number; actualPitchDeg: number }[];
  meanRollDeviationDeg: number;
  meanPitchDeviationDeg: number;
  totalVerticalErrorDeg: number;
  tiltBiasDirection: 'Leftward Tilt' | 'Rightward Tilt' | 'Forward Tilt' | 'Backward Tilt' | 'True Vertical';
  otolithAcuityRating: 'Exceptional (<1°)' | 'Standard Acuity (1°-3°)' | 'Otoneurological Drift (>3°)';
}

// 5. Return to Zero Result
export interface ReturnToZeroResult {
  startHeadingDeg: number;
  finalHeadingDeg: number;
  degreesRotated: number; // Estimated full spins
  headingErrorDeg: number; // |final - start|
  signedErrorDeg: number;
  overshootOrUndershoot: 'Overshot Start' | 'Undershot Start' | 'Dead Center';
  vestibularIntegrationScore: number; // 0-100
}

// 6. Wrist Flip Speed (Diadochokinesia) Result
export interface WristFlipResult {
  durationSeconds: number;
  totalFlips: number;
  flipFrequencyHz: number; // Flips per second (typically 3-6 Hz)
  peakAngularVelocityDegS: number;
  rhythmDecayPercentage: number; // % slowdown or variability in latter half
  cadenceVariabilityCV: number; // Coefficient of variation of intervals
  rating: 'Rapid & Metronomic' | 'Normal Alternation' | 'Rhythm Fatigue' | 'Sluggish Alternation';
}

// 7. Smoothness Score (Jerk Minimization) Result
export interface SmoothnessResult {
  durationSeconds: number;
  pathLength: number;
  dimensionlessJerk: number; // Lower is smoother
  smoothnessScore: number; // 0-100
  trajectory: { x: number; y: number }[];
  smoothnessClassification: 'Fluid & Continuous' | 'Normal Human Curvature' | 'Segmented / Choppy';
}

// 8. Tilt Reaction Time Result
export interface TiltReactionResult {
  trials: { foreperiodMs: number; reactionTimeMs: number; peakFlickVelocity: number }[];
  medianReactionMs: number;
  meanReactionMs: number;
  fastestReactionMs: number;
  falseStarts: number;
  rating: 'Lightning (<200ms)' | 'Fast (200-260ms)' | 'Average (260-340ms)' | 'Sluggish (>340ms)';
}

// 9. Internal Metronome (Pacing Drift) Result
export interface InternalMetronomeResult {
  targetBpm: number;
  pacedBeatsCount: number;
  unpacedRockCount: number;
  realizedBpm: number;
  bpmDriftSigned: number; // realized - target
  driftTendency: 'Rushing' | 'Dragging' | 'Locked In';
  tempoStabilityCV: number; // Interval variability %
  pacingScore: number; // 0-100
}

// 10. Dual-Task Cost (Cognitive-Motor Interference) Result
export interface DualTaskResult {
  baselineStabilityScore: number;
  dualTaskStabilityScore: number;
  dualTaskCostPercentage: number; // % drop in motor performance under mental arithmetic
  mathQuestionsAttempted: number;
  mathAccuracyPercentage: number;
  interferenceCategory: 'High Cognitive Isolation (<10%)' | 'Normal Brain-Load Cost (10-25%)' | 'Heavy Motor Interference (>25%)';
}

// 11. Tilt Maze with Inverted Controls Result
export interface TiltMazeResult {
  totalTimeSeconds: number;
  checkpointsHit: number;
  inversionReactionDelaySeconds: number;
  adaptationRateScore: number; // 0-100
  normalPhaseSpeed: number;
  invertedPhaseSpeed: number;
  motorPlasticityRating: 'Fast Motor Adaptation' | 'Moderate Plasticity' | 'Rigid Motor Pattern';
}

// 12. Fatigue Curve Result
export interface FatigueCurveResult {
  durationSeconds: number; // 60s or 120s
  initialTremorRms: number;
  finalTremorRms: number;
  fatigueSlopePerMin: number; // Rate of tremor amplitude increase
  epochAverages: { timeSec: number; rms: number }[];
  fatigueResistanceScore: number; // 0-100
  classification: 'High Endurance' | 'Normal Fatigue Curve' | 'Rapid Neuromuscular Fatigue';
}

// 13. Two-Player Duel Result
export interface TwoPlayerDuelResult {
  player1Name: string;
  player2Name: string;
  winner: string;
  player1SurvivalTimeSec: number;
  player2SurvivalTimeSec: number;
  wobbleThreshold: number;
  player1MaxWobble: number;
  player2MaxWobble: number;
}
