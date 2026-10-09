/**
 * Self-test suite for Phone Gyroscope calculations & FFT tremor detection
 */

import { computeSteadinessResult, computeBalanceResult, computeProprioceptionResult } from './phoneSensorCalculations';
import { analyzeSignalSpectrum, resampleUniformly } from './fft';
import type { MotionSample, OrientationSample, ProprioceptionTrial } from '../types/phoneSensors';

export function runPhoneSensorSelfTests(): { passed: boolean; details: string[] } {
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

  // 1. FFT Synthetic Sine Wave Peak Detection (10 Hz signal at 50 Hz Fs)
  const fs = 50;
  const n = 1024;
  const testFreq = 10.0;
  const syntheticSignal = new Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / fs;
    // 10 Hz tremor with amplitude 0.2 m/s² + small noise
    syntheticSignal[i] = 0.2 * Math.sin(2 * Math.PI * testFreq * t) + 0.02 * Math.sin(2 * Math.PI * 2 * t);
  }

  const fft = analyzeSignalSpectrum(syntheticSignal, fs, 3.0, 18.0);
  assert(
    Math.abs(fft.peakFrequencyHz - 10.0) <= 0.5,
    `FFT peak detection accurately identifies 10 Hz synthetic tremor (detected: ${fft.peakFrequencyHz} Hz)`
  );
  assert(fft.power.length > 0, 'FFT power spectrum array generated');

  // 2. Uniform Resampling
  const nonUniformT = [0, 22, 39, 61, 80, 102];
  const nonUniformV = [0, 1, 2, 3, 4, 5];
  const resampled = resampleUniformly(nonUniformT, nonUniformV, 50, 4);
  assert(resampled.length === 4, 'Resampling returns requested power-of-two length');

  // 3. Steadiness Test Engine
  const motionSamples: MotionSample[] = [];
  for (let i = 0; i < 200; i++) {
    const t = i * 20; // 50 Hz, 4 seconds
    const timeSec = t / 1000;
    const shake = 0.15 * Math.sin(2 * Math.PI * 9.0 * timeSec);
    motionSamples.push({
      timestamp: t,
      accelX: shake,
      accelY: 0,
      accelZ: 9.81,
      magnitude: 9.81 + shake,
    });
  }

  const steadiness = computeSteadinessResult(motionSamples);
  assert(steadiness.sampleCount === 200, 'Steadiness records correct sample count');
  assert(steadiness.rmsAcceleration > 0, 'Steadiness calculates positive RMS acceleration');
  assert(
    steadiness.classification === 'Normal Physiological Tremor' || steadiness.classification === 'High Stability',
    `Steadiness classifies realistic tremor: ${steadiness.classification}`
  );

  // 4. Balance Test (Romberg Ratio: Open vs Closed)
  const openSamples: OrientationSample[] = [];
  const closedSamples: OrientationSample[] = [];
  for (let i = 0; i < 100; i++) {
    const t = i * 50;
    // Open eyes: tight sway (±0.5 deg)
    openSamples.push({
      timestamp: t,
      alpha: 0,
      beta: Math.sin(i * 0.1) * 0.5,
      gamma: Math.cos(i * 0.1) * 0.5,
    });
    // Closed eyes: 2.2x larger sway (±1.1 deg)
    closedSamples.push({
      timestamp: t,
      alpha: 0,
      beta: Math.sin(i * 0.1) * 1.1,
      gamma: Math.cos(i * 0.1) * 1.1,
    });
  }

  const balance = computeBalanceResult(openSamples, closedSamples);
  assert(
    balance.rombergRatio >= 2.0 && balance.rombergRatio <= 2.4,
    `Romberg ratio accurately calculates ~2.2x sway increase with eyes closed (got: ${balance.rombergRatio})`
  );
  assert(
    balance.visualReliancePercent >= 45 && balance.visualReliancePercent <= 60,
    `Visual reliance index reflects ~50% visual dependence (got: ${balance.visualReliancePercent}%)`
  );

  // 5. Proprioception Test Accuracy & Tendency
  const trials: ProprioceptionTrial[] = [
    {
      trialIndex: 1,
      targetAngleDeg: 30.0,
      actualAngleDeg: 33.5,
      signedErrorDeg: 3.5,
      absoluteErrorDeg: 3.5,
      direction: 'pitch',
      confidenceDurationMs: 1500,
    },
    {
      trialIndex: 2,
      targetAngleDeg: 45.0,
      actualAngleDeg: 48.0,
      signedErrorDeg: 3.0,
      absoluteErrorDeg: 3.0,
      direction: 'pitch',
      confidenceDurationMs: 1600,
    },
  ];

  const proprio = computeProprioceptionResult(trials);
  assert(proprio.meanAbsoluteErrorDeg === 3.3, 'Proprioception mean absolute error is 3.3°');
  assert(proprio.tendency === 'Overshoot', 'Proprioception detects systematic overshoot tendency');
  assert(proprio.rating === 'A-Tier (Athletic Acuity)', 'Proprioception ratings classified properly');

  return { passed: allPassed, details };
}
