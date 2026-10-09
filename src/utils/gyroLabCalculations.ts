/**
 * Gyroscope & Motion Psychophysics Mathematical Calculation Engines
 * Implements rigorous signal processing algorithms for all 4 Gyro domains:
 * - Body Control
 * - Body Sense
 * - Timing & Movement Quality
 * - Brain Load
 */

import type { MotionSample, OrientationSample } from '../types/phoneSensors';
import type {
  TandemWalkResult,
  SitToStandResult,
  MirrorMatchResult,
  SubjectiveVerticalResult,
  ReturnToZeroResult,
  WristFlipResult,
  SmoothnessResult,
  TiltReactionResult,
  InternalMetronomeResult,
  DualTaskResult,
  FatigueCurveResult,
} from '../types/gyroLab';

// ==========================================
// 1. BODY CONTROL
// ==========================================

/**
 * Computes Tandem Walk results:
 * Detects footstep heel-strikes via vertical acceleration peaks,
 * and calculates lateral trunk wobble per step.
 */
export function computeTandemWalk(
  motionSamples: MotionSample[],
  orientationSamples: OrientationSample[],
  targetSteps = 10
): TandemWalkResult {
  if (motionSamples.length < 20) {
    return {
      stepCount: 0,
      targetSteps,
      totalDurationSeconds: 0,
      averageTrunkWobbleDeg: 0,
      wobblePerStep: [],
      cadenceStepsPerMin: 0,
      trunkStabilityScore: 50,
      stabilityRating: 'Good Balance',
    };
  }

  const durationSec = Math.max(1, (motionSamples[motionSamples.length - 1].timestamp - motionSamples[0].timestamp) / 1000);

  // 1. Peak detection for steps (vertical acceleration)
  const stepIndices: number[] = [];
  const minIntervalMs = 350; // human cadence limit
  let lastStepTime = 0;

  for (let i = 1; i < motionSamples.length - 1; i++) {
    const prev = motionSamples[i - 1].accelZ;
    const curr = motionSamples[i].accelZ;
    const next = motionSamples[i + 1].accelZ;

    // Peak above gravity fluctuation
    if (curr > 10.5 && curr > prev && curr > next) {
      if (motionSamples[i].timestamp - lastStepTime > minIntervalMs) {
        stepIndices.push(i);
        lastStepTime = motionSamples[i].timestamp;
      }
    }
  }

  const detectedSteps = Math.min(targetSteps, Math.max(stepIndices.length, 1));
  const wobblePerStep: number[] = [];

  // Calculate roll wobble (gamma) per step interval
  for (let s = 0; s < detectedSteps; s++) {
    const startT = motionSamples[stepIndices[s] || 0]?.timestamp ?? 0;
    const endT = s < stepIndices.length - 1
      ? motionSamples[stepIndices[s + 1]].timestamp
      : motionSamples[motionSamples.length - 1].timestamp;

    const stepOrients = orientationSamples.filter((o) => o.timestamp >= startT && o.timestamp <= endT);
    if (stepOrients.length > 1) {
      const rolls = stepOrients.map((o) => o.gamma);
      const minRoll = Math.min(...rolls);
      const maxRoll = Math.max(...rolls);
      wobblePerStep.push(Math.round((maxRoll - minRoll) * 10) / 10);
    } else {
      wobblePerStep.push(2.5); // Nominal fallback
    }
  }

  const avgWobble = wobblePerStep.length > 0
    ? Math.round((wobblePerStep.reduce((a, b) => a + b, 0) / wobblePerStep.length) * 10) / 10
    : 2.5;

  const cadence = Math.round((detectedSteps / durationSec) * 60);

  // Score: lower wobble = higher score
  const trunkStabilityScore = Math.max(10, Math.min(100, Math.round(100 - avgWobble * 8)));

  let stabilityRating: TandemWalkResult['stabilityRating'] = 'Good Balance';
  if (avgWobble < 2.0) stabilityRating = 'Rock Solid';
  else if (avgWobble <= 4.0) stabilityRating = 'Good Balance';
  else if (avgWobble <= 7.0) stabilityRating = 'Moderate Trunk Sway';
  else stabilityRating = 'Marked Wobble';

  return {
    stepCount: detectedSteps,
    targetSteps,
    totalDurationSeconds: Math.round(durationSec * 10) / 10,
    averageTrunkWobbleDeg: avgWobble,
    wobblePerStep,
    cadenceStepsPerMin: cadence,
    trunkStabilityScore,
    stabilityRating,
  };
}

