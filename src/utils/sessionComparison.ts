import type { StoredSessionRecord, SessionComparisonResult } from '../types/history';

/**
 * Compares two or more sessions and guarantees only compatible measurements are evaluated.
 */
export function compareSessions(sessions: StoredSessionRecord[]): SessionComparisonResult {
  if (sessions.length < 2) {
    return {
      compatible: false,
      experimentType: sessions[0]?.experimentType || 'reaction',
      incompatibilityReason: 'Select at least two sessions to perform a performance comparison.',
      metrics: [],
    };
  }

  const primaryType = sessions[0].experimentType;
  const isTypeCompatible = sessions.every(s => s.experimentType === primaryType);

  if (!isTypeCompatible) {
    return {
      compatible: false,
      experimentType: primaryType,
      incompatibilityReason: 'Cannot compare different experiment types (e.g. Reaction Time vs Target Acquisition). Select sessions of the same test.',
      metrics: [],
    };
  }

  // Check hardware differences
  const hardwares = new Set(sessions.map(s => s.hardwareName));
  const hardwareDifferenceWarning = hardwares.size > 1
    ? `Notice: Compared sessions were measured with different controller profiles (${Array.from(hardwares).join(' vs ')}). Latency differences may stem from hardware input polling.`
    : undefined;

  if (primaryType === 'reaction') {
    return compareReactionSessions(sessions, hardwareDifferenceWarning);
  } else if (primaryType === 'target_acquisition') {
    return compareAcquisitionSessions(sessions, hardwareDifferenceWarning);
  } else if (primaryType === 'continuous_tracking') {
    return compareTrackingSessions(sessions, hardwareDifferenceWarning);
  } else {
    return compareCalibrationSessions(sessions, hardwareDifferenceWarning);
  }
}

function compareReactionSessions(sessions: StoredSessionRecord[], hardwareWarning?: string): SessionComparisonResult {
  const metricConfigs = [
    { key: 'medianMs', label: 'Median Reaction Latency', unit: 'ms', higherIsBetter: false },
    { key: 'meanMs', label: 'Mean Reaction Latency', unit: 'ms', higherIsBetter: false },
    { key: 'stdDevMs', label: 'Neuromotor Jitter (StdDev)', unit: 'ms', higherIsBetter: false },
    { key: 'accuracyPercentage', label: 'Accuracy Rate', unit: '%', higherIsBetter: true },
    { key: 'prematureCount', label: 'Premature False Starts', unit: 'errors', higherIsBetter: false },
    { key: 'validHitsCount', label: 'Valid Sample Count', unit: 'trials', higherIsBetter: null },
  ];

  const metrics = metricConfigs.map(m => {
    const values = sessions.map(s => {
      const stats = s.reactionStats;
      const val = stats ? (stats as any)[m.key] : 0;
      return {
        sessionId: s.id,
        date: new Date(s.timestamp).toLocaleDateString(),
        value: typeof val === 'number' ? Math.round(val * 10) / 10 : val,
      };
    });

    let delta: { absolute: number; percentage: number; description: string } | undefined;
    if (values.length === 2 && typeof values[0].value === 'number' && typeof values[1].value === 'number') {
      // Delta from earlier session to newer session (values[1] is older, values[0] is newer because sorted desc)
      const olderVal = Number(values[1].value);
      const newerVal = Number(values[0].value);
      const diff = newerVal - olderVal;
      const pct = olderVal !== 0 ? (diff / olderVal) * 100 : 0;
      delta = {
        absolute: Math.round(diff * 10) / 10,
        percentage: Math.round(pct * 10) / 10,
        description: diff < 0 ? `${Math.abs(Math.round(diff * 10) / 10)} ${m.unit} decrease` : `${Math.round(diff * 10) / 10} ${m.unit} increase`,
      };
    }

    return { ...m, values, delta };
  });

  return {
    compatible: true,
    experimentType: 'reaction',
    hardwareDifferenceWarning: hardwareWarning,
    metrics,
  };
}

