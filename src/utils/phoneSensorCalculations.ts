/**
 * Mathematical engines for Phone Gyroscope Psychophysics:
 * 1. Steadiness (FFT Tremor Frequency & RMS Micro-Shake)
 * 2. Balance (Romberg Quotient & Visual Reliance Index)
 * 3. Proprioception (Blind Joint Position & Tilt Acuity)
 */

import type {
  MotionSample,
  OrientationSample,
  SteadinessResult,
  PosturalSwayMetrics,
  BalanceTestResult,
  ProprioceptionTrial,
  ProprioceptionResult,
} from '../types/phoneSensors';
import { resampleUniformly, analyzeSignalSpectrum } from './fft';

/**
 * Compute Steadiness & Tremor Spectrum from raw motion samples
 */
export function computeSteadinessResult(samples: MotionSample[]): SteadinessResult {
  if (samples.length < 10) {
    return {
      durationSeconds: 0,
      sampleCount: samples.length,
      effectiveSamplingRateHz: 0,
      peakFrequencyHz: 0,
      peakPower: 0,
      rmsAcceleration: 0,
      steadinessScore: 0,
      classification: 'Significant Movement',
      spectralData: { frequencies: [], power: [] },
      timeSeriesSummary: { times: [], magnitudes: [] },
    };
  }

  const durationMs = samples[samples.length - 1].timestamp - samples[0].timestamp;
  const durationSeconds = Math.max(0.1, durationMs / 1000);
  const effectiveSamplingRateHz = Math.round(samples.length / durationSeconds);

  const timestamps = samples.map((s) => s.timestamp);
  const magnitudes = samples.map((s) => s.magnitude);

  // Mean & RMS Acceleration
  const meanMag = magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length;
  const variance = magnitudes.reduce((acc, v) => acc + (v - meanMag) ** 2, 0) / magnitudes.length;
  const rmsAcceleration = Math.sqrt(variance);

  // Target 1024 power-of-two samples at 50 Hz
  const targetFs = 50;
  const targetLength = 1024;
  const uniformSignal = resampleUniformly(timestamps, magnitudes, targetFs, targetLength);

  // Spectral Analysis (focusing on 3 to 18 Hz physiological tremor band)
  const fftResult = analyzeSignalSpectrum(uniformSignal, targetFs, 3.0, 18.0);

  // Steadiness score (0-100): Lower RMS means higher steadiness
  // RMS of ~0.05 m/s² is extraordinarily steady (100)
  // RMS of ~0.50 m/s² is moderate tremor (50)
  // RMS of >1.50 m/s² is unstable (<20)
  const steadinessScore = Math.max(0, Math.min(100, Math.round(100 - (rmsAcceleration / 0.8) * 60)));

  let classification: SteadinessResult['classification'] = 'Normal Physiological Tremor';
  if (rmsAcceleration < 0.12) {
    classification = 'High Stability';
  } else if (rmsAcceleration <= 0.45) {
    classification = 'Normal Physiological Tremor';
  } else if (rmsAcceleration <= 0.90) {
    classification = 'Elevated Tremor';
  } else {
    classification = 'Significant Movement';
  }

  // Generate downsampled time-series summary for lightweight rendering
  const step = Math.max(1, Math.floor(samples.length / 60));
  const timeSeriesSummary = {
    times: samples.filter((_, i) => i % step === 0).map((s) => Math.round(((s.timestamp - samples[0].timestamp) / 1000) * 10) / 10),
    magnitudes: samples.filter((_, i) => i % step === 0).map((s) => Math.round(s.magnitude * 100) / 100),
  };

  return {
    durationSeconds: Math.round(durationSeconds * 10) / 10,
    sampleCount: samples.length,
    effectiveSamplingRateHz,
    peakFrequencyHz: fftResult.peakFrequencyHz > 0 ? fftResult.peakFrequencyHz : 9.2, // Default physiological peak if perfectly static
    peakPower: fftResult.peakPower,
    rmsAcceleration: Math.round(rmsAcceleration * 1000) / 1000,
    steadinessScore,
    classification,
    spectralData: {
      frequencies: fftResult.frequencies,
      power: fftResult.power,
    },
    timeSeriesSummary,
  };
}

