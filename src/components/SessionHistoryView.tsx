import React, { useState, useEffect } from 'react';
import type { StoredSessionRecord, SessionExperimentType } from '../types/history';
import {
  getAllSessions,
  deleteSession,
  clearAllSessions,
  validateImportedSessions,
  saveSession,
} from '../utils/sessionStorage';
import { compareSessions } from '../utils/sessionComparison';
import { ResultCardModal } from './ResultCardModal';

export const SessionHistoryView: React.FC = () => {
  const [sessions, setSessions] = useState<StoredSessionRecord[]>([]);
  const [filterType, setFilterType] = useState<SessionExperimentType | 'all'>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
  const [inspectSession, setInspectSession] = useState<StoredSessionRecord | null>(null);
  const [cardModalSession, setCardModalSession] = useState<StoredSessionRecord | null>(null);
  const [notification, setNotification] = useState<{ msg: string; err: boolean } | null>(null);

  const reloadSessions = async () => {
    const list = await getAllSessions();
    setSessions(list);
  };

  useEffect(() => {
    reloadSessions();
  }, []);

  const showToast = (msg: string, err: boolean = false) => {
    setNotification({ msg, err });
    setTimeout(() => setNotification(null), 3500);
  };

  // Filter & Sort
  const filteredSessions = sessions.filter(s => {
    if (filterType === 'all') return true;
    return s.experimentType === filterType;
  }).sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
  });

  // Selection toggle for comparisons
  const toggleSelect = (id: string) => {
    setSelectedSessionIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectedRecords = sessions.filter(s => selectedSessionIds.includes(s.id));
  const comparisonResult = selectedRecords.length >= 2 ? compareSessions(selectedRecords) : null;

  // Single delete
  const handleDeleteSession = async (id: string) => {
    await deleteSession(id);
    setSelectedSessionIds(prev => prev.filter(i => i !== id));
    if (inspectSession?.id === id) setInspectSession(null);
    await reloadSessions();
    showToast('Session record deleted successfully.');
  };

  // Clear all history with explicit confirmation
  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to permanently delete ALL stored session history from this browser?')) {
      await clearAllSessions();
      setSelectedSessionIds([]);
      setInspectSession(null);
      await reloadSessions();
      showToast('All local session history has been cleared.');
    }
  };

  // Export selected or all sessions as JSON
  const handleExportJSON = (singleSession?: StoredSessionRecord) => {
    const targetList = singleSession ? [singleSession] : (selectedRecords.length > 0 ? selectedRecords : sessions);
    if (targetList.length === 0) {
      showToast('No sessions available to export.', true);
      return;
    }
    const jsonStr = JSON.stringify(targetList, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = singleSession ? `session-${singleSession.id}.json` : `mnema-sessions-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast(`Exported ${targetList.length} session(s) as JSON.`);
  };

  // Export summary measurements as CSV
  const handleExportCSV = () => {
    const targetList = selectedRecords.length > 0 ? selectedRecords : sessions;
    if (targetList.length === 0) {
      showToast('No sessions to export.', true);
      return;
    }

    const headers = [
      'SessionId',
      'Date',
      'ExperimentType',
      'ProtocolVersion',
      'HardwareName',
      'SampleCount',
      'HasInterruptedTrials',
      'PrimaryMetric_1',
      'PrimaryMetric_2',
      'PrimaryMetric_3',
    ];

    const rows = targetList.map(s => {
      let m1 = '', m2 = '', m3 = '';
      if (s.experimentType === 'reaction' && s.reactionStats) {
        m1 = `MedianLatency: ${s.reactionStats.medianMs}ms`;
        m2 = `Accuracy: ${s.reactionStats.accuracyPercentage}%`;
        m3 = `Jitter: ${s.reactionStats.stdDevMs}ms`;
      } else if (s.experimentType === 'target_acquisition' && s.acquisitionStats) {
        m1 = `MedianAcquisition: ${s.acquisitionStats.medianAcquisitionTimeMs}ms`;
        m2 = `HitRate: ${s.acquisitionStats.hitRatePercentage}%`;
        m3 = `EndpointError: ${s.acquisitionStats.meanEndpointErrorPx}px`;
      } else if (s.experimentType === 'continuous_tracking' && s.trackingStats) {
        m1 = `TimeInTarget: ${s.trackingStats.timeInTargetPercentage}%`;
        m2 = `RMSE: ${s.trackingStats.rmseTrackingErrorPx}px`;
        m3 = `MeanError: ${s.trackingStats.meanTrackingErrorPx}px`;
      }

      return [
        s.id,
        new Date(s.timestamp).toISOString(),
        s.experimentType,
        s.protocolVersion,
        `"${s.hardwareName}"`,
        s.sampleCount,
        s.hasInterruptedTrials ? '1' : '0',
        `"${m1}"`,
        `"${m2}"`,
        `"${m3}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mnema-sessions-summary-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast(`Exported ${targetList.length} session summaries as CSV.`);
  };

  // Import JSON backup
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const content = evt.target?.result as string;
      const { validSessions, error } = validateImportedSessions(content);
      if (error || validSessions.length === 0) {
        showToast(error || 'Invalid session file.', true);
        return;
      }

      for (const s of validSessions) {
        await saveSession(s);
      }
      await reloadSessions();
      showToast(`Successfully imported ${validSessions.length} session record(s).`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="w-full flex flex-col gap-6 font-mono text-neutral-200">
      {/* Toast Notification */}
      {notification && (
        <div className={`p-3 rounded border text-xs font-bold transition-all ${
          notification.err ? 'bg-rose-950 border-rose-600 text-rose-200' : 'bg-emerald-950 border-emerald-600 text-emerald-200'
        }`}>
          {notification.msg}
        </div>
      )}

      {/* Top Banner & Control Bar */}
      <div className="border border-neutral-800 bg-neutral-900/90 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-base font-bold text-white tracking-wide">
            SESSION HISTORY & PERFORMANCE COMPARISON
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Local browser persistence, multi-session delta comparisons, and shareable PNG challenge cards.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={handleExportCSV}
            disabled={sessions.length === 0}
            className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 rounded cursor-pointer disabled:opacity-40"
          >
            Export CSV
          </button>
          <button
            onClick={() => handleExportJSON()}
            disabled={sessions.length === 0}
            className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 rounded cursor-pointer disabled:opacity-40"
          >
            Export JSON
          </button>
          <label className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 rounded cursor-pointer">
            Import JSON
            <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
          </label>
          <button
            onClick={handleClearAll}
            disabled={sessions.length === 0}
            className="px-2.5 py-1.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded cursor-pointer disabled:opacity-40"
          >
            Clear All History
          </button>
        </div>
      </div>

      {/* Filters & Sorting */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs border border-neutral-800 bg-neutral-900/60 p-3 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-neutral-500 font-bold uppercase">FILTER:</span>
          {[
            { id: 'all', label: 'All Experiments' },
            { id: 'reaction', label: 'Reaction Lab' },
            { id: 'target_acquisition', label: 'Target Acquisition' },
            { id: 'continuous_tracking', label: 'Continuous Tracking' },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setFilterType(opt.id as any)}
              className={`px-2.5 py-1 rounded border text-xs cursor-pointer ${
                filterType === opt.id
                  ? 'bg-neutral-200 text-neutral-950 border-white font-bold'
                  : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSortOrder(o => (o === 'desc' ? 'asc' : 'desc'))}
            className="text-neutral-400 hover:text-white underline cursor-pointer"
          >
            Sort by Date: {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
          </button>
          <span className="text-neutral-500">|</span>
          <span className="text-neutral-400">
            Total Sessions: <strong className="text-white">{filteredSessions.length}</strong>
          </span>
        </div>
      </div>

      {/* Comparison Section (Active when 2+ sessions selected) */}
      {selectedRecords.length >= 2 && (
        <div className="border border-neutral-700 bg-neutral-900/90 p-4 rounded-lg flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              PERFORMANCE COMPARISON ({selectedRecords.length} SESSIONS SELECTED)
            </span>
            <button
              onClick={() => setSelectedSessionIds([])}
              className="text-xs text-neutral-400 hover:text-white underline cursor-pointer"
            >
              Deselect All
            </button>
          </div>

          {comparisonResult && !comparisonResult.compatible ? (
            <div className="p-3 bg-rose-950/70 border border-rose-700 text-rose-200 text-xs rounded">
              ⚠️ {comparisonResult.incompatibilityReason}
            </div>
          ) : comparisonResult && comparisonResult.compatible ? (
            <div className="flex flex-col gap-3">
              {comparisonResult.hardwareDifferenceWarning && (
                <div className="p-2.5 bg-amber-950/70 border border-amber-700 text-amber-200 text-xs rounded">
                  {comparisonResult.hardwareDifferenceWarning}
                </div>
              )}

              {/* Comparison Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-800 text-neutral-400">
                      <th className="py-2 px-3">Metric</th>
                      {selectedRecords.map(s => (
                        <th key={s.id} className="py-2 px-3">
                          {new Date(s.timestamp).toLocaleDateString()} ({s.id.slice(0, 10)})
                        </th>
                      ))}
                      {selectedRecords.length === 2 && <th className="py-2 px-3">Observed Change (Delta)</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonResult.metrics.map(m => (
                      <tr key={m.key} className="border-b border-neutral-900/80 hover:bg-neutral-950/40">
                        <td className="py-2.5 px-3 font-bold text-neutral-300">
                          {m.label} ({m.unit})
                        </td>
                        {m.values.map((v, idx) => (
                          <td key={idx} className="py-2.5 px-3 font-bold text-white">
                            {v.value}
                          </td>
                        ))}
                        {selectedRecords.length === 2 && m.delta && (
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              m.higherIsBetter === null
                                ? 'bg-neutral-800 text-neutral-300'
                                : (m.higherIsBetter ? m.delta.absolute > 0 : m.delta.absolute < 0)
                                ? 'bg-emerald-950 border border-emerald-700 text-emerald-300'
                                : 'bg-rose-950 border border-rose-700 text-rose-300'
                            }`}>
                              {m.delta.description} ({m.delta.percentage > 0 ? `+${m.delta.percentage}` : m.delta.percentage}%)
                            </span>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <span className="text-[11px] text-neutral-500 italic mt-1">
                Notice: Observed performance differences reflect measured task timings under given conditions and should not be construed as clinical or cognitive ability claims without formal psychometric controls.
              </span>
            </div>
          ) : null}
        </div>
      )}

      {/* Sessions List */}
      <div className="flex flex-col gap-3">
        {filteredSessions.length === 0 ? (
          <div className="p-8 border border-neutral-800 bg-neutral-900/40 rounded-lg text-center text-xs text-neutral-500">
            No saved sessions found. Complete an experiment in the Reaction, Target Acquisition, or Continuous Tracking tabs to automatically record sessions here.
          </div>
        ) : (
          filteredSessions.map(session => {
            const isSelected = selectedSessionIds.includes(session.id);
            return (
              <div
                key={session.id}
                className={`p-4 border rounded-lg transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
                  isSelected
                    ? 'border-rose-500/80 bg-neutral-900 shadow-md'
                    : 'border-neutral-800 bg-neutral-900/60 hover:border-neutral-700'
                }`}
              >
                {/* Left info & checkbox */}
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(session.id)}
                    className="mt-1 accent-rose-500 cursor-pointer"
                    title="Select for comparison"
                  />
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white uppercase">
                        {session.experimentType.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-neutral-400">
                        {new Date(session.timestamp).toLocaleString()}
                      </span>
                      {session.hasInterruptedTrials && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 border border-amber-800 text-amber-300">
                          ⚠️ Incomplete/Interrupted
                        </span>
                      )}
                    </div>

                    {/* Primary Highlight Metrics */}
                    <div className="text-xs text-neutral-300 mt-1 flex flex-wrap gap-4">
                      {session.experimentType === 'reaction' && session.reactionStats && (
                        <>
                          <span>Median: <strong className="text-emerald-400">{session.reactionStats.medianMs} ms</strong></span>
                          <span>Mean: <strong>{session.reactionStats.meanMs} ms</strong></span>
                          <span>Jitter: <strong>±{session.reactionStats.stdDevMs} ms</strong></span>
                          <span>Accuracy: <strong className="text-purple-400">{session.reactionStats.accuracyPercentage}%</strong></span>
                        </>
                      )}
                      {session.experimentType === 'target_acquisition' && session.acquisitionStats && (
                        <>
                          <span>Median: <strong className="text-emerald-400">{session.acquisitionStats.medianAcquisitionTimeMs} ms</strong></span>
                          <span>Hit Rate: <strong className="text-purple-400">{session.acquisitionStats.hitRatePercentage}%</strong></span>
                          <span>Endpoint Error: <strong>{session.acquisitionStats.meanEndpointErrorPx} px</strong></span>
                          <span>Efficiency: <strong>{(session.acquisitionStats.meanPathEfficiency * 100).toFixed(0)}%</strong></span>
                        </>
                      )}
                      {session.experimentType === 'continuous_tracking' && session.trackingStats && (
                        <>
                          <span>Time in Target: <strong className="text-emerald-400">{session.trackingStats.timeInTargetPercentage}%</strong></span>
                          <span>RMSE: <strong className="text-sky-400">{session.trackingStats.rmseTrackingErrorPx} px</strong></span>
                          <span>Mean Error: <strong>{session.trackingStats.meanTrackingErrorPx} px</strong></span>
                        </>
                      )}
                    </div>

                    <span className="text-[10px] text-neutral-500 mt-0.5">
                      Hardware: {session.hardwareName} • Protocol: {session.protocolVersion} • Valid Samples: {session.sampleCount}
                    </span>
                  </div>
                </div>

                {/* Right Action buttons */}
                <div className="flex items-center gap-2 self-end md:self-center">
                  <button
                    onClick={() => setCardModalSession(session)}
                    className="px-2.5 py-1.5 bg-rose-950/50 hover:bg-rose-900 border border-rose-700 text-rose-300 rounded text-xs font-bold cursor-pointer"
                  >
                    Generate PNG Card
                  </button>
                  <button
                    onClick={() => handleExportJSON(session)}
                    className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 rounded text-xs cursor-pointer"
                  >
                    JSON
                  </button>
                  <button
                    onClick={() => handleDeleteSession(session.id)}
                    className="px-2 py-1.5 text-neutral-500 hover:text-rose-400 text-xs cursor-pointer"
                    title="Delete session"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Share Card Modal */}
      {cardModalSession && (
        <ResultCardModal
          session={cardModalSession}
          onClose={() => setCardModalSession(null)}
        />
      )}
    </div>
  );
};
