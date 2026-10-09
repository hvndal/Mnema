import React, { useState } from 'react';
import type { StoredSessionRecord } from '../types/history';
import { generateResultCardCanvas, type CardFormat, type CardMetricSelection } from '../utils/resultCardGenerator';

interface ResultCardModalProps {
  session: StoredSessionRecord;
  onClose: () => void;
}

export const ResultCardModal: React.FC<ResultCardModalProps> = ({ session, onClose }) => {
  const [format, setFormat] = useState<CardFormat>('square');
  const [downloading, setDownloading] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  // Extract available metrics based on session type
  const availableMetrics: CardMetricSelection[] = React.useMemo(() => {
    if (session.experimentType === 'reaction' && session.reactionStats) {
      const s = session.reactionStats;
      return [
        { label: 'Median Latency', value: `${s.medianMs}`, unit: 'ms' },
        { label: 'Mean Latency', value: `${s.meanMs}`, unit: 'ms' },
        { label: 'Neuromotor Jitter', value: `±${s.stdDevMs}`, unit: 'ms' },
        { label: 'Fastest Reaction', value: `${s.fastestMs}`, unit: 'ms' },
        { label: 'Accuracy Rate', value: `${s.accuracyPercentage}`, unit: '%' },
        { label: 'Premature Starts', value: `${s.prematureCount}`, unit: '' },
      ];
    } else if (session.experimentType === 'target_acquisition' && session.acquisitionStats) {
      const s = session.acquisitionStats;
      return [
        { label: 'Median Acquisition', value: `${s.medianAcquisitionTimeMs}`, unit: 'ms' },
        { label: 'Hit Rate', value: `${s.hitRatePercentage}`, unit: '%' },
        { label: 'Endpoint Error', value: `${s.meanEndpointErrorPx}`, unit: 'px' },
        { label: 'Path Efficiency', value: `${Math.round(s.meanPathEfficiency * 100)}`, unit: '%' },
        { label: 'Total Overshoots', value: `${s.totalOvershoots}`, unit: '' },
      ];
    } else if (session.experimentType === 'continuous_tracking' && session.trackingStats) {
      const s = session.trackingStats;
      return [
        { label: 'Time In Target', value: `${s.timeInTargetPercentage}`, unit: '%' },
        { label: 'RMSE Tracking Error', value: `${s.rmseTrackingErrorPx}`, unit: 'px' },
        { label: 'Mean Error', value: `${s.meanTrackingErrorPx}`, unit: 'px' },
        { label: 'Correction Rate', value: `${s.correctionFrequencyHz}`, unit: 'rev/s' },
      ];
    } else if (session.calibrationStats) {
      const s = session.calibrationStats;
      return [
        { label: 'Left Deadzone', value: `${Math.round(s.leftStick.recommendedDeadzone * 100)}`, unit: '%' },
        { label: 'Right Deadzone', value: `${Math.round(s.rightStick.recommendedDeadzone * 100)}`, unit: '%' },
      ];
    } else if (session.experimentType === 'phone_steadiness' && session.steadinessResult) {
      const s = session.steadinessResult;
      return [
        { label: 'Steadiness Score', value: `${s.steadinessScore}`, unit: '/100' },
        { label: 'Tremor Peak', value: `${s.peakFrequencyHz}`, unit: 'Hz' },
        { label: 'RMS Shake', value: `${s.rmsAcceleration}`, unit: 'm/s²' },
        { label: 'Sample Rate', value: `${s.effectiveSamplingRateHz}`, unit: 'Hz' },
      ];
    } else if (session.experimentType === 'phone_balance' && session.balanceResult) {
      const s = session.balanceResult;
      return [
        { label: 'Romberg Ratio', value: `${s.rombergRatio}`, unit: 'x' },
        { label: 'Visual Reliance', value: `${s.visualReliancePercent}`, unit: '%' },
        { label: 'Stability Score', value: `${s.posturalStabilityScore}`, unit: '/100' },
        { label: 'Closed Sway Rate', value: `${s.eyesClosed.meanVelocity}`, unit: '°/s' },
      ];
    } else if (session.experimentType === 'phone_proprioception' && session.proprioceptionResult) {
      const s = session.proprioceptionResult;
      return [
        { label: 'Mean Error', value: `${s.meanAbsoluteErrorDeg}`, unit: '°' },
        { label: 'Accuracy Score', value: `${s.accuracyScore}`, unit: '/100' },
        { label: 'Bias Tendency', value: `${s.tendency}`, unit: '' },
        { label: 'Signed Error', value: `${s.meanSignedErrorDeg}`, unit: '°' },
      ];
    }
    return [];
  }, [session]);

  const [selectedIndices, setSelectedIndices] = useState<number[]>([0, 1, 2, 3, 4]);

  const toggleMetric = (idx: number) => {
    setSelectedIndices(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const selectedMetrics = availableMetrics.filter((_, idx) => selectedIndices.includes(idx));

  // Generate preview image
  React.useEffect(() => {
    generateResultCardCanvas({
      session,
      format,
      selectedMetrics,
    }).then(setPreviewUrl);
  }, [session, format, selectedIndices]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const dataUrl = await generateResultCardCanvas({
        session,
        format,
        selectedMetrics,
      });

      // Try native Web Share API first
      if (navigator.share && navigator.canShare) {
        try {
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          const file = new File([blob], `mnema-${session.experimentType}-${format}.png`, { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: 'Mnema Controller Benchmark',
              text: 'Controller psychophysics and performance test results.',
              files: [file],
            });
            setDownloading(false);
            return;
          }
        } catch {
          // Fall back to direct file download
        }
      }

      // Fallback: standard anchor download
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `mnema-${session.experimentType}-${format}-${Date.now()}.png`;
      a.click();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col p-6 gap-6 font-mono text-neutral-200 shadow-2xl">
        <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-white uppercase tracking-wider">
              EXPORT SHAREABLE RESULT CARD
            </h3>
            <span className="text-xs text-neutral-500">
              Format: PNG • Hardware: {session.hardwareName} • Non-clinical motor benchmark
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white text-sm cursor-pointer"
          >
            ✕ Close
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Card Controls */}
          <div className="flex flex-col gap-4">
            <div>
              <span className="text-xs font-bold text-neutral-400 uppercase block mb-2">CARD FORMAT:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setFormat('square')}
                  className={`flex-1 py-2 rounded border text-xs font-bold cursor-pointer ${
                    format === 'square'
                      ? 'bg-neutral-200 text-neutral-950 border-white'
                      : 'bg-neutral-950 text-neutral-400 border-neutral-800'
                  }`}
                >
                  SQUARE (1:1 / 1080x1080)
                </button>
                <button
                  onClick={() => setFormat('portrait')}
                  className={`flex-1 py-2 rounded border text-xs font-bold cursor-pointer ${
                    format === 'portrait'
                      ? 'bg-neutral-200 text-neutral-950 border-white'
                      : 'bg-neutral-950 text-neutral-400 border-neutral-800'
                  }`}
                >
                  STORY / PORTRAIT (9:16 / 1080x1920)
                </button>
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-neutral-400 uppercase block mb-2">
                SELECT METRICS TO INCLUDE:
              </span>
              <div className="flex flex-col gap-1.5">
                {availableMetrics.map((m, idx) => (
                  <label
                    key={idx}
                    className="flex items-center gap-2 p-2 rounded bg-neutral-950 border border-neutral-800 text-xs cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIndices.includes(idx)}
                      onChange={() => toggleMetric(idx)}
                      className="accent-rose-500 cursor-pointer"
                    />
                    <span className="font-bold text-neutral-300">{m.label}:</span>
                    <span className="text-neutral-400">{m.value} {m.unit}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                onClick={handleDownload}
                disabled={downloading || selectedMetrics.length === 0}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded cursor-pointer disabled:opacity-40"
              >
                {downloading ? 'GENERATING PNG...' : 'DOWNLOAD PNG CARD'}
              </button>
            </div>
          </div>

          {/* Visual Preview */}
          <div className="flex flex-col items-center justify-center bg-neutral-950 border border-neutral-800 rounded-lg p-3">
            <span className="text-[11px] text-neutral-500 mb-2">LIVE CANVAS PREVIEW</span>
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Result card preview"
                className={`max-h-[380px] object-contain rounded border border-neutral-800 shadow-lg ${
                  format === 'square' ? 'aspect-square' : 'aspect-[9/16]'
                }`}
              />
            ) : (
              <div className="h-64 flex items-center justify-center text-xs text-neutral-600">
                Rendering card preview...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
