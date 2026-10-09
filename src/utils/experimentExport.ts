import type { RawTrialRecord, ReactionExperimentStats } from '../types/experiment';

export interface ExperimentExportPayload {
  exportTimestamp: string;
  userAgent: string;
  controllerMetadata: {
    id: string;
    mapping: string;
    timestamp: number;
  } | null;
  summary: ReactionExperimentStats;
  trials: RawTrialRecord[];
}

export function exportExperimentJSON(
  payload: ExperimentExportPayload,
  filename: string = `reaction-lab-${payload.summary.mode}-${Date.now()}.json`
) {
  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(payload, null, 2))}`;
  const a = document.createElement('a');
  a.setAttribute('href', jsonString);
  a.setAttribute('download', filename);
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function exportExperimentCSV(
  trials: RawTrialRecord[],
  summary: ReactionExperimentStats,
  filename: string = `reaction-lab-${summary.mode}-${Date.now()}.csv`
) {
  if (trials.length === 0) return;

  const headers = [
    'SessionId',
    'ProtocolVersion',
    'ExperimentMode',
    'IsPractice',
    'TrialNumber',
    'StimulusType',
    'TargetButtonIndex',
    'TargetButtonLabel',
    'ForeperiodDurationMs',
    'StimulusOnsetTimestampMs',
    'ResponseTimestampMs',
    'ReactionTimeMs',
    'ButtonPressedIndex',
    'ButtonPressedLabel',
    'Outcome',
    'IsValid',
    'InvalidationReason',
  ];

  const rows = trials.map(t => [
    t.sessionId,
    t.protocolVersion,
    t.experimentMode,
    t.isPractice ? '1' : '0',
    t.trialNumber,
    `"${t.stimulusType}"`,
    t.targetButtonIndex !== null ? t.targetButtonIndex : '',
    `"${t.targetButtonLabel}"`,
    t.foreperiodDurationMs,
    t.stimulusOnsetTimestamp.toFixed(2),
    t.responseTimestamp !== null ? t.responseTimestamp.toFixed(2) : '',
    t.responseTimeMs !== null ? t.responseTimeMs.toFixed(2) : '',
    t.buttonPressedIndex !== null ? t.buttonPressedIndex : '',
    t.buttonPressedLabel ? `"${t.buttonPressedLabel}"` : '',
    `"${t.outcome}"`,
    t.isValid ? '1' : '0',
    t.invalidationReason ? `"${t.invalidationReason}"` : '',
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent([headers.join(','), ...rows.map(r => r.join(','))].join('\n'));
  const a = document.createElement('a');
  a.setAttribute('href', csvContent);
  a.setAttribute('download', filename);
  document.body.appendChild(a);
  a.click();
  a.remove();
}
