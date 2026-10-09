import type { StoredSessionRecord } from '../types/history';

export type CardFormat = 'square' | 'portrait';

export interface CardMetricSelection {
  label: string;
  value: string;
  unit: string;
}

export interface GenerateResultCardOptions {
  session: StoredSessionRecord;
  format: CardFormat;
  selectedMetrics: CardMetricSelection[];
  publicWebsiteUrl?: string;
}

/**
 * Renders a crisp downloadable PNG result card in Square (1080x1080) or Portrait (1080x1920) format.
 */
export function generateResultCardCanvas(options: GenerateResultCardOptions): Promise<string> {
  return new Promise((resolve) => {
    const { session, format, selectedMetrics, publicWebsiteUrl = 'github.com/hvndal/Mnema' } = options;

    const width = 1080;
    const height = format === 'square' ? 1080 : 1920;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      resolve('');
      return;
    }

    // 1. Background fill
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#090a0f');
    bgGrad.addColorStop(0.5, '#0e111a');
    bgGrad.addColorStop(1, '#07080c');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Subtle grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.lineWidth = 1;
    const gridStep = 45;
    for (let x = 0; x < width; x += gridStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridStep) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // 3. Accent borders & margin
    const margin = 50;
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.4)';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(margin, margin, width - margin * 2, height - margin * 2);

    // 4. Header Bar
    ctx.fillStyle = '#f43f5e';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('MNEMA // CONTROLLER PERFORMANCE LAB', margin + 40, margin + 70);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '18px monospace';
    ctx.fillText(`PROTOCOL: ${session.protocolVersion} • ${new Date(session.timestamp).toLocaleDateString()}`, margin + 40, margin + 110);

    // 5. Experiment Title
    const experimentTitles: Record<string, string> = {
      reaction: 'REACTION-TIME BENCHMARK',
      target_acquisition: 'TARGET ACQUISITION (FITTS)',
      continuous_tracking: 'CONTINUOUS PURSUIT TRACKING',
      diagnostics_calibration: 'HARDWARE CALIBRATION PROFILE',
    };
    const title = experimentTitles[session.experimentType] || 'PERFORMANCE SESSION';

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 46px sans-serif';
    ctx.fillText(title, margin + 40, margin + 185);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '20px monospace';
    ctx.fillText(`HARDWARE: ${session.hardwareName.toUpperCase()} • SAMPLES: ${session.sampleCount}`, margin + 40, margin + 230);

    // 6. Primary Highlight (First Metric)
    if (selectedMetrics.length > 0) {
      const primary = selectedMetrics[0];
      const startY = margin + 340;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '20px monospace';
      ctx.fillText(primary.label.toUpperCase(), margin + 40, startY);

      ctx.fillStyle = '#f43f5e';
      ctx.font = '900 110px monospace';
      ctx.fillText(primary.value, margin + 40, startY + 110);

      const valWidth = ctx.measureText(primary.value).width;
      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 44px monospace';
      ctx.fillText(primary.unit, margin + 55 + valWidth, startY + 110);
    }

    // 7. Metric Grid Cards
    const secondaryMetrics = selectedMetrics.slice(1);
    const startY = margin + 540;
    const cols = format === 'square' ? 2 : 2;
    const cardW = (width - margin * 2 - 80 - (cols - 1) * 30) / cols;
    const cardH = 140;

    secondaryMetrics.forEach((m, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const cx = margin + 40 + col * (cardW + 30);
      const cy = startY + row * (cardH + 25);

      if (cy + cardH > height - margin - 140) return; // Prevent overflow

      // Card Background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.fillRect(cx, cy, cardW, cardH);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.strokeRect(cx, cy, cardW, cardH);

      // Card label
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '16px monospace';
      ctx.fillText(m.label.toUpperCase(), cx + 20, cy + 38);

      // Card Value
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px monospace';
      ctx.fillText(`${m.value} ${m.unit}`, cx + 20, cy + 90);
    });

    // 8. Explicit Non-Clinical Disclaimer
    const disclaimerY = height - margin - 120;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.font = '14px sans-serif';
    ctx.fillText('Notice: Experimental motor-performance measurement via Web Gamepad API.', margin + 40, disclaimerY);
    ctx.fillText('This is not a clinical assessment, diagnostic score, or medical evaluation.', margin + 40, disclaimerY + 22);

    // 9. Public Footer Link
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px monospace';
    ctx.fillText(publicWebsiteUrl, margin + 40, height - margin - 40);

    resolve(canvas.toDataURL('image/png'));
  });
}