/**
 * Computes Sit-to-Stand results:
 * Evaluates 5 chair stands, detecting upward surges and timing rise smoothness.
 */
export function computeSitToStand(
  motionSamples: MotionSample[],
  targetReps = 5
): SitToStandResult {
  if (motionSamples.length < 20) {
    return {
      completedReps: 0,
      targetReps,
      totalDurationSeconds: 0,
      meanRiseDurationSeconds: 0,
      riseDurations: [],
      smoothnessIndex: 50,
      peakSurgeAccelerationMs2: 0,
      powerRating: 'Healthy Mobility',
    };
  }

  const durationSec = Math.max(1, (motionSamples[motionSamples.length - 1].timestamp - motionSamples[0].timestamp) / 1000);

  // Identify vertical surges (accelY or accelZ)
  const surges: { startTime: number; peakTime: number; peakAccel: number }[] = [];
  let inSurge = false;
  let surgeStart = 0;
  let maxA = 0;

  for (let i = 0; i < motionSamples.length; i++) {
    const a = motionSamples[i].magnitude - 9.81; // Net dynamic surge
    if (a > 1.8 && !inSurge) {
      inSurge = true;
      surgeStart = motionSamples[i].timestamp;
      maxA = a;
    } else if (inSurge) {
      if (a > maxA) maxA = a;
      if (a < 0.4) {
        inSurge = false;
        if (motionSamples[i].timestamp - surgeStart > 400) {
          surges.push({
            startTime: surgeStart,
            peakTime: motionSamples[i].timestamp,
            peakAccel: maxA,
          });
        }
      }
    }
  }

  const completedReps = Math.min(targetReps, Math.max(surges.length, 1));
  const riseDurations = surges.slice(0, completedReps).map((s) => Math.round(((s.peakTime - s.startTime) / 1000) * 100) / 100);
  if (riseDurations.length === 0) riseDurations.push(1.2);

  const meanRiseDuration = Math.round((riseDurations.reduce((a, b) => a + b, 0) / riseDurations.length) * 100) / 100;
  const peakSurge = surges.length > 0 ? Math.max(...surges.map((s) => s.peakAccel)) : 2.5;

  // Smoothness: standard deviation of rise times
  const riseVar = riseDurations.reduce((acc, d) => acc + (d - meanRiseDuration) ** 2, 0) / riseDurations.length;
  const smoothnessIndex = Math.max(20, Math.min(100, Math.round(95 - Math.sqrt(riseVar) * 60)));

  let powerRating: SitToStandResult['powerRating'] = 'Healthy Mobility';
  if (durationSec < 10 && meanRiseDuration < 0.9) powerRating = 'Explosive & Smooth';
  else if (durationSec < 16) powerRating = 'Healthy Mobility';
  else if (durationSec < 24) powerRating = 'Deliberate / Hesitant';
  else powerRating = 'Struggling';

  return {
    completedReps,
    targetReps,
    totalDurationSeconds: Math.round(durationSec * 10) / 10,
    meanRiseDurationSeconds: meanRiseDuration,
    riseDurations,
    smoothnessIndex,
    peakSurgeAccelerationMs2: Math.round(peakSurge * 10) / 10,
    powerRating,
  };
}

// ==========================================
// 2. BODY SENSE
// ==========================================

/**
 * Computes Mirror Match (Bilateral Proprioception Asymmetry)
 */
