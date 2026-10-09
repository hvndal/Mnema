import type { RawTrialRecord, ReactionExperimentStats } from '../types/experiment';

/**
 * Calculates psychophysics statistical summary from raw trials.
 * Strictly excludes premature, timed-out, incorrect, and invalidated trials from reaction-time metrics.
 */
export function calculateExperimentStats(
  trials: RawTrialRecord[],
  sessionId: string,
  mode: RawTrialRecord['experimentMode']
): ReactionExperimentStats {
  // Only evaluate non-practice scored trials
  const scoredTrials = trials.filter(t => !t.isPractice);

  // Valid reaction hits
  const validHitTrials = scoredTrials.filter(
    t => t.isValid && t.outcome === 'correct_hit' && t.responseTimeMs !== null && t.responseTimeMs > 0
  );

  const validTimes = validHitTrials.map(t => t.responseTimeMs as number).sort((a, b) => a - b);

  // Counts
  const prematureCount = scoredTrials.filter(t => t.outcome === 'premature').length;
  const timedOutCount = scoredTrials.filter(t => t.outcome === 'omission_timeout').length;
  const incorrectChoiceCount = scoredTrials.filter(t => t.outcome === 'incorrect_choice').length;
  const correctWithholdsCount = scoredTrials.filter(t => t.outcome === 'correct_withhold').length;
  const falseAlarmsCount = scoredTrials.filter(t => t.outcome === 'false_alarm').length;

  // Accuracy calculation depending on paradigm
  let accuracyPercentage = 0;
  if (scoredTrials.length > 0) {
    if (mode === 'gonogo') {
      const totalCorrect = validHitTrials.length + correctWithholdsCount;
      accuracyPercentage = Math.round((totalCorrect / scoredTrials.length) * 1000) / 10;
    } else {
      accuracyPercentage = Math.round((validHitTrials.length / scoredTrials.length) * 1000) / 10;
    }
  }

  if (validTimes.length === 0) {
    return {
      sessionId,
      protocolVersion: '2.1-controller-psychophysics',
      mode,
      totalTrialsAttempted: scoredTrials.length,
      scoredTrialsCount: scoredTrials.length,
      validHitsCount: 0,
      meanMs: 0,
      medianMs: 0,
      fastestMs: 0,
      slowestMs: 0,
      stdDevMs: 0,
      iqrMs: 0,
      accuracyPercentage,
      prematureCount,
      timedOutCount,
      incorrectChoiceCount,
      correctWithholdsCount,
      falseAlarmsCount,
      distribution: [],
    };
  }

  // Mean
  const sum = validTimes.reduce((acc, v) => acc + v, 0);
  const mean = sum / validTimes.length;

  // Median (Primary summary metric)
  const mid = Math.floor(validTimes.length / 2);
  const median = validTimes.length % 2 !== 0 
    ? validTimes[mid] 
    : (validTimes[mid - 1] + validTimes[mid]) / 2;

  // Standard Deviation
  const variance = validTimes.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (validTimes.length > 1 ? validTimes.length - 1 : 1);
  const stdDev = Math.sqrt(variance);

  // Interquartile Range (IQR)
  const q1 = quantile(validTimes, 0.25);
  const q3 = quantile(validTimes, 0.75);
  const iqr = q3 - q1;

  // Response Time Distribution (Histogram: 5 bins)
  const min = validTimes[0];
  const max = validTimes[validTimes.length - 1];
  const binCount = Math.min(5, Math.max(3, Math.ceil(Math.sqrt(validTimes.length))));
  const range = Math.max(max - min, 20);
  const binWidth = range / binCount;
  const distribution: { binStart: number; binEnd: number; count: number }[] = [];

  for (let i = 0; i < binCount; i++) {
    const bStart = Math.round(min + i * binWidth);
    const bEnd = Math.round(min + (i + 1) * binWidth);
    distribution.push({ binStart: bStart, binEnd: bEnd, count: 0 });
  }

  for (const time of validTimes) {
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
    sessionId,
    protocolVersion: '2.1-controller-psychophysics',
    mode,
    totalTrialsAttempted: scoredTrials.length,
    scoredTrialsCount: scoredTrials.length,
    validHitsCount: validTimes.length,
    meanMs: Math.round(mean * 10) / 10,
    medianMs: Math.round(median * 10) / 10,
    fastestMs: Math.round(min * 10) / 10,
    slowestMs: Math.round(max * 10) / 10,
    stdDevMs: Math.round(stdDev * 10) / 10,
    iqrMs: Math.round(iqr * 10) / 10,
    accuracyPercentage,
    prematureCount,
    timedOutCount,
    incorrectChoiceCount,
    correctWithholdsCount,
    falseAlarmsCount,
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
