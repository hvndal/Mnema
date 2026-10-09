import type { StickCalibrationData } from '../types/telemetry';

export function createInitialStickCalibration(
  label: string,
  axisXIndex: number,
  axisYIndex: number
): StickCalibrationData {
  return {
    label,
    axisXIndex,
    axisYIndex,
    isCalibratingCenter: false,
    isCalibratingRange: false,
    centerSampleCount: 0,
    restingCenter: { x: 0, y: 0 },
    restingNoise: { x: 0, y: 0 },
    observedMin: { x: 0, y: 0 },
    observedMax: { x: 0, y: 0 },
    recommendedDeadzone: 0.05,
  };
}

/**
 * Accumulates resting center position samples
 */
export function updateCenterCalibration(
  calibration: StickCalibrationData,
  rawX: number,
  rawY: number
): StickCalibrationData {
  const count = calibration.centerSampleCount + 1;
  // Running average
  const newCenterX = calibration.restingCenter.x + (rawX - calibration.restingCenter.x) / count;
  const newCenterY = calibration.restingCenter.y + (rawY - calibration.restingCenter.y) / count;

  // Track max observed deviation from average during rest
  const devX = Math.abs(rawX - newCenterX);
  const devY = Math.abs(rawY - newCenterY);
  const noiseX = Math.max(calibration.restingNoise.x, devX);
  const noiseY = Math.max(calibration.restingNoise.y, devY);

  // Recommended deadzone: resting offset magnitude + 3x noise buffer (safety ceiling)
  const offsetMag = Math.sqrt(newCenterX * newCenterX + newCenterY * newCenterY);
  const maxNoise = Math.max(noiseX, noiseY);
  const recommendedDeadzone = Math.min(0.35, Math.max(0.04, offsetMag + maxNoise * 2.5));

  return {
    ...calibration,
    centerSampleCount: count,
    restingCenter: {
      x: Math.round(newCenterX * 1000) / 1000,
      y: Math.round(newCenterY * 1000) / 1000,
    },
    restingNoise: {
      x: Math.round(noiseX * 1000) / 1000,
      y: Math.round(noiseY * 1000) / 1000,
    },
    recommendedDeadzone: Math.round(recommendedDeadzone * 1000) / 1000,
  };
}

/**
 * Accumulates range motion (full extent observed)
 */
export function updateRangeCalibration(
  calibration: StickCalibrationData,
  rawX: number,
  rawY: number
): StickCalibrationData {
  return {
    ...calibration,
    observedMin: {
      x: Math.round(Math.min(calibration.observedMin.x, rawX) * 1000) / 1000,
      y: Math.round(Math.min(calibration.observedMin.y, rawY) * 1000) / 1000,
    },
    observedMax: {
      x: Math.round(Math.max(calibration.observedMax.x, rawX) * 1000) / 1000,
      y: Math.round(Math.max(calibration.observedMax.y, rawY) * 1000) / 1000,
    },
  };
}
