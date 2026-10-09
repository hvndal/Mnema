import type { SingleTrialResult, PsychophysicsStats } from '../types';

/**
 * Computes comprehensive psychophysics statistics from a batch of trials.
 */
export function calculatePsychophysicsStats(trials: SingleTrialResult[]): PsychophysicsStats {
  const validTimes = trials
    .filter(t => !t.fault && t.reactionTimeMs > 0)
    .map(t => t.reactionTimeMs);

  const falseStarts = trials.filter(t => t.fault && t.faultReason === 'early_press').length;
  const wrongInputs = trials.filter(t => t.fault && (t.faultReason === 'wrong_button' || t.faultReason === 'nogo_fail')).length;

  if (validTimes.length === 0) {
    return {
      totalTrials: trials.length,
      validTrials: 0,
      falseStarts,
      wrongInputs,
      mean: 0,
      median: 0,
      fastest: 0,
      slowest: 0,
      stdDev: 0,
      iqr: 0,
      fatigueSlope: 0,
      distribution: [],
    };
  }

  // Sort ascending for quartiles and median
  const sorted = [...validTimes].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  // Mean
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const mean = sum / sorted.length;

  // Median
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 !== 0 
    ? sorted[mid] 
    : (sorted[mid - 1] + sorted[mid]) / 2;

  // Standard deviation (Jitter / neuromotor variability)
  const variance = sorted.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (sorted.length > 1 ? sorted.length - 1 : 1);
  const stdDev = Math.sqrt(variance);

  // Interquartile Range (IQR)
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;

  // Fatigue slope via simple linear regression (X: trial index, Y: reactionTimeMs)
  // Positive slope = latency increased over time (fatigue), Negative slope = latency decreased (learning/warmup)
  let fatigueSlope = 0;
  const validTrialsWithIndex = trials
    .map((t, idx) => ({ idx, time: t.reactionTimeMs, valid: !t.fault }))
    .filter(t => t.valid);

  if (validTrialsWithIndex.length > 1) {
    const n = validTrialsWithIndex.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;
    for (const pt of validTrialsWithIndex) {
      sumX += pt.idx;
      sumY += pt.time;
      sumXY += pt.idx * pt.time;
      sumXX += pt.idx * pt.idx;
    }
    const denom = n * sumXX - sumX * sumX;
    if (denom !== 0) {
      fatigueSlope = (n * sumXY - sumX * sumY) / denom;
    }
  }

  // Binned Distribution (Histogram: 5 or 6 bins)
  const binCount = Math.min(6, Math.max(3, Math.ceil(Math.sqrt(sorted.length))));
  const range = Math.max(max - min, 20);
  const binWidth = range / binCount;
  const distribution: { binStart: number; binEnd: number; count: number }[] = [];

  for (let i = 0; i < binCount; i++) {
    const bStart = Math.round(min + i * binWidth);
    const bEnd = Math.round(min + (i + 1) * binWidth);
    distribution.push({ binStart: bStart, binEnd: bEnd, count: 0 });
  }

  for (const time of sorted) {
    let placed = false;
    for (let i = 0; i < binCount; i++) {
      if (time >= distribution[i].binStart && (i === binCount - 1 ? time <= distribution[i].binEnd : time < distribution[i].binEnd)) {
        distribution[i].count++;
        placed = true;
        break;
      }
    }
    if (!placed && distribution.length > 0) {
      distribution[distribution.length - 1].count++;
    }
  }

  return {
    totalTrials: trials.length,
    validTrials: validTimes.length,
    falseStarts,
    wrongInputs,
    mean: Math.round(mean * 10) / 10,
    median: Math.round(median * 10) / 10,
    fastest: Math.round(min * 10) / 10,
    slowest: Math.round(max * 10) / 10,
    stdDev: Math.round(stdDev * 10) / 10,
    iqr: Math.round(iqr * 10) / 10,
    fatigueSlope: Math.round(fatigueSlope * 100) / 100,
    distribution,
  };
}

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  } else {
    return sorted[base];
  }
}