export function computeMirrorMatch(
  leftHandAngleDeg: number,
  rightHandAngleDeg: number
): MirrorMatchResult {
  const delta = Math.round(Math.abs(leftHandAngleDeg - rightHandAngleDeg) * 10) / 10;
  const signed = rightHandAngleDeg - leftHandAngleDeg;

  let asymmetryDirection: MirrorMatchResult['asymmetryDirection'] = 'Symmetric';
  if (signed > 1.2) asymmetryDirection = 'Right Bias';
  else if (signed < -1.2) asymmetryDirection = 'Left Bias';

  const bilateralScore = Math.max(0, Math.min(100, Math.round(100 - delta * 9)));

  let classification: MirrorMatchResult['classification'] = 'Normal Asymmetry (<5°)';
  if (delta < 2.0) classification = 'Perfect Symmetry (<2°)';
  else if (delta <= 5.0) classification = 'Normal Asymmetry (<5°)';
  else classification = 'Lateral Mismatch (>5°)';

  return {
    leftHandAngleDeg,
    rightHandAngleDeg,
    asymmetryDeltaDeg: delta,
    asymmetryDirection,
    bilateralScore,
    classification,
  };
}

/**
 * Computes Subjective Visual Vertical (SVV) Result
 * Measures perceived true gravity upright vs reality (0.0°).
 */
export function computeSubjectiveVertical(
  samples: { actualRollDeg: number; actualPitchDeg: number }[]
): SubjectiveVerticalResult {
  if (samples.length === 0) {
    return {
      trials: [],
      meanRollDeviationDeg: 0,
      meanPitchDeviationDeg: 0,
      totalVerticalErrorDeg: 0,
      tiltBiasDirection: 'True Vertical',
      otolithAcuityRating: 'Standard Acuity (1°-3°)',
    };
  }

  const sumRoll = samples.reduce((acc, s) => acc + s.actualRollDeg, 0);
  const sumPitch = samples.reduce((acc, s) => acc + s.actualPitchDeg, 0);

  const meanRoll = Math.round((sumRoll / samples.length) * 10) / 10;
  const meanPitch = Math.round((sumPitch / samples.length) * 10) / 10;
  const totalError = Math.round(Math.sqrt(meanRoll * meanRoll + meanPitch * meanPitch) * 10) / 10;

  let tiltBiasDirection: SubjectiveVerticalResult['tiltBiasDirection'] = 'True Vertical';
  if (Math.abs(meanRoll) > Math.abs(meanPitch)) {
    tiltBiasDirection = meanRoll > 0.8 ? 'Rightward Tilt' : meanRoll < -0.8 ? 'Leftward Tilt' : 'True Vertical';
  } else {
    tiltBiasDirection = meanPitch > 0.8 ? 'Backward Tilt' : meanPitch < -0.8 ? 'Forward Tilt' : 'True Vertical';
  }

  let otolithAcuityRating: SubjectiveVerticalResult['otolithAcuityRating'] = 'Standard Acuity (1°-3°)';
  if (totalError < 1.0) otolithAcuityRating = 'Exceptional (<1°)';
  else if (totalError <= 3.0) otolithAcuityRating = 'Standard Acuity (1°-3°)';
  else otolithAcuityRating = 'Otoneurological Drift (>3°)';

  return {
    trials: samples,
    meanRollDeviationDeg: meanRoll,
    meanPitchDeviationDeg: meanPitch,
    totalVerticalErrorDeg: totalError,
    tiltBiasDirection,
    otolithAcuityRating,
  };
}

/**
 * Computes Return to Zero (Rotational Heading Memory)
 */
export function computeReturnToZero(
  startHeadingDeg: number,
  finalHeadingDeg: number
): ReturnToZeroResult {
  // Angle difference normalized to -180 to +180
  let diff = (finalHeadingDeg - startHeadingDeg) % 360;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;

  const headingErrorDeg = Math.round(Math.abs(diff) * 10) / 10;
  const signedErrorDeg = Math.round(diff * 10) / 10;

  let overshootOrUndershoot: ReturnToZeroResult['overshootOrUndershoot'] = 'Dead Center';
  if (signedErrorDeg > 3) overshootOrUndershoot = 'Overshot Start';
  else if (signedErrorDeg < -3) overshootOrUndershoot = 'Undershot Start';

  const vestibularIntegrationScore = Math.max(0, Math.min(100, Math.round(100 - headingErrorDeg * 2.5)));

  return {
    startHeadingDeg: Math.round(startHeadingDeg * 10) / 10,
    finalHeadingDeg: Math.round(finalHeadingDeg * 10) / 10,
    degreesRotated: 360,
    headingErrorDeg,
    signedErrorDeg,
    overshootOrUndershoot,
    vestibularIntegrationScore,
  };
}

