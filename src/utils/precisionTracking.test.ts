import {
  calculateDistance,
  calculatePathEfficiency,
  calculateTargetAcquisitionStats,
  calculateTrackingStats,
} from './precisionTrackingStats';
import type { RawAcquisitionTrialRecord, TrackingSample } from '../types/precisionTracking';

/**
 * Deterministic unit-test assertion runner for precision & tracking metric calculations.
 * Run in console or verified during builds.
 */
export function runPrecisionTrackingSelfTests(): { passed: boolean; details: string[] } {
  const details: string[] = [];
  let allPassed = true;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      details.push(`[PASS] ${testName}`);
    } else {
      details.push(`[FAIL] ${testName}`);
      allPassed = false;
    }
  }

  // 1. Distance formula
  const d1 = calculateDistance({ x: 0, y: 0 }, { x: 3, y: 4 });
  assert(Math.abs(d1 - 5) < 0.0001, 'Euclidean distance (3,4,5 triangle)');

  // 2. Path Efficiency Edge Cases
  assert(calculatePathEfficiency(0, 0) === 1.0, 'Zero-displacement path efficiency policy (0 / 0 = 1.0)');
  assert(calculatePathEfficiency(100, 100) === 1.0, 'Straight line path efficiency (100 / 100 = 1.0)');
  assert(calculatePathEfficiency(100, 200) === 0.5, 'Meandering path efficiency (100 / 200 = 0.5)');
  assert(calculatePathEfficiency(100, 50) === 1.0, 'Path efficiency upper bound capped at 1.0');

  // 3. Acquisition Stats aggregation
  const dummyTrial: RawAcquisitionTrialRecord = {
    sessionId: 'test-1',
    protocolVersion: '3.0',
    isPractice: false,
    trialNumber: 1,
    targetId: 't1',
    targetX: 100,
    targetY: 100,
    targetRadius: 20,
    sizeCategory: 'medium',
    distanceCategory: 'short',
    cursorStartX: 0,
    cursorStartY: 0,
    cursorFinalX: 105,
    cursorFinalY: 100,
    targetAppearanceTimeMs: 1000,
    confirmationTimeMs: 1600,
    acquisitionTimeMs: 600,
    shortestDistancePx: 141.42,
    actualPathLengthPx: 150,
    pathEfficiency: 0.94,
    endpointErrorPx: 5.0,
    overshootCount: 0,
    outcome: 'hit',
    isValid: true,
    invalidationReason: null,
  };

  const acqStats = calculateTargetAcquisitionStats([dummyTrial], 'test-1');
  assert(acqStats.scoredTrialsCount === 1, 'Target acquisition scored count');
  assert(acqStats.validHitsCount === 1, 'Target acquisition hit count');
  assert(acqStats.medianAcquisitionTimeMs === 600, 'Median acquisition time calculation');
  assert(acqStats.meanEndpointErrorPx === 5.0, 'Endpoint error calculation');

  // 4. Tracking metrics & RMSE
  const dummySamples: TrackingSample[] = [
    { timestampMs: 1000, elapsedMs: 0, targetX: 100, targetY: 100, cursorX: 100, cursorY: 100, distanceErrorPx: 0, isInsideTargetRadius: true, isInterrupted: false },
    { timestampMs: 1016, elapsedMs: 16, targetX: 102, targetY: 100, cursorX: 102, cursorY: 100, distanceErrorPx: 0, isInsideTargetRadius: true, isInterrupted: false },
    { timestampMs: 1032, elapsedMs: 32, targetX: 104, targetY: 100, cursorX: 107, cursorY: 100, distanceErrorPx: 3, isInsideTargetRadius: true, isInterrupted: false },
    { timestampMs: 1048, elapsedMs: 48, targetX: 106, targetY: 100, cursorX: 110, cursorY: 100, distanceErrorPx: 4, isInsideTargetRadius: false, isInterrupted: false },
  ];

  const trackStats = calculateTrackingStats(dummySamples, 'test-track', 'sinusoidal', 'normal', 3.5);
  // Errors: 0, 0, 3, 4 -> Mean = 1.75 -> 1.8. RMSE = sqrt((0 + 0 + 9 + 16)/4) = sqrt(6.25) = 2.5
  assert(trackStats.meanTrackingErrorPx === 1.8, 'Tracking mean error calculation');
  assert(trackStats.rmseTrackingErrorPx === 2.5, 'Tracking RMSE calculation');
  assert(trackStats.timeInTargetPercentage === 75, 'Tracking time-in-target percentage calculation (3/4 = 75%)');

  return { passed: allPassed, details };
}