function compareAcquisitionSessions(sessions: StoredSessionRecord[], hardwareWarning?: string): SessionComparisonResult {
  const metricConfigs = [
    { key: 'medianAcquisitionTimeMs', label: 'Median Acquisition Time', unit: 'ms', higherIsBetter: false },
    { key: 'hitRatePercentage', label: 'Target Hit Rate', unit: '%', higherIsBetter: true },
    { key: 'meanEndpointErrorPx', label: 'Mean Endpoint Error', unit: 'px', higherIsBetter: false },
    { key: 'meanPathEfficiency', label: 'Path Efficiency', unit: '%', higherIsBetter: true },
    { key: 'totalOvershoots', label: 'Total Overshoots', unit: 'count', higherIsBetter: false },
  ];

  const metrics = metricConfigs.map(m => {
    const values = sessions.map(s => {
      const stats = s.acquisitionStats;
      let val = stats ? (stats as any)[m.key] : 0;
      if (m.key === 'meanPathEfficiency' && typeof val === 'number') val = Math.round(val * 100);
      return {
        sessionId: s.id,
        date: new Date(s.timestamp).toLocaleDateString(),
        value: typeof val === 'number' ? Math.round(val * 10) / 10 : val,
      };
    });

    let delta: { absolute: number; percentage: number; description: string } | undefined;
    if (values.length === 2 && typeof values[0].value === 'number' && typeof values[1].value === 'number') {
      const olderVal = Number(values[1].value);
      const newerVal = Number(values[0].value);
      const diff = newerVal - olderVal;
      const pct = olderVal !== 0 ? (diff / olderVal) * 100 : 0;
      delta = {
        absolute: Math.round(diff * 10) / 10,
        percentage: Math.round(pct * 10) / 10,
        description: diff < 0 ? `${Math.abs(Math.round(diff * 10) / 10)} ${m.unit} decrease` : `${Math.round(diff * 10) / 10} ${m.unit} increase`,
      };
    }

    return { ...m, values, delta };
  });

  return {
    compatible: true,
    experimentType: 'target_acquisition',
    hardwareDifferenceWarning: hardwareWarning,
    metrics,
  };
}

function compareTrackingSessions(sessions: StoredSessionRecord[], hardwareWarning?: string): SessionComparisonResult {
  const metricConfigs = [
    { key: 'rmseTrackingErrorPx', label: 'RMSE Tracking Error', unit: 'px', higherIsBetter: false },
    { key: 'meanTrackingErrorPx', label: 'Mean Tracking Error', unit: 'px', higherIsBetter: false },
    { key: 'timeInTargetPercentage', label: 'Time In Target Radius', unit: '%', higherIsBetter: true },
    { key: 'correctionFrequencyHz', label: 'Correction Frequency', unit: 'rev/s', higherIsBetter: null },
    { key: 'totalSamplesRecorded', label: 'Valid Samples Recorded', unit: 'samples', higherIsBetter: null },
  ];

  const metrics = metricConfigs.map(m => {
    const values = sessions.map(s => {
      const stats = s.trackingStats;
      const val = stats ? (stats as any)[m.key] : 0;
      return {
        sessionId: s.id,
        date: new Date(s.timestamp).toLocaleDateString(),
        value: typeof val === 'number' ? Math.round(val * 10) / 10 : val,
      };
    });

    let delta: { absolute: number; percentage: number; description: string } | undefined;
    if (values.length === 2 && typeof values[0].value === 'number' && typeof values[1].value === 'number') {
      const olderVal = Number(values[1].value);
      const newerVal = Number(values[0].value);
      const diff = newerVal - olderVal;
      const pct = olderVal !== 0 ? (diff / olderVal) * 100 : 0;
      delta = {
        absolute: Math.round(diff * 10) / 10,
        percentage: Math.round(pct * 10) / 10,
        description: diff < 0 ? `${Math.abs(Math.round(diff * 10) / 10)} ${m.unit} decrease` : `${Math.round(diff * 10) / 10} ${m.unit} increase`,
      };
    }

    return { ...m, values, delta };
  });

  return {
    compatible: true,
    experimentType: 'continuous_tracking',
    hardwareDifferenceWarning: hardwareWarning,
    metrics,
  };
}

function compareCalibrationSessions(sessions: StoredSessionRecord[], hardwareWarning?: string): SessionComparisonResult {
  const metricConfigs = [
    { key: 'leftDeadzone', label: 'Left Stick Recommended Dead Zone', unit: '%', higherIsBetter: false },
    { key: 'rightDeadzone', label: 'Right Stick Recommended Dead Zone', unit: '%', higherIsBetter: false },
  ];

  const metrics = metricConfigs.map(m => {
    const values = sessions.map(s => {
      const stats = s.calibrationStats;
      let val = 0;
      if (stats) {
        if (m.key === 'leftDeadzone') val = Math.round(stats.leftStick.recommendedDeadzone * 100);
        if (m.key === 'rightDeadzone') val = Math.round(stats.rightStick.recommendedDeadzone * 100);
      }
      return {
        sessionId: s.id,
        date: new Date(s.timestamp).toLocaleDateString(),
        value: val,
      };
    });

    return { ...m, values };
  });

  return {
    compatible: true,
    experimentType: 'diagnostics_calibration',
    hardwareDifferenceWarning: hardwareWarning,
    metrics,
  };
}