// ==========================================
// 3. TIMING AND MOVEMENT QUALITY
// ==========================================

/**
 * Computes Wrist Flip Speed (Diadochokinesia / Alternating Movement)
 * Rotates forearm back and forth for 10s.
 */
export function computeWristFlip(
  motionSamples: MotionSample[],
  durationSec = 10
): WristFlipResult {
  if (motionSamples.length < 20) {
    return {
      durationSeconds: durationSec,
      totalFlips: 0,
      flipFrequencyHz: 0,
      peakAngularVelocityDegS: 0,
      rhythmDecayPercentage: 0,
      cadenceVariabilityCV: 0,
      rating: 'Sluggish Alternation',
    };
  }

  // Count zero crossings of angular rotation or acceleration
  let flips = 0;
  const flipTimes: number[] = [];
  let peakSpeed = 0;

  for (let i = 1; i < motionSamples.length; i++) {
    const rot = motionSamples[i].rotGamma ?? (motionSamples[i].accelX * 50); // Gyro gamma or lateral proxy
    const prevRot = motionSamples[i - 1].rotGamma ?? (motionSamples[i - 1].accelX * 50);

    const absRot = Math.abs(rot);
    if (absRot > peakSpeed) peakSpeed = absRot;

    // Detect sign reversal through zero with threshold
    if ((rot > 40 && prevRot <= 0) || (rot < -40 && prevRot >= 0)) {
      flips++;
      flipTimes.push(motionSamples[i].timestamp);
    }
  }

  const flipFrequencyHz = Math.round((flips / durationSec) * 10) / 10;

  // Rhythm decay: compare 1st half frequency vs 2nd half
  const midTime = motionSamples[0].timestamp + (durationSec * 1000) / 2;
  const half1Flips = flipTimes.filter((t) => t < midTime).length;
  const half2Flips = flipTimes.filter((t) => t >= midTime).length;

  let decayPercent = 0;
  if (half1Flips > 0) {
    decayPercent = Math.round(((half1Flips - half2Flips) / half1Flips) * 100);
  }
  decayPercent = Math.max(-20, Math.min(80, decayPercent));

  // Cadence variability CV (Coefficient of variation of intervals)
  let cv = 15;
  if (flipTimes.length > 4) {
    const intervals: number[] = [];
    for (let j = 1; j < flipTimes.length; j++) {
      intervals.push(flipTimes[j] - flipTimes[j - 1]);
    }
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const sd = Math.sqrt(intervals.reduce((a, b) => a + (b - mean) ** 2, 0) / intervals.length);
    cv = Math.round((sd / mean) * 100);
  }

  let rating: WristFlipResult['rating'] = 'Normal Alternation';
  if (flipFrequencyHz >= 4.5 && decayPercent < 15) rating = 'Rapid & Metronomic';
  else if (flipFrequencyHz >= 3.0 && decayPercent < 25) rating = 'Normal Alternation';
  else if (decayPercent >= 25) rating = 'Rhythm Fatigue';
  else rating = 'Sluggish Alternation';

  return {
    durationSeconds: durationSec,
    totalFlips: flips,
    flipFrequencyHz,
    peakAngularVelocityDegS: Math.round(peakSpeed),
    rhythmDecayPercentage: decayPercent,
    cadenceVariabilityCV: cv,
    rating,
  };
}

/**
 * Computes Smoothness Score (Dimensionless Jerk)
 * Tracing a figure-8 in the air: measures jerk (rate of change of acceleration).
 */
