import type {
  Point2D,
  RawAcquisitionTrialRecord,
  TargetAcquisitionStats,
  AcquisitionTargetSize,
  AcquisitionDistanceCategory,
  ContinuousTrackingStats,
  TrackingSample,
} from '../types/precisionTracking';

// -------------------------------------------------------------
// KINEMATICS & ACQUISITION METRIC CALCULATIONS
// -------------------------------------------------------------

export function calculateDistance(p1: Point2D, p2: Point2D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculates path efficiency: shortest straight-line distance divided by actual traversed distance.
 * Documented policy:
 * - If shortest == 0 and actual == 0, returns 1.0 (perfect zero-displacement efficiency).
 * - If shortest > 0 and actual == 0, returns 0.0 (impossible physically, handled safely).
 * - Caps efficiency at 1.0 to guard against floating-point jitter.
 */
export function calculatePathEfficiency(shortestPx: number, actualPathPx: number): number {
  if (actualPathPx <= 0.0001) {
    return shortestPx <= 0.0001 ? 1.0 : 0.0;
  }
  return Math.min(1.0, shortestPx / actualPathPx);
}

/**
 * Calculates Target Acquisition statistics from raw scored trial records.
 */
export function calculateTargetAcquisitionStats(
  trials: RawAcquisitionTrialRecord[],
  sessionId: string
): TargetAcquisitionStats {
  const scoredTrials = trials.filter(t => !t.isPractice);
  const total = scoredTrials.length;

  const validHits = scoredTrials.filter(t => t.isValid && t.outcome === 'hit' && t.acquisitionTimeMs !== null);
  const misses = scoredTrials.filter(t => t.outcome === 'miss_button').length;
  const timeouts = scoredTrials.filter(t => t.outcome === 'timeout').length;
  const invalid = scoredTrials.filter(t => !t.isValid || t.outcome === 'invalidated').length;

  const hitRate = total > 0 ? (validHits.length / total) * 100 : 0;
  const timeoutRate = total > 0 ? (timeouts / total) * 100 : 0;

  const hitTimes = validHits.map(h => h.acquisitionTimeMs as number).sort((a, b) => a - b);
  const endpointErrors = validHits.map(h => h.endpointErrorPx);
  const efficiencies = validHits.map(h => h.pathEfficiency);
  const overshoots = validHits.reduce((acc, h) => acc + h.overshootCount, 0);

  // Mean & Median Acquisition Time
  let meanTime = 0;
  let medianTime = 0;
  let stdDevTime = 0;

  if (hitTimes.length > 0) {
    meanTime = hitTimes.reduce((a, b) => a + b, 0) / hitTimes.length;
    const mid = Math.floor(hitTimes.length / 2);
    medianTime = hitTimes.length % 2 !== 0 ? hitTimes[mid] : (hitTimes[mid - 1] + hitTimes[mid]) / 2;

    const variance = hitTimes.reduce((acc, v) => acc + Math.pow(v - meanTime, 2), 0) / (hitTimes.length > 1 ? hitTimes.length - 1 : 1);
    stdDevTime = Math.sqrt(variance);
  }

  const meanError = endpointErrors.length > 0
    ? endpointErrors.reduce((a, b) => a + b, 0) / endpointErrors.length
    : 0;

  const meanEfficiency = efficiencies.length > 0
    ? efficiencies.reduce((a, b) => a + b, 0) / efficiencies.length
    : 0;

  // Breakdown by Target Size
  const sizes: AcquisitionTargetSize[] = ['small', 'medium', 'large'];
  const bySize: TargetAcquisitionStats['bySize'] = {
    small: { count: 0, meanTimeMs: 0, meanErrorPx: 0, hitRate: 0 },
    medium: { count: 0, meanTimeMs: 0, meanErrorPx: 0, hitRate: 0 },
    large: { count: 0, meanTimeMs: 0, meanErrorPx: 0, hitRate: 0 },
  };

  sizes.forEach(sz => {
    const trialsForSz = scoredTrials.filter(t => t.sizeCategory === sz);
    const hitsForSz = trialsForSz.filter(t => t.isValid && t.outcome === 'hit' && t.acquisitionTimeMs !== null);
    const count = trialsForSz.length;
    const hitR = count > 0 ? (hitsForSz.length / count) * 100 : 0;
    const mTime = hitsForSz.length > 0 ? hitsForSz.reduce((acc, h) => acc + (h.acquisitionTimeMs || 0), 0) / hitsForSz.length : 0;
    const mErr = hitsForSz.length > 0 ? hitsForSz.reduce((acc, h) => acc + h.endpointErrorPx, 0) / hitsForSz.length : 0;
    bySize[sz] = {
      count,
      hitRate: Math.round(hitR * 10) / 10,
      meanTimeMs: Math.round(mTime * 10) / 10,
      meanErrorPx: Math.round(mErr * 10) / 10,
    };
  });

  // Breakdown by Distance Category
  const distances: AcquisitionDistanceCategory[] = ['short', 'medium', 'long'];
  const byDistance: TargetAcquisitionStats['byDistance'] = {
    short: { count: 0, meanTimeMs: 0, meanEfficiency: 0, hitRate: 0 },
    medium: { count: 0, meanTimeMs: 0, meanEfficiency: 0, hitRate: 0 },
    long: { count: 0, meanTimeMs: 0, meanEfficiency: 0, hitRate: 0 },
  };

  distances.forEach(d => {
    const trialsForD = scoredTrials.filter(t => t.distanceCategory === d);
    const hitsForD = trialsForD.filter(t => t.isValid && t.outcome === 'hit' && t.acquisitionTimeMs !== null);
    const count = trialsForD.length;
    const hitR = count > 0 ? (hitsForD.length / count) * 100 : 0;
    const mTime = hitsForD.length > 0 ? hitsForD.reduce((acc, h) => acc + (h.acquisitionTimeMs || 0), 0) / hitsForD.length : 0;
    const mEff = hitsForD.length > 0 ? hitsForD.reduce((acc, h) => acc + h.pathEfficiency, 0) / hitsForD.length : 0;
    byDistance[d] = {
      count,
      hitRate: Math.round(hitR * 10) / 10,
      meanTimeMs: Math.round(mTime * 10) / 10,
      meanEfficiency: Math.round(mEff * 100) / 100,
    };
  });

  return {
    sessionId,
    totalTrialsAttempted: total,
    scoredTrialsCount: total,
    validHitsCount: validHits.length,
    missCount: misses,
    timeoutCount: timeouts,
    invalidCount: invalid,
    hitRatePercentage: Math.round(hitRate * 10) / 10,
    timeoutRatePercentage: Math.round(timeoutRate * 10) / 10,
    medianAcquisitionTimeMs: Math.round(medianTime * 10) / 10,
    meanAcquisitionTimeMs: Math.round(meanTime * 10) / 10,
    stdDevAcquisitionTimeMs: Math.round(stdDevTime * 10) / 10,
    meanEndpointErrorPx: Math.round(meanError * 10) / 10,
    meanPathEfficiency: Math.round(meanEfficiency * 100) / 100,
    totalOvershoots: overshoots,
    meanOvershootsPerHit: validHits.length > 0 ? Math.round((overshoots / validHits.length) * 10) / 10 : 0,
    bySize,
    byDistance,
  };
}

// -------------------------------------------------------------
// CONTINUOUS TRACKING METRIC CALCULATIONS
// -------------------------------------------------------------

export function calculateTrackingStats(
  samples: TrackingSample[],
  sessionId: string,
  pattern: ContinuousTrackingStats['pattern'],
  difficulty: ContinuousTrackingStats['difficulty'],
  targetRadiusPx: number
): ContinuousTrackingStats {
  const validSamples = samples.filter(s => !s.isInterrupted);
  const n = validSamples.length;

  if (n === 0) {
    return {
      sessionId,
      pattern,
      difficulty,
      totalDurationMs: 0,
      totalSamplesRecorded: 0,
      targetRadiusPx,
      meanTrackingErrorPx: 0,
      rmseTrackingErrorPx: 0,
      maxTrackingErrorPx: 0,
      timeInTargetPercentage: 0,
      totalCursorDistancePx: 0,
      correctionFrequencyHz: 0,
      estimatedLagMs: null,
    };
  }

  const errors = validSamples.map(s => s.distanceErrorPx);
  const meanError = errors.reduce((a, b) => a + b, 0) / n;
  const maxError = Math.max(...errors);

  // Root-Mean-Square Error (RMSE)
  const sumSq = errors.reduce((acc, err) => acc + err * err, 0);
  const rmse = Math.sqrt(sumSq / n);

  // Time in target %
  const inTargetCount = validSamples.filter(s => s.isInsideTargetRadius).length;
  const timeInTargetPct = (inTargetCount / n) * 100;

  // Total cursor distance and velocity reversals (correction frequency)
  let totalDistance = 0;
  let reversals = 0;
  let prevDx = 0;
  let prevDy = 0;

  for (let i = 1; i < n; i++) {
    const s1 = validSamples[i - 1];
    const s2 = validSamples[i];
    const dx = s2.cursorX - s1.cursorX;
    const dy = s2.cursorY - s1.cursorY;
    totalDistance += Math.sqrt(dx * dx + dy * dy);

    // Directional reversal detection (dot product < 0)
    if (i > 1 && (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5)) {
      const dot = dx * prevDx + dy * prevDy;
      if (dot < -0.1) {
        reversals++;
      }
    }
    if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
      prevDx = dx;
      prevDy = dy;
    }
  }

  const durationMs = validSamples[n - 1].elapsedMs - validSamples[0].elapsedMs;
  const durationSec = durationMs > 0 ? durationMs / 1000 : 1;
  const correctionHz = reversals / durationSec;

  // Approximate tracking lag estimation using discrete lag cross-correlation
  // Only reported if sample size is sufficient (>= 60 samples) and lag is defensible (< 600ms)
  let estimatedLagMs: number | null = null;
  if (n >= 60) {
    // Cross-correlate cursor and target X/Y coordinates across window [-10..+30 samples]
    const sampleIntervalMs = durationMs / (n - 1);
    const maxLagSamples = Math.min(25, Math.floor(600 / sampleIntervalMs));
    let bestCorrelation = -Infinity;
    let bestLagIndex = 0;

    for (let lag = 0; lag <= maxLagSamples; lag++) {
      let dotProd = 0;
      let count = 0;
      for (let i = lag; i < n; i++) {
        const c = validSamples[i];
        const t = validSamples[i - lag];
        // Distance error between cursor(t) and target(t - lag)
        const d = calculateDistance(
          { x: c.cursorX, y: c.cursorY },
          { x: t.targetX, y: t.targetY }
        );
        dotProd += d;
        count++;
      }
      const avgDist = count > 0 ? dotProd / count : Infinity;
      // Lower distance indicates higher alignment at this lag
      const score = -avgDist;
      if (score > bestCorrelation) {
        bestCorrelation = score;
        bestLagIndex = lag;
      }
    }

    if (bestLagIndex > 0) {
      estimatedLagMs = Math.round(bestLagIndex * sampleIntervalMs);
    } else {
      estimatedLagMs = 0;
    }
  }

  return {
    sessionId,
    pattern,
    difficulty,
    totalDurationMs: Math.round(durationMs),
    totalSamplesRecorded: n,
    targetRadiusPx,
    meanTrackingErrorPx: Math.round(meanError * 10) / 10,
    rmseTrackingErrorPx: Math.round(rmse * 10) / 10,
    maxTrackingErrorPx: Math.round(maxError * 10) / 10,
    timeInTargetPercentage: Math.round(timeInTargetPct * 10) / 10,
    totalCursorDistancePx: Math.round(totalDistance),
    correctionFrequencyHz: Math.round(correctionHz * 10) / 10,
    estimatedLagMs,
  };
}
