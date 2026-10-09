import type {
  RawAcquisitionTrialRecord,
  TargetAcquisitionStats,
  TrackingSample,
  ContinuousTrackingStats,
} from '../types/precisionTracking';

// -------------------------------------------------------------
// TARGET ACQUISITION EXPORT
// -------------------------------------------------------------

export function exportTargetAcquisitionCSV(
  trials: RawAcquisitionTrialRecord[],
  summary: TargetAcquisitionStats,
  filename: string = `target-acquisition-${summary.sessionId}.csv`
) {
  if (trials.length === 0) return;

  const headers = [
    'SessionId',
    'ProtocolVersion',
    'IsPractice',
    'TrialNumber',
    'TargetId',
    'TargetX',
    'TargetY',
    'TargetRadius',
    'SizeCategory',
    'DistanceCategory',
    'CursorStartX',
    'CursorStartY',
    'CursorFinalX',
    'CursorFinalY',
    'AppearanceTimeMs',
    'ConfirmationTimeMs',
    'AcquisitionTimeMs',
    'ShortestDistancePx',
    'ActualPathLengthPx',
    'PathEfficiency',
    'EndpointErrorPx',
    'OvershootCount',
    'Outcome',
    'IsValid',
    'InvalidationReason',
  ];

  const rows = trials.map(t => [
    t.sessionId,
    t.protocolVersion,
    t.isPractice ? '1' : '0',
    t.trialNumber,
    `"${t.targetId}"`,
    t.targetX.toFixed(1),
    t.targetY.toFixed(1),
    t.targetRadius.toFixed(1),
    t.sizeCategory,
    t.distanceCategory,
    t.cursorStartX.toFixed(1),
    t.cursorStartY.toFixed(1),
    t.cursorFinalX.toFixed(1),
    t.cursorFinalY.toFixed(1),
    t.targetAppearanceTimeMs.toFixed(2),
    t.confirmationTimeMs !== null ? t.confirmationTimeMs.toFixed(2) : '',
    t.acquisitionTimeMs !== null ? t.acquisitionTimeMs.toFixed(2) : '',
    t.shortestDistancePx.toFixed(2),
    t.actualPathLengthPx.toFixed(2),
    t.pathEfficiency.toFixed(3),
    t.endpointErrorPx.toFixed(2),
    t.overshootCount,
    t.outcome,
    t.isValid ? '1' : '0',
    t.invalidationReason ? `"${t.invalidationReason}"` : '',
  ]);

  downloadFile('text/csv', [headers.join(','), ...rows.map(r => r.join(','))].join('\n'), filename);
}

export function exportTargetAcquisitionJSON(
  trials: RawAcquisitionTrialRecord[],
  summary: TargetAcquisitionStats,
  filename: string = `target-acquisition-${summary.sessionId}.json`
) {
  const payload = {
    exportDate: new Date().toISOString(),
    userAgent: navigator.userAgent,
    summary,
    trials,
  };
  downloadFile('application/json', JSON.stringify(payload, null, 2), filename);
}

// -------------------------------------------------------------
// CONTINUOUS TRACKING EXPORT
// -------------------------------------------------------------

export function exportTrackingCSV(
  samples: TrackingSample[],
  summary: ContinuousTrackingStats,
  filename: string = `continuous-tracking-${summary.sessionId}.csv`
) {
  if (samples.length === 0) return;

  const headers = [
    'TimestampMs',
    'ElapsedMs',
    'TargetX',
    'TargetY',
    'CursorX',
    'CursorY',
    'DistanceErrorPx',
    'IsInsideTargetRadius',
    'IsInterrupted',
  ];

  const rows = samples.map(s => [
    s.timestampMs.toFixed(2),
    s.elapsedMs.toFixed(2),
    s.targetX.toFixed(2),
    s.targetY.toFixed(2),
    s.cursorX.toFixed(2),
    s.cursorY.toFixed(2),
    s.distanceErrorPx.toFixed(2),
    s.isInsideTargetRadius ? '1' : '0',
    s.isInterrupted ? '1' : '0',
  ]);

  downloadFile('text/csv', [headers.join(','), ...rows.map(r => r.join(','))].join('\n'), filename);
}

export function exportTrackingJSON(
  samples: TrackingSample[],
  summary: ContinuousTrackingStats,
  filename: string = `continuous-tracking-${summary.sessionId}.json`
) {
  const payload = {
    exportDate: new Date().toISOString(),
    userAgent: navigator.userAgent,
    summary,
    samples,
  };
  downloadFile('application/json', JSON.stringify(payload, null, 2), filename);
}

function downloadFile(mime: string, content: string, filename: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