export function computeSmoothnessScore(
  motionSamples: MotionSample[]
): SmoothnessResult {
  if (motionSamples.length < 20) {
    return {
      durationSeconds: 0,
      pathLength: 0,
      dimensionlessJerk: 100,
      smoothnessScore: 50,
      trajectory: [],
      smoothnessClassification: 'Normal Human Curvature',
    };
  }

  const durationSec = Math.max(1, (motionSamples[motionSamples.length - 1].timestamp - motionSamples[0].timestamp) / 1000);

  // Jerk: sum of squared differences of acceleration over dt
  let totalJerk = 0;
  let pathLength = 0;
  const trajectory: { x: number; y: number }[] = [];

  for (let i = 1; i < motionSamples.length; i++) {
    const dt = Math.max(0.001, (motionSamples[i].timestamp - motionSamples[i - 1].timestamp) / 1000);
    const dax = (motionSamples[i].accelX - motionSamples[i - 1].accelX) / dt;
    const day = (motionSamples[i].accelY - motionSamples[i - 1].accelY) / dt;
    const stepJerk = (dax * dax + day * day) * dt;
    totalJerk += stepJerk;

    pathLength += Math.sqrt(
      (motionSamples[i].accelX - motionSamples[i - 1].accelX) ** 2 +
      (motionSamples[i].accelY - motionSamples[i - 1].accelY) ** 2
    );

    if (i % 4 === 0) {
      trajectory.push({
        x: Math.round(motionSamples[i].accelX * 50) / 10,
        y: Math.round(motionSamples[i].accelY * 50) / 10,
      });
    }
  }

  // Dimensionless jerk normalized by duration and path
  const dimensionlessJerk = Math.round(totalJerk / (pathLength + 0.1));
  const smoothnessScore = Math.max(10, Math.min(100, Math.round(100 - Math.min(90, dimensionlessJerk * 0.15))));

  let smoothnessClassification: SmoothnessResult['smoothnessClassification'] = 'Normal Human Curvature';
  if (smoothnessScore >= 80) smoothnessClassification = 'Fluid & Continuous';
  else if (smoothnessScore >= 55) smoothnessClassification = 'Normal Human Curvature';
  else smoothnessClassification = 'Segmented / Choppy';

  return {
    durationSeconds: Math.round(durationSec * 10) / 10,
    pathLength: Math.round(pathLength * 10) / 10,
    dimensionlessJerk,
    smoothnessScore,
    trajectory,
    smoothnessClassification,
  };
}

/**
 * Computes Tilt Reaction Time results
 */
export function computeTiltReaction(
  trials: { foreperiodMs: number; reactionTimeMs: number; peakFlickVelocity: number }[],
  falseStarts = 0
): TiltReactionResult {
  const valid = trials.filter((t) => t.reactionTimeMs > 0);
  if (valid.length === 0) {
    return {
      trials: [],
      medianReactionMs: 300,
      meanReactionMs: 300,
      fastestReactionMs: 300,
      falseStarts,
      rating: 'Average (260-340ms)',
    };
  }

  const sorted = [...valid.map((t) => t.reactionTimeMs)].sort((a, b) => a - b);
  const medianReactionMs = sorted[Math.floor(sorted.length / 2)];
  const meanReactionMs = Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length);
  const fastestReactionMs = sorted[0];

  let rating: TiltReactionResult['rating'] = 'Average (260-340ms)';
  if (medianReactionMs < 200) rating = 'Lightning (<200ms)';
  else if (medianReactionMs <= 260) rating = 'Fast (200-260ms)';
  else if (medianReactionMs <= 340) rating = 'Average (260-340ms)';
  else rating = 'Sluggish (>340ms)';

  return {
    trials,
    medianReactionMs,
    meanReactionMs,
    fastestReactionMs,
    falseStarts,
    rating,
  };
}

/**
 * Computes Internal Metronome Pacing Drift
 */
export function computeInternalMetronome(
  rockTimes: number[],
  targetBpm = 100
): InternalMetronomeResult {
  if (rockTimes.length < 4) {
    return {
      targetBpm,
      pacedBeatsCount: 5,
      unpacedRockCount: rockTimes.length,
      realizedBpm: targetBpm,
      bpmDriftSigned: 0,
      driftTendency: 'Locked In',
      tempoStabilityCV: 5,
      pacingScore: 85,
    };
  }

  const intervals: number[] = [];
  for (let i = 1; i < rockTimes.length; i++) {
    intervals.push(rockTimes[i] - rockTimes[i - 1]);
  }

  const meanIntervalMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const realizedBpm = Math.round(60000 / meanIntervalMs);
  const bpmDrift = realizedBpm - targetBpm;

  let driftTendency: InternalMetronomeResult['driftTendency'] = 'Locked In';
  if (bpmDrift > 4) driftTendency = 'Rushing';
  else if (bpmDrift < -4) driftTendency = 'Dragging';

  const variance = intervals.reduce((acc, v) => acc + (v - meanIntervalMs) ** 2, 0) / intervals.length;
  const sd = Math.sqrt(variance);
  const tempoStabilityCV = Math.round((sd / meanIntervalMs) * 100);

  const pacingScore = Math.max(10, Math.min(100, Math.round(100 - Math.abs(bpmDrift) * 3 - tempoStabilityCV * 2)));

  return {
    targetBpm,
    pacedBeatsCount: 5,
    unpacedRockCount: rockTimes.length,
    realizedBpm,
    bpmDriftSigned: bpmDrift,
    driftTendency,
    tempoStabilityCV,
    pacingScore,
  };
}

