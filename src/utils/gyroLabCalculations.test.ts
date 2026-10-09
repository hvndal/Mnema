/**
 * Self-test suite for Gyro Lab mathematical calculations
 */

import {
  computeTandemWalk,
  computeSitToStand,
  computeMirrorMatch,
  computeSubjectiveVertical,
  computeReturnToZero,
  computeWristFlip,
  computeSmoothnessScore,
  computeTiltReaction,
  computeInternalMetronome,
  computeDualTaskCost,
  computeFatigueCurve,
} from './gyroLabCalculations';
import type { MotionSample, OrientationSample } from '../types/phoneSensors';

export function runGyroLabSelfTests(): { passed: boolean; details: string[] } {
  const details: string[] = [];
  let allPassed = true;

  function assert(condition: boolean, message: string) {
    if (!condition) {
      allPassed = false;
      details.push(`[FAIL] ${message}`);
    } else {
      details.push(`[PASS] ${message}`);
    }
  }

  // 1. Tandem Walk
  const tandemMotion: MotionSample[] = [];
  const tandemOrient: OrientationSample[] = [];
  for (let i = 0; i < 200; i++) {
    const t = i * 50; // 10s
    // Periodic step bounces every 1000ms
    const stepPeak = (i % 20 === 0) ? 12.0 : 9.81;
    tandemMotion.push({ timestamp: t, accelX: 0, accelY: 0, accelZ: stepPeak, magnitude: stepPeak });
    tandemOrient.push({ timestamp: t, alpha: 0, beta: 0, gamma: Math.sin(i * 0.2) * 2.0 });
  }
  const tandemResult = computeTandemWalk(tandemMotion, tandemOrient, 10);
  assert(tandemResult.stepCount > 0, `Tandem Walk detects steps (got: ${tandemResult.stepCount})`);
  assert(tandemResult.averageTrunkWobbleDeg > 0, 'Tandem Walk calculates trunk wobble in degrees');

  // 2. Sit-to-Stand
  const sitMotion: MotionSample[] = [];
  for (let i = 0; i < 300; i++) {
    const t = i * 40; // 12s
    // 5 surges of acceleration
    const isSurge = (i % 50 >= 10 && i % 50 <= 25);
    const a = isSurge ? 12.5 : 9.81;
    sitMotion.push({ timestamp: t, accelX: 0, accelY: 0, accelZ: a, magnitude: a });
  }
  const sitResult = computeSitToStand(sitMotion, 5);
  assert(sitResult.completedReps > 0, `Sit-to-stand records completed reps (got: ${sitResult.completedReps})`);
  assert(sitResult.smoothnessIndex >= 20, 'Sit-to-stand produces valid smoothness index');

  // 3. Mirror Match
  const mirror1 = computeMirrorMatch(30.0, 31.5);
  assert(mirror1.asymmetryDeltaDeg === 1.5, 'Mirror match detects 1.5° asymmetry');
  assert(mirror1.classification === 'Perfect Symmetry (<2°)', 'Mirror match classifies perfect symmetry');

  const mirror2 = computeMirrorMatch(30.0, 37.0);
  assert(mirror2.asymmetryDirection === 'Right Bias', 'Mirror match detects rightward asymmetry bias');
  assert(mirror2.classification === 'Lateral Mismatch (>5°)', 'Mirror match classifies lateral mismatch');

  // 4. Subjective Visual Vertical
  const svv = computeSubjectiveVertical([
    { actualRollDeg: 1.2, actualPitchDeg: 0.5 },
    { actualRollDeg: 1.6, actualPitchDeg: 0.3 },
  ]);
  assert(svv.meanRollDeviationDeg === 1.4, 'SVV computes mean roll deviation 1.4°');
  assert(svv.tiltBiasDirection === 'Rightward Tilt', 'SVV identifies rightward tilt bias');

  // 5. Return to Zero
  const rtz = computeReturnToZero(10.0, 14.5);
  assert(rtz.headingErrorDeg === 4.5, 'Return to zero calculates 4.5° heading error');
  assert(rtz.overshootOrUndershoot === 'Overshot Start', 'Return to zero detects overshot start');

  // 6. Wrist Flip Speed
  const flipMotion: MotionSample[] = [];
  for (let i = 0; i < 200; i++) {
    const t = i * 50; // 10s
    // 4 Hz oscillation in rotGamma
    const rot = 120 * Math.sin(2 * Math.PI * 4.0 * (t / 1000));
    flipMotion.push({ timestamp: t, accelX: 0, accelY: 0, accelZ: 9.81, magnitude: 9.81, rotGamma: rot });
  }
  const flipResult = computeWristFlip(flipMotion, 10);
  assert(flipResult.totalFlips >= 15, `Wrist flip detects rapid alternating flips (got: ${flipResult.totalFlips})`);
  assert(flipResult.flipFrequencyHz > 0, 'Wrist flip calculates flip frequency');

  // 7. Smoothness Jerk
  const smoothMotion: MotionSample[] = [];
  for (let i = 0; i < 100; i++) {
    const t = i * 40;
    // Smooth figure-8 acceleration
    smoothMotion.push({
      timestamp: t,
      accelX: Math.sin(i * 0.1) * 2,
      accelY: Math.sin(i * 0.2) * 2,
      accelZ: 9.81,
      magnitude: 9.81,
    });
  }
  const smoothness = computeSmoothnessScore(smoothMotion);
  assert(smoothness.smoothnessScore > 50, 'Smoothness engine awards high score to continuous figure-8');

  // 8. Tilt Reaction Time
  const tiltRx = computeTiltReaction([
    { foreperiodMs: 2000, reactionTimeMs: 220, peakFlickVelocity: 150 },
    { foreperiodMs: 3100, reactionTimeMs: 240, peakFlickVelocity: 180 },
    { foreperiodMs: 1800, reactionTimeMs: 210, peakFlickVelocity: 160 },
  ]);
  assert(tiltRx.medianReactionMs === 220, 'Tilt reaction computes median 220ms');
  assert(tiltRx.rating === 'Fast (200-260ms)', 'Tilt reaction rates fast tier');

  // 9. Internal Metronome
  const metronomeTimes = [0, 600, 1200, 1800, 2400, 3000]; // 100 BPM exactly
  const metronome = computeInternalMetronome(metronomeTimes, 100);
  assert(metronome.realizedBpm === 100, 'Internal metronome detects accurate 100 BPM');
  assert(metronome.driftTendency === 'Locked In', 'Internal metronome classifies locked in tempo');

  // 10. Dual-Task Cost
  const dual = computeDualTaskCost(85, 68, 5, 5);
  assert(dual.dualTaskCostPercentage === 20, 'Dual-task cost calculates exactly 20% drop (85 -> 68)');
  assert(dual.interferenceCategory === 'Normal Brain-Load Cost (10-25%)', 'Dual-task cost classifies normal cost');

  // 11. Fatigue Curve
  const fatigueMotion: MotionSample[] = [];
  for (let i = 0; i < 300; i++) {
    const t = i * 200; // 60s
    // Amplitude increases over time from 0.1 to 0.4
    const amp = 0.1 + (i / 300) * 0.3;
    const noise = amp * (Math.random() - 0.5);
    fatigueMotion.push({ timestamp: t, accelX: noise, accelY: noise, accelZ: 9.81 + noise, magnitude: 9.81 + noise });
  }
  const fatigue = computeFatigueCurve(fatigueMotion, 60);
  assert(fatigue.finalTremorRms > fatigue.initialTremorRms, 'Fatigue curve tracks tremor amplitude growth over time');

  return { passed: allPassed, details };
}