/**
 * Compute Postural Sway Metrics from tilt/orientation samples (beta = pitch, gamma = roll)
 */
export function computePosturalSway(samples: OrientationSample[]): PosturalSwayMetrics {
  if (samples.length < 5) {
    return {
      durationSeconds: 0,
      sampleCount: samples.length,
      pathLength: 0,
      meanVelocity: 0,
      rmsSway: 0,
      area95: 0,
      trajectory: [],
    };
  }

  const durationMs = samples[samples.length - 1].timestamp - samples[0].timestamp;
  const durationSeconds = Math.max(0.1, durationMs / 1000);

  // Mean centering
  const meanBeta = samples.reduce((acc, s) => acc + s.beta, 0) / samples.length;
  const meanGamma = samples.reduce((acc, s) => acc + s.gamma, 0) / samples.length;

  // Centered coordinates: x = medial-lateral (gamma), y = anterior-posterior (beta)
  const trajectory = samples.map((s) => ({
    x: s.gamma - meanGamma,
    y: s.beta - meanBeta,
  }));

  // Path length: sum of Euclidean steps
  let pathLength = 0;
  for (let i = 1; i < trajectory.length; i++) {
    const dx = trajectory[i].x - trajectory[i - 1].x;
    const dy = trajectory[i].y - trajectory[i - 1].y;
    pathLength += Math.sqrt(dx * dx + dy * dy);
  }

  const meanVelocity = pathLength / durationSeconds;

  // RMS Sway displacement
  const sumSqDist = trajectory.reduce((acc, pt) => acc + (pt.x * pt.x + pt.y * pt.y), 0);
  const rmsSway = Math.sqrt(sumSqDist / trajectory.length);

  // 95% Confidence Ellipse Area (Statokinesiogram sway area)
  // Area = 2 * pi * F_0.05(2, N-2) * sqrt(s_xx * s_yy - s_xy^2)
  // For large N, F ≈ 3.00
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const pt of trajectory) {
    sxx += pt.x * pt.x;
    syy += pt.y * pt.y;
    sxy += pt.x * pt.y;
  }
  sxx /= trajectory.length;
  syy /= trajectory.length;
  sxy /= trajectory.length;

  const det = Math.max(0.0001, sxx * syy - sxy * sxy);
  const area95 = Math.PI * 5.991 * Math.sqrt(det); // Chi-square critical value for 95% is 5.991

  // Downsample trajectory for visual rendering (max 50 points)
  const step = Math.max(1, Math.floor(trajectory.length / 50));
  const renderTrajectory = trajectory
    .filter((_, i) => i % step === 0)
    .map((pt) => ({
      x: Math.round(pt.x * 100) / 100,
      y: Math.round(pt.y * 100) / 100,
    }));

  return {
    durationSeconds: Math.round(durationSeconds * 10) / 10,
    sampleCount: samples.length,
    pathLength: Math.round(pathLength * 10) / 10,
    meanVelocity: Math.round(meanVelocity * 100) / 100,
    rmsSway: Math.round(rmsSway * 100) / 100,
    area95: Math.round(area95 * 10) / 10,
    trajectory: renderTrajectory,
  };
}

/**
 * Compute Complete Balance (Romberg) Test Result: Eyes Open vs Eyes Closed
 */
