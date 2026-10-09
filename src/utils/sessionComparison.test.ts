import { compareSessions } from './sessionComparison';
import { validateImportedSessions } from './sessionStorage';
import type { StoredSessionRecord } from '../types/history';

export function runHistoryAndComparisonSelfTests(): { passed: boolean; details: string[] } {
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

  // Sample Session 1 (Reaction baseline)
  const session1: StoredSessionRecord = {
    id: 'test-sess-1',
    timestamp: '2026-10-09T20:00:00.000Z',
    experimentType: 'reaction',
    protocolVersion: '2.1-controller-psychophysics',
    hardwareName: 'EvoFox One S',
    controllerId: 'EvoFox Wireless',
    settingsSummary: { mode: 'simple' },
    sampleCount: 20,
    hasInterruptedTrials: false,
    dataQualityWarnings: [],
    reactionStats: {
      sessionId: 'test-sess-1',
      protocolVersion: '2.1-controller-psychophysics',
      mode: 'simple',
      totalTrialsAttempted: 20,
      scoredTrialsCount: 20,
      validHitsCount: 20,
      meanMs: 235.4,
      medianMs: 228.0,
      fastestMs: 195.0,
      slowestMs: 280.0,
      stdDevMs: 21.2,
      iqrMs: 18.0,
      accuracyPercentage: 100,
      prematureCount: 0,
      timedOutCount: 0,
      incorrectChoiceCount: 0,
      correctWithholdsCount: 0,
      falseAlarmsCount: 0,
      distribution: [],
    },
  };

  // Sample Session 2 (Reaction retest - faster)
  const session2: StoredSessionRecord = {
    ...session1,
    id: 'test-sess-2',
    timestamp: '2026-10-09T21:00:00.000Z',
    reactionStats: {
      ...session1.reactionStats!,
      sessionId: 'test-sess-2',
      meanMs: 218.0,
      medianMs: 212.0,
      stdDevMs: 16.5,
    },
  };

  // Sample Session 3 (Target acquisition - incompatible with reaction)
  const session3: StoredSessionRecord = {
    id: 'test-sess-3',
    timestamp: '2026-10-09T22:00:00.000Z',
    experimentType: 'target_acquisition',
    protocolVersion: '3.0-controller-precision-tracking',
    hardwareName: 'EvoFox One S',
    controllerId: 'EvoFox Wireless',
    settingsSummary: {},
    sampleCount: 20,
    hasInterruptedTrials: false,
    dataQualityWarnings: [],
    acquisitionStats: {
      sessionId: 'test-sess-3',
      totalTrialsAttempted: 20,
      scoredTrialsCount: 20,
      validHitsCount: 19,
      missCount: 1,
      timeoutCount: 0,
      invalidCount: 0,
      hitRatePercentage: 95.0,
      timeoutRatePercentage: 0,
      medianAcquisitionTimeMs: 640.0,
      meanAcquisitionTimeMs: 662.0,
      stdDevAcquisitionTimeMs: 45.0,
      meanEndpointErrorPx: 4.8,
      meanPathEfficiency: 0.92,
      totalOvershoots: 2,
      meanOvershootsPerHit: 0.1,
      bySize: {} as any,
      byDistance: {} as any,
    },
  };

  // Test 1: Compatible reaction comparisons and delta calculation
  const resCompatible = compareSessions([session2, session1]);
  assert(resCompatible.compatible, 'Comparison Engine: Identifies compatible reaction sessions');

  const medianMetric = resCompatible.metrics.find(m => m.key === 'medianMs');
  assert(medianMetric !== undefined, 'Comparison Engine: Extracts median latency metric');
  assert(medianMetric?.delta?.absolute === -16, 'Delta Math: Accurately calculates -16ms latency reduction (212 - 228)');
  assert(medianMetric?.delta?.percentage === -7.0, 'Delta Math: Accurately calculates -7.0% relative improvement');

  // Test 2: Incompatible cross-experiment blocking
  const resIncompatible = compareSessions([session1, session3]);
  assert(!resIncompatible.compatible, 'Comparison Engine: Blocks comparing Reaction vs Target Acquisition');
  assert(resIncompatible.incompatibilityReason?.includes('Cannot compare different experiment types') === true, 'Incompatibility Message: Returns descriptive reason');

  // Test 3: Insufficient session count
  const resSingle = compareSessions([session1]);
  assert(!resSingle.compatible, 'Comparison Engine: Requires at least 2 sessions to evaluate');

  // Test 4: Schema validation for JSON import
  const validJson = JSON.stringify([session1]);
  const importValid = validateImportedSessions(validJson);
  assert(importValid.validSessions.length === 1, 'JSON Import Validator: Accepts valid schema session');

  const invalidJson = JSON.stringify([{ id: 'bad', experimentType: 'unknown_type' }]);
  const importInvalid = validateImportedSessions(invalidJson);
  assert(importInvalid.validSessions.length === 0, 'JSON Import Validator: Rejects unknown experiment types');

  return { passed: allPassed, details };
}
