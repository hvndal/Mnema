import type { PsychophysicsStats, TestParadigm } from '../types';

interface ChallengeCardOptions {
  stats: PsychophysicsStats;
  paradigm: TestParadigm;
  hardwareName: string;
  pollingRateHz: number;
}

export function generateChallengeCardCanvas(options: ChallengeCardOptions): Promise<string> {
  return new Promise((resolve) => {
    const { stats, paradigm, hardwareName, pollingRateHz } = options;

    const width = 1200;
    const height = 675; // Standard 16:9 share card
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      resolve('');
      return;
    }

    // Background: Deep dark tactical slate
    const bgGradient = ctx.createLinearGradient(0, 0, width, height);
    bgGradient.addColorStop(0, '#090a0f');
    bgGradient.addColorStop(0.5, '#0e111a');
    bgGradient.addColorStop(1, '#08080c');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Subtle Grid pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Outer glow boundary
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.35)'; // Rose neon accent
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 30, width - 60, height - 60);

    // Header Tag
    ctx.fillStyle = '#f43f5e';
    ctx.font = 'bold 15px monospace';
    ctx.fillText('MNEMA // PSYCHOPHYSICS LAB', 60, 75);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '14px monospace';
    ctx.fillText(`INPUT: ${hardwareName.toUpperCase()} • ${pollingRateHz} Hz POLLING`, 400, 75);

    // Main Title / Paradigm
    const paradigmTitles: Record<TestParadigm, string> = {
      simple: 'SIMPLE REACTION TIME (SRT)',
      choice_color: '4-CHOICE COLOR REACTION (CRT)',
      choice_dpad: '4-CHOICE DIRECTIONAL D-PAD',
      gonogo: 'GO / NO-GO INHIBITORY CONTROL',
    };
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText(paradigmTitles[paradigm] || 'REACTION BENCHMARK', 60, 125);

    // Primary Metric: Median Reaction Latency
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '16px monospace';
    ctx.fillText('MEDIAN LATENCY', 60, 190);

    ctx.fillStyle = '#f43f5e';
    ctx.font = '900 84px monospace';
    ctx.fillText(`${stats.median}`, 60, 275);

    ctx.fillStyle = '#f43f5e';
    ctx.font = 'bold 36px monospace';
    ctx.fillText('ms', ctx.measureText(`${stats.median}`).width + 75, 275);

    // Metric Grid (Mean, Fastest, Jitter/StdDev, False Starts)
    const metrics = [
      { label: 'FASTEST HIT', value: `${stats.fastest} ms`, highlight: '#10b981' },
      { label: 'MEAN LATENCY', value: `${stats.mean} ms`, highlight: '#ffffff' },
      { label: 'JITTER (STD DEV)', value: `±${stats.stdDev} ms`, highlight: '#60a5fa' },
      { label: 'IQR CONSISTENCY', value: `${stats.iqr} ms`, highlight: '#a78bfa' },
      { label: 'FALSE STARTS', value: `${stats.falseStarts}`, highlight: stats.falseStarts > 0 ? '#fbbf24' : '#ffffff' },
      { label: 'VALID SAMPLES', value: `${stats.validTrials} / ${stats.totalTrials}`, highlight: '#ffffff' },
    ];

    const startX = 60;
    const startY = 330;
    const cellW = 160;
    const cellH = 80;

    metrics.forEach((m, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      const x = startX + col * cellW;
      const y = startY + row * cellH;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '12px monospace';
      ctx.fillText(m.label, x, y);

      ctx.fillStyle = m.highlight;
      ctx.font = 'bold 24px monospace';
      ctx.fillText(m.value, x, y + 30);
    });

    // Right Column: Distribution Histogram
    const chartX = 620;
    const chartY = 170;
    const chartW = 500;
    const chartH = 260;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.fillRect(chartX, chartY, chartW, chartH);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.strokeRect(chartX, chartY, chartW, chartH);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '13px monospace';
    ctx.fillText('RESPONSE LATENCY DISTRIBUTION (ms)', chartX + 15, chartY + 30);

    if (stats.distribution.length > 0) {
      const maxCount = Math.max(...stats.distribution.map(d => d.count), 1);
      const barSpacing = chartW / stats.distribution.length;
      const barWidth = barSpacing * 0.7;

      stats.distribution.forEach((bin, bIdx) => {
        const barHeight = (bin.count / maxCount) * 140;
        const bx = chartX + 25 + bIdx * barSpacing;
        const by = chartY + chartH - 45 - barHeight;

        // Bar Fill
        const barGrad = ctx.createLinearGradient(bx, by, bx, by + barHeight);
        barGrad.addColorStop(0, '#f43f5e');
        barGrad.addColorStop(1, 'rgba(244, 63, 94, 0.3)');
        ctx.fillStyle = barGrad;
        ctx.fillRect(bx, by, barWidth, barHeight);

        // Bar label (ms)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '11px monospace';
        ctx.fillText(`${bin.binStart}`, bx, chartY + chartH - 20);

        // Count on top of bar
        if (bin.count > 0) {
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 12px monospace';
          ctx.fillText(`${bin.count}`, bx + barWidth / 4, by - 6);
        }
      });
    }

    // Fatigue Assessment Pill
    const fatigueText = stats.fatigueSlope > 1 
      ? 'TREND: DEGRADING (FATIGUE)' 
      : stats.fatigueSlope < -1 
      ? 'TREND: ACCELERATING (WARMUP)' 
      : 'TREND: HIGH CONSISTENCY';
    
    ctx.fillStyle = 'rgba(244, 63, 94, 0.15)';
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.4)';
    ctx.beginPath();
    ctx.roundRect(chartX, chartY + chartH + 20, chartW, 40, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fca5a5';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(`${fatigueText} (SLOPE: ${stats.fatigueSlope > 0 ? '+' : ''}${stats.fatigueSlope} ms/trial)`, chartX + 20, chartY + chartH + 45);

    // Footer Watermark & Challenge URL
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('github.com/hvndal/Mnema', 60, height - 55);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '13px sans-serif';
    ctx.fillText('Test your neuromuscular response latency with native gamepad polling.', 340, height - 55);

    resolve(canvas.toDataURL('image/png'));
  });
}