export function computeBalanceResult(
  eyesOpenSamples: OrientationSample[],
  eyesClosedSamples: OrientationSample[]
): BalanceTestResult {
  const openMetrics = computePosturalSway(eyesOpenSamples);
  const closedMetrics = computePosturalSway(eyesClosedSamples);

  // Romberg Ratio = Sway_closed / Sway_open
  // Primary metric is path length or area95
  const baseOpen = Math.max(0.1, openMetrics.pathLength);
  const baseClosed = Math.max(0.1, closedMetrics.pathLength);
  const rombergRatio = Math.round((baseClosed / baseOpen) * 100) / 100;

  // Visual Reliance Index: percentage of balance stabilization reliant on vision
  // (Sway_closed - Sway_open) / Sway_closed
  let visualReliancePercent = 0;
  if (baseClosed > baseOpen) {
    visualReliancePercent = Math.round(((baseClosed - baseOpen) / baseClosed) * 100);
  }
  visualReliancePercent = Math.max(0, Math.min(95, visualReliancePercent));

  let classification: BalanceTestResult['classification'] = 'Balanced Integration';
  if (rombergRatio < 1.3) {
    classification = 'Vestibular/Proprioceptive Dominant';
  } else if (rombergRatio <= 2.2) {
    classification = 'Balanced Integration';
  } else if (rombergRatio <= 3.2) {
    classification = 'Vision Dependent';
  } else {
    classification = 'Extreme Visual Reliance';
  }

  // Postural Stability Score (0-100)
  // Low sway velocity in closed condition + moderate Romberg ratio = high score
  const stabilityPenalty = Math.min(50, closedMetrics.meanVelocity * 5);
  const ratioPenalty = Math.min(30, Math.max(0, (rombergRatio - 1.0) * 15));
  const posturalStabilityScore = Math.max(10, Math.min(100, Math.round(100 - stabilityPenalty - ratioPenalty)));

  return {
    eyesOpen: openMetrics,
    eyesClosed: closedMetrics,
    rombergRatio,
    visualReliancePercent,
    classification,
    posturalStabilityScore,
  };
}

/**
 * Compute Proprioception Test Results from tilt reproduction trials
 */
export function computeProprioceptionResult(trials: ProprioceptionTrial[]): ProprioceptionResult {
  if (trials.length === 0) {
    return {
      trials: [],
      meanAbsoluteErrorDeg: 0,
      meanSignedErrorDeg: 0,
      tendency: 'Calibrated',
      accuracyScore: 0,
      rating: 'C-Tier (Position Drift)',
    };
  }

  const sumAbsError = trials.reduce((acc, t) => acc + t.absoluteErrorDeg, 0);
  const sumSignedError = trials.reduce((acc, t) => acc + t.signedErrorDeg, 0);

  const meanAbsoluteErrorDeg = Math.round((sumAbsError / trials.length) * 10) / 10;
  const meanSignedErrorDeg = Math.round((sumSignedError / trials.length) * 10) / 10;

  let tendency: ProprioceptionResult['tendency'] = 'Calibrated';
  if (meanSignedErrorDeg > 1.2) {
    tendency = 'Overshoot';
  } else if (meanSignedErrorDeg < -1.2) {
    tendency = 'Undershoot';
  }

  // Accuracy Score (0-100): 0 deg error = 100, 10 deg error = ~20
  const accuracyScore = Math.max(0, Math.min(100, Math.round(100 - meanAbsoluteErrorDeg * 8)));

  let rating: ProprioceptionResult['rating'] = 'B-Tier (Average Human Acuity)';
  if (meanAbsoluteErrorDeg < 2.0) {
    rating = 'S-Tier (Gymnast Acuity)';
  } else if (meanAbsoluteErrorDeg <= 4.5) {
    rating = 'A-Tier (Athletic Acuity)';
  } else if (meanAbsoluteErrorDeg <= 8.5) {
    rating = 'B-Tier (Average Human Acuity)';
  } else {
    rating = 'C-Tier (Position Drift)';
  }

  return {
    trials,
    meanAbsoluteErrorDeg,
    meanSignedErrorDeg,
    tendency,
    accuracyScore,
    rating,
  };
}
