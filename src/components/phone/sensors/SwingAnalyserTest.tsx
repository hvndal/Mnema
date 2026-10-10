import React, { useState, useEffect, useRef } from 'react';
import type { MotionSample } from '../../../types/phoneSensors';
import type { SwingPhaseMetrics } from '../../../types/phoneSensorsAdvanced';
import { analyzeSwing } from '../../../utils/phoneSensorsAdvancedMath';
import { Activity, Play } from 'lucide-react';
import { soundEngine } from '../../../utils/soundEngine';

interface SwingAnalyserTestProps {
  latestMotion: MotionSample | null;
  sensorHz?: number;
  isSimulated?: boolean;
}

export const SwingAnalyserTest: React.FC<SwingAnalyserTestProps> = ({
  latestMotion,
  isSimulated,
}) => {
  const [isArmed, setIsArmed] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string>('Ready to Arm');
  const [liveDegPerSec, setLiveDegPerSec] = useState<number>(0);
  const [metrics, setMetrics] = useState<SwingPhaseMetrics | null>(null);

  const samplesBufferRef = useRef<{ timestamp: number; rateDegPerSec: number }[]>([]);
  const isRecordingSwingRef = useRef<boolean>(false);
  const triggerThreshold = 240; // deg/s onset trigger

  useEffect(() => {
    if (!isArmed || !latestMotion) return;

    const alpha = latestMotion.rotAlpha ?? latestMotion.rotationRate?.alpha ?? 0;
    const beta = latestMotion.rotBeta ?? latestMotion.rotationRate?.beta ?? 0;
    const gamma = latestMotion.rotGamma ?? latestMotion.rotationRate?.gamma ?? 0;
    const rate = Math.hypot(alpha, beta, gamma);
    setLiveDegPerSec(Math.round(rate));

    const now = performance.now();
    samplesBufferRef.current.push({ timestamp: now, rateDegPerSec: rate });

    // Keep rolling window of 100 samples
    if (samplesBufferRef.current.length > 100) {
      samplesBufferRef.current.shift();
    }

    // Trigger detection
    if (!isRecordingSwingRef.current && rate > triggerThreshold) {
      isRecordingSwingRef.current = true;
      setStatusText('🔥 SWING IN FLIGHT...');
      soundEngine.startPing();

      // Collect 600ms of swing data and then evaluate
      setTimeout(() => {
        isRecordingSwingRef.current = false;
        setIsArmed(false);
        setStatusText('Swing Analyzed!');
        soundEngine.completeFanfare();

        const calculated = analyzeSwing(samplesBufferRef.current);
        setMetrics(calculated);
      }, 550);
    }
  }, [isArmed, latestMotion]);

  const handleArm = () => {
    samplesBufferRef.current = [];
    setMetrics(null);
    setIsArmed(true);
    setStatusText('Armed — Take your swing now!');
    soundEngine.tick();
  };

  const simulateSwing = () => {
    setIsArmed(false);
    setStatusText('Simulated Swing Executed');
    soundEngine.startPing();

    const mock: { timestamp: number; rateDegPerSec: number }[] = [];
    const t0 = performance.now();
    // 500ms realistic swing curve
    for (let t = 0; t <= 500; t += 10) {
      let speed = 0;
      if (t < 150) speed = (t / 150) * 120; // Takeaway
      else if (t < 320) speed = 120 + ((t - 150) / 170) ** 2 * 1480; // Acceleration to peak 1600 deg/s
      else speed = 1600 * Math.exp(-(t - 320) / 70); // Follow-through
      mock.push({ timestamp: t0 + t, rateDegPerSec: speed });
    }

    setTimeout(() => {
      soundEngine.completeFanfare();
      const calculated = analyzeSwing(mock);
      setMetrics(calculated);
    }, 300);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Intro Header */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-800 text-[11px] font-bold mb-2">
            <Activity className="w-3.5 h-3.5" />
            Kinetic Swing & Throw Tracker
          </div>
          <h3 className="text-xl font-black text-zinc-900">Bat, Racket & Wrist Swing Analyser</h3>
          <p className="text-xs text-zinc-500 max-w-xl mt-1 leading-relaxed">
            Hold phone in hand or strap to wrist / sports racket. Captures peak angular speed, acceleration phase duration, impact velocity in km/h, and follow-through smoothness.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleArm}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer ${
              isArmed
                ? 'bg-amber-500 hover:bg-amber-600 text-white animate-pulse'
                : 'bg-violet-600 hover:bg-violet-700 text-white'
            }`}
          >
            <Play className="w-4 h-4 fill-current" />
            {isArmed ? 'ARMED: SWING NOW' : 'Arm Sensor'}
          </button>

          {isSimulated && (
            <button
              onClick={simulateSwing}
              className="px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 text-xs font-semibold cursor-pointer"
            >
              Simulate Swing
            </button>
          )}
        </div>
      </div>

      {/* Live Monitor Bar */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`w-3 h-3 rounded-full ${isArmed ? 'bg-amber-500 animate-ping' : 'bg-zinc-300'}`} />
          <span className="font-bold text-xs text-zinc-800">{statusText}</span>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="text-zinc-500">Live Rate:</span>
          <span className="font-bold text-zinc-900">{liveDegPerSec} °/s</span>
          <span className="text-zinc-400">Trigger: {triggerThreshold} °/s</span>
        </div>
      </div>

      {/* Swing Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-zinc-500 block mb-1">PEAK ANGULAR SPEED</span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black font-mono text-zinc-900">{metrics.peakSpeedDegPerSec}</span>
                <span className="text-xs font-bold text-violet-600">°/s</span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-100 text-[11px] text-zinc-500 flex justify-between">
              <span>Peak Acceleration:</span>
              <span className="font-mono font-bold text-zinc-800">{metrics.peakAngularAccelDegPerSec2} °/s²</span>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-zinc-500 block mb-1">SWEET-SPOT IMPACT VELOCITY</span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black font-mono text-emerald-600">{metrics.impactSpeedKmh}</span>
                <span className="text-xs font-bold text-emerald-700">km/h</span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-100 text-[11px] text-zinc-500 flex justify-between">
              <span>Smoothness Score:</span>
              <span className="font-mono font-bold text-emerald-600">{metrics.smoothnessScore} / 100</span>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-zinc-500 block mb-1">PHASE DURATION BREAKDOWN</span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black font-mono text-zinc-900">{metrics.totalSwingDurationMs}</span>
                <span className="text-xs font-bold text-zinc-500">ms total</span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-zinc-100 text-[11px] text-zinc-500 flex justify-between">
              <span>Accel: {metrics.accelerationDurationMs}ms</span>
              <span>•</span>
              <span>Follow: {metrics.followThroughDurationMs}ms</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
