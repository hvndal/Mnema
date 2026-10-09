/**
 * Fast Fourier Transform (FFT) & Power Spectral Density (PSD)
 * Pure TypeScript implementation of Radix-2 Cooley-Tukey algorithm.
 * Used for physiological tremor frequency analysis (8-12 Hz natural tremor).
 */

export interface FFTResult {
  frequencies: number[]; // Frequencies corresponding to bins (Hz)
  magnitudes: number[];  // Amplitude spectrum
  power: number[];       // Power spectral density (normalized)
  peakFrequencyHz: number;
  peakPower: number;
}

/**
 * Resample non-uniform time series data (t in ms, value) onto a uniform time grid.
 * @param timestamps Array of timestamps in milliseconds
 * @param values Array of measured signal values
 * @param targetSamplingRateHz Desired uniform sampling rate (e.g. 50 Hz)
 * @param targetLength Power-of-two length (e.g. 512, 1024, 2048)
 */
export function resampleUniformly(
  timestamps: number[],
  values: number[],
  targetSamplingRateHz: number,
  targetLength: number
): number[] {
  if (timestamps.length < 2 || values.length < 2) {
    return new Array(targetLength).fill(0);
  }

  const startTime = timestamps[0];
  const stepMs = 1000 / targetSamplingRateHz;
  const resampled: number[] = new Array(targetLength);

  let srcIdx = 0;
  for (let i = 0; i < targetLength; i++) {
    const targetTime = startTime + i * stepMs;

    // Advance srcIdx until targetTime is between timestamps[srcIdx] and timestamps[srcIdx + 1]
    while (srcIdx < timestamps.length - 2 && timestamps[srcIdx + 1] < targetTime) {
      srcIdx++;
    }

    if (targetTime <= timestamps[0]) {
      resampled[i] = values[0];
    } else if (targetTime >= timestamps[timestamps.length - 1]) {
      resampled[i] = values[values.length - 1];
    } else {
      const t0 = timestamps[srcIdx];
      const t1 = timestamps[srcIdx + 1];
      const v0 = values[srcIdx];
      const v1 = values[srcIdx + 1];
      const fraction = t1 === t0 ? 0 : (targetTime - t0) / (t1 - t0);
      resampled[i] = v0 + fraction * (v1 - v0);
    }
  }

  return resampled;
}

/**
 * Apply Hann window to reduce spectral leakage
 */
export function applyHannWindow(signal: number[]): number[] {
  const n = signal.length;
  const windowed = new Array(n);
  for (let i = 0; i < n; i++) {
    const multiplier = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
    windowed[i] = signal[i] * multiplier;
  }
  return windowed;
}

/**
 * In-place Radix-2 Cooley-Tukey FFT.
 * Requires signal length to be a power of 2.
 */
export function computeFFT(real: number[], imag: number[]): void {
  const n = real.length;
  if ((n & (n - 1)) !== 0) {
    throw new Error(`FFT length must be a power of 2, received ${n}`);
  }

  // Bit reversal permutation
  let j = 0;
  for (let i = 0; i < n - 1; i++) {
    if (i < j) {
      const tempR = real[i];
      real[i] = real[j];
      real[j] = tempR;

      const tempI = imag[i];
      imag[i] = imag[j];
      imag[j] = tempI;
    }
    let k = n >> 1;
    while (k <= j) {
      j -= k;
      k >>= 1;
    }
    j += k;
  }

  // Cooley-Tukey iterative butterflies
  for (let len = 2; len <= n; len <<= 1) {
    const halfLen = len >> 1;
    const angle = (-2 * Math.PI) / len;
    const wStepR = Math.cos(angle);
    const wStepI = Math.sin(angle);

    for (let i = 0; i < n; i += len) {
      let wR = 1;
      let wI = 0;

      for (let k = 0; k < halfLen; k++) {
        const uR = real[i + k];
        const uI = imag[i + k];

        const tR = wR * real[i + k + halfLen] - wI * imag[i + k + halfLen];
        const tI = wR * imag[i + k + halfLen] + wI * real[i + k + halfLen];

        real[i + k] = uR + tR;
        imag[i + k] = uI + tI;
        real[i + k + halfLen] = uR - tR;
        imag[i + k + halfLen] = uI - tI;

        const nextWR = wR * wStepR - wI * wStepI;
        const nextWI = wR * wStepI + wI * wStepR;
        wR = nextWR;
        wI = nextWI;
      }
    }
  }
}

/**
 * Analyze spectral content of a signal (time series) and return FFT result
 * focusing on physiological tremor frequencies (e.g. 2 to 20 Hz).
 */
export function analyzeSignalSpectrum(
  signal: number[],
  samplingRateHz: number,
  minFreqHz = 2.0,
  maxFreqHz = 20.0
): FFTResult {
  const n = signal.length;
  // Detrend: remove DC offset (mean)
  const mean = signal.reduce((a, b) => a + b, 0) / n;
  const detrended = signal.map((v) => v - mean);

  // Apply Hann window
  const windowed = applyHannWindow(detrended);

  const real = [...windowed];
  const imag = new Array(n).fill(0);

  computeFFT(real, imag);

  const halfN = n / 2;
  const frequencies: number[] = [];
  const magnitudes: number[] = [];
  const power: number[] = [];

  let peakFreq = 0;
  let peakPwr = -Infinity;

  for (let k = 0; k < halfN; k++) {
    const freq = (k * samplingRateHz) / n;
    // Magnitude normalized by N
    const mag = Math.sqrt(real[k] * real[k] + imag[k] * imag[k]) / (n / 2);
    const pwr = (mag * mag);

    if (freq <= 25.0) {
      frequencies.push(Math.round(freq * 10) / 10);
      magnitudes.push(mag);
      power.push(pwr);

      if (freq >= minFreqHz && freq <= maxFreqHz && pwr > peakPwr) {
        peakPwr = pwr;
        peakFreq = freq;
      }
    }
  }

  // Normalize power array to 0-1 for visual charting
  const maxP = Math.max(...power, 0.0001);
  const normalizedPower = power.map((p) => p / maxP);

  return {
    frequencies,
    magnitudes,
    power: normalizedPower,
    peakFrequencyHz: Math.round(peakFreq * 10) / 10,
    peakPower: peakPwr,
  };
}