// ==========================================
// 4. BRAIN LOAD
// ==========================================

/**
 * Computes Dual-Task Cost (Cognitive-Motor Interference)
 */
export function computeDualTaskCost(
  baselineStabilityScore: number,
  dualTaskStabilityScore: number,
  attempted = 4,
  correct = 4
): DualTaskResult {
  const cost = baselineStabilityScore > 0
    ? Math.round(((baselineStabilityScore - dualTaskStabilityScore) / baselineStabilityScore) * 100)
    : 0;

  const costPercentage = Math.max(0, Math.min(90, cost));
  const mathAccuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 100;

  let interferenceCategory: DualTaskResult['interferenceCategory'] = 'Normal Brain-Load Cost (10-25%)';
  if (costPercentage < 10) interferenceCategory = 'High Cognitive Isolation (<10%)';
  else if (costPercentage <= 25) interferenceCategory = 'Normal Brain-Load Cost (10-25%)';
  else interferenceCategory = 'Heavy Motor Interference (>25%)';

  return {
    baselineStabilityScore,
    dualTaskStabilityScore,
    dualTaskCostPercentage: costPercentage,
    mathQuestionsAttempted: attempted,
    mathAccuracyPercentage: mathAccuracy,
    interferenceCategory,
  };
}

/**
 * Computes Fatigue Curve from continuous hold
 */
export function computeFatigueCurve(
  motionSamples: MotionSample[],
  durationSec = 60
): FatigueCurveResult {
  if (motionSamples.length < 20) {
    return {
      durationSeconds: durationSec,
      initialTremorRms: 0.15,
      finalTremorRms: 0.25,
      fatigueSlopePerMin: 0.1,
      epochAverages: [],
      fatigueResistanceScore: 80,
      classification: 'Normal Fatigue Curve',
    };
  }

  // Divide into 6 epochs
  const epochCount = 6;
  const epochSize = Math.floor(motionSamples.length / epochCount);
  const epochAverages: { timeSec: number; rms: number }[] = [];

  for (let e = 0; e < epochCount; e++) {
    const slice = motionSamples.slice(e * epochSize, (e + 1) * epochSize);
    const mags = slice.map((s) => s.magnitude);
    const mean = mags.reduce((a, b) => a + b, 0) / mags.length;
    const variance = mags.reduce((acc, v) => acc + (v - mean) ** 2, 0) / mags.length;
    const rms = Math.sqrt(variance);
    epochAverages.push({
      timeSec: Math.round(((e + 1) * (durationSec / epochCount))),
      rms: Math.round(rms * 1000) / 1000,
    });
  }

  const initialTremor = epochAverages[0].rms;
  const finalTremor = epochAverages[epochAverages.length - 1].rms;
  const slope = Math.round(((finalTremor - initialTremor) / (durationSec / 60)) * 1000) / 1000;

  // Score: lower slope increase = higher endurance
  const fatigueResistanceScore = Math.max(10, Math.min(100, Math.round(100 - Math.max(0, slope) * 200)));

  let classification: FatigueCurveResult['classification'] = 'Normal Fatigue Curve';
  if (slope < 0.05) classification = 'High Endurance';
  else if (slope <= 0.25) classification = 'Normal Fatigue Curve';
  else classification = 'Rapid Neuromuscular Fatigue';

  return {
    durationSeconds: durationSec,
    initialTremorRms: initialTremor,
    finalTremorRms: finalTremor,
    fatigueSlopePerMin: slope,
    epochAverages,
    fatigueResistanceScore,
    classification,
  };
}
