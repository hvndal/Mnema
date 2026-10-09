import React from 'react';
import type { PsychophysicsStats, TestParadigm } from '../types';
import { Download, RefreshCw, Zap, TrendingDown, ShieldAlert, Award } from 'lucide-react';
import confetti from 'canvas-confetti';
import { generateChallengeCardCanvas } from '../utils/challengeCard';

interface ResultsViewProps {
  stats: PsychophysicsStats;
  paradigm: TestParadigm;
  hardwareName: string;
  pollingRateHz: number;
  onRestart: () => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({
  stats,
  paradigm,
  hardwareName,
  pollingRateHz,
  onRestart,
}) => {
  const [downloading, setDownloading] = React.useState(false);

  React.useEffect(() => {
    // If great performance (< 220ms), trigger subtle celebration
    if (stats.median > 0 && stats.median < 225) {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#f43f5e', '#ec4899', '#3b82f6', '#10b981'],
      });
    }
  }, [stats.median]);

  const handleDownloadCard = async () => {
    setDownloading(true);
    try {
      const dataUrl = await generateChallengeCardCanvas({
        stats,
        paradigm,
        hardwareName,
        pollingRateHz,
      });

      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `Mnema_Latency_Report_${Math.round(stats.median)}ms.png`;
      a.click();
    } catch (e) {
      console.error('Failed to export challenge card:', e);
    } finally {
      setDownloading(false);
    }
  };

  const getPerformanceClassification = (medianMs: number) => {
    if (medianMs === 0) return { title: 'INSUFFICIENT SAMPLES', color: 'text-neutral-400' };
    if (medianMs < 190) return { title: 'ELITE NEUROMOTOR LATENCY', color: 'text-emerald-400' };
    if (medianMs < 235) return { title: 'COMPETITIVE GAMING TIER', color: 'text-blue-400' };
    if (medianMs < 285) return { title: 'NORMAL POPULATION AVERAGE', color: 'text-amber-400' };
    return { title: 'REDUCED VELOCITY / JITTERED', color: 'text-rose-400' };
  };

  const rating = getPerformanceClassification(stats.median);

  return (
    <div className="w-full max-w-4xl flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200">
      {/* Top Banner */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col items-center md:items-start text-center md:text-left">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-4 h-4 text-rose-500" />
            <span className={`text-xs font-mono font-bold tracking-widest uppercase ${rating.color}`}>
              {rating.title}
            </span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-6xl sm:text-7xl font-extrabold font-mono text-neutral-100 tracking-tight">
              {stats.median}
            </span>
            <span className="text-2xl font-mono text-rose-500 font-bold">ms</span>
            <span className="text-sm font-mono text-neutral-500 ml-2">MEDIAN LATENCY</span>
          </div>
          <p className="text-xs text-neutral-400 mt-2 font-mono">
            Measured across {stats.validTrials} clean trials via {hardwareName} ({pollingRateHz} Hz input polling).
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <button
            onClick={handleDownloadCard}
            disabled={downloading}
            className="px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-950 hover:shadow-rose-900 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {downloading ? 'GENERATING CARD...' : 'SAVE SHARE CARD'}
          </button>
          <button
            onClick={onRestart}
            className="px-5 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-mono font-semibold text-sm flex items-center justify-center gap-2 border border-neutral-700 transition-all active:scale-95 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            RETEST (NEW RUN)
          </button>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-neutral-900/80 border border-neutral-800 p-4 rounded-xl flex flex-col">
          <span className="text-[11px] font-mono text-neutral-500 uppercase">Mean</span>
          <span className="text-xl font-bold font-mono text-neutral-200 mt-1">{stats.mean} ms</span>
        </div>
        <div className="bg-neutral-900/80 border border-neutral-800 p-4 rounded-xl flex flex-col">
          <span className="text-[11px] font-mono text-neutral-500 uppercase">Fastest</span>
          <span className="text-xl font-bold font-mono text-emerald-400 mt-1">{stats.fastest} ms</span>
        </div>
        <div className="bg-neutral-900/80 border border-neutral-800 p-4 rounded-xl flex flex-col">
          <span className="text-[11px] font-mono text-neutral-500 uppercase">Jitter (StdDev)</span>
          <span className="text-xl font-bold font-mono text-sky-400 mt-1">±{stats.stdDev} ms</span>
        </div>
        <div className="bg-neutral-900/80 border border-neutral-800 p-4 rounded-xl flex flex-col">
          <span className="text-[11px] font-mono text-neutral-500 uppercase">IQR Spread</span>
          <span className="text-xl font-bold font-mono text-purple-400 mt-1">{stats.iqr} ms</span>
        </div>
        <div className="bg-neutral-900/80 border border-neutral-800 p-4 rounded-xl flex flex-col">
          <span className="text-[11px] font-mono text-neutral-500 uppercase">False Starts</span>
          <span className={`text-xl font-bold font-mono mt-1 ${stats.falseStarts > 0 ? 'text-amber-400' : 'text-neutral-300'}`}>
            {stats.falseStarts}
          </span>
        </div>
        <div className="bg-neutral-900/80 border border-neutral-800 p-4 rounded-xl flex flex-col">
          <span className="text-[11px] font-mono text-neutral-500 uppercase">Wrong Inputs</span>
          <span className={`text-xl font-bold font-mono mt-1 ${stats.wrongInputs > 0 ? 'text-rose-400' : 'text-neutral-300'}`}>
            {stats.wrongInputs}
          </span>
        </div>
      </div>

      {/* Latency Distribution Histogram & Fatigue Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Histogram */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-mono font-bold text-neutral-300 uppercase flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-rose-500" />
              Response Distribution
            </span>
            <span className="text-[11px] font-mono text-neutral-500">Binned by latency</span>
          </div>

          <div className="h-44 flex items-end gap-2 pt-4 px-2 border-b border-neutral-800">
            {stats.distribution.map((bin, i) => {
              const max = Math.max(...stats.distribution.map(d => d.count), 1);
              const heightPct = (bin.count / max) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                  <span className="text-[10px] font-mono text-neutral-400 group-hover:text-white transition-colors">
                    {bin.count}
                  </span>
                  <div
                    style={{ height: `${Math.max(heightPct, 6)}%` }}
                    className="w-full bg-rose-600/70 hover:bg-rose-500 rounded-t transition-all group-hover:shadow-[0_0_12px_rgba(244,63,94,0.5)]"
                  />
                  <span className="text-[10px] font-mono text-neutral-500 rotate-[-30deg] origin-top-left mt-2 whitespace-nowrap">
                    {bin.binStart}ms
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between items-center text-[10px] font-mono text-neutral-500 mt-6 pt-2">
            <span>Faster (Left)</span>
            <span>Slower (Right)</span>
          </div>
        </div>

        {/* Fatigue & Scientific Rigor Card */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <span className="text-xs font-mono font-bold text-neutral-300 uppercase flex items-center gap-2 mb-3">
              <TrendingDown className="w-3.5 h-3.5 text-sky-400" />
              Session Fatigue & Neuro-Trend
            </span>
            <div className="p-3.5 rounded-lg bg-neutral-950/60 border border-neutral-800 font-mono text-xs flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">Degradation Rate (Slope):</span>
                <span className={`font-bold ${stats.fatigueSlope > 1 ? 'text-amber-400' : stats.fatigueSlope < -1 ? 'text-emerald-400' : 'text-neutral-200'}`}>
                  {stats.fatigueSlope > 0 ? `+${stats.fatigueSlope}` : stats.fatigueSlope} ms/trial
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 leading-relaxed">
                {stats.fatigueSlope > 1.5 
                  ? 'Your reaction times lengthened noticeably across the rounds, indicating momentary visual or cognitive fatigue.' 
                  : stats.fatigueSlope < -1.5 
                  ? 'Your reactions accelerated over the course of the test, exhibiting standard motor warmup & stimulus priming.' 
                  : 'High motor stability throughout all trials with minimal drift or performance decay.'}
              </p>
            </div>
          </div>

          {/* Honest Methodology Disclaimer */}
          <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-start gap-2 text-[11px] font-mono text-neutral-500 leading-normal">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-neutral-400 mt-0.5" />
            <span>
              <strong>Methodology notice:</strong> This measures hardware actuation delta (display V-Sync to 2.4 GHz USB HID poll). It reflects neuromuscular motor latency on your specific setup, not cognitive IQ or medical diagnostics.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
