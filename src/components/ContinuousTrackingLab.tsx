import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { RawGamepadState } from '../types/telemetry';
import type {
  Point2D,
  TrackingPattern,
  TrackingDifficulty,
  TrackingSample,
  ContinuousTrackingStats,
} from '../types/precisionTracking';
import {
  calculateDistance,
  calculateTrackingStats,
} from '../utils/precisionTrackingStats';
import {
  exportTrackingCSV,
  exportTrackingJSON,
} from '../utils/precisionTrackingExport';

interface ContinuousTrackingLabProps {
  controller: RawGamepadState | null;
  browserRenderHz: number;
}

const PLAY_WIDTH = 640;
const PLAY_HEIGHT = 420;
const CURSOR_SPEED_PX_PER_SEC = 440;
const TARGET_RADIUS_PX = 32;
const TRIAL_DURATION_MS = 25000; // 25 seconds scored trial
const PRACTICE_DURATION_MS = 10000; // 10 seconds practice round
const SAMPLE_INTERVAL_MS = 40; // 25 Hz telemetry recording cadence to avoid memory bloat while preserving resolution

export const ContinuousTrackingLab: React.FC<ContinuousTrackingLabProps> = ({ controller, browserRenderHz: _browserRenderHz }) => {
  const [phase, setPhase] = useState<'idle' | 'practice_intro' | 'active_tracking' | 'summary'>('idle');
  const [sessionId, setSessionId] = useState<string>(() => `track-${Date.now()}`);
  const [isPractice, setIsPractice] = useState<boolean>(true);

  // Settings
  const [pattern, setPattern] = useState<TrackingPattern>('sinusoidal');
  const [difficulty, setDifficulty] = useState<TrackingDifficulty>('normal');

  // Positions
  const [cursorPos, setCursorPos] = useState<Point2D>({ x: PLAY_WIDTH / 2, y: PLAY_HEIGHT / 2 });
  const [targetPos, setTargetPos] = useState<Point2D>({ x: PLAY_WIDTH / 2, y: PLAY_HEIGHT / 2 });
  const [currentErrorPx, setCurrentErrorPx] = useState<number>(0);
  const [isInsideTarget, setIsInsideTarget] = useState<boolean>(true);
  const [timeRemainingSec, setTimeRemainingSec] = useState<number>(25);

  // Results
  const [trackingSummary, setTrackingSummary] = useState<ContinuousTrackingStats | null>(null);

  // References
  const samplesRef = useRef<TrackingSample[]>([]);
  const trialStartTimeRef = useRef<number>(0);
  const lastSampleTimeRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(performance.now());
  const trialTimerRef = useRef<number | null>(null);

  // Waypoint pattern state
  const waypointsRef = useRef<Point2D[]>([]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (trialTimerRef.current) clearInterval(trialTimerRef.current);
    };
  }, []);

  // Monitor visibility interruptions
  useEffect(() => {
    const handleVis = () => {
      if (document.hidden && phase === 'active_tracking') {
        // Flag interrupted sample
        const now = performance.now();
        samplesRef.current.push({
          timestampMs: now,
          elapsedMs: now - trialStartTimeRef.current,
          targetX: targetPos.x,
          targetY: targetPos.y,
          cursorX: cursorPos.x,
          cursorY: cursorPos.y,
          distanceErrorPx: calculateDistance(cursorPos, targetPos),
          isInsideTargetRadius: false,
          isInterrupted: true,
        });
      }
    };
    document.addEventListener('visibilitychange', handleVis);
    return () => document.removeEventListener('visibilitychange', handleVis);
  }, [phase, cursorPos, targetPos]);

  // Compute deterministic target position based on elapsed time
  const computeTargetPosition = useCallback((elapsedMs: number, pat: TrackingPattern, diff: TrackingDifficulty): Point2D => {
    const tSec = elapsedMs / 1000;
    const speedMult = diff === 'fast' ? 1.45 : 1.0;
    const centerX = PLAY_WIDTH / 2;
    const centerY = PLAY_HEIGHT / 2;

    if (pat === 'sinusoidal') {
      // Smooth sinusoidal figure
      const freqX = 0.35 * speedMult;
      const freqY = 0.55 * speedMult;
      const ampX = 220;
      const ampY = 140;
      return {
        x: centerX + Math.sin(tSec * freqX * Math.PI * 2) * ampX,
        y: centerY + Math.cos(tSec * freqY * Math.PI * 2) * ampY,
      };
    } else if (pat === 'lissajous') {
      // Lissajous curve (3:2 ratio)
      const freq = 0.25 * speedMult;
      return {
        x: centerX + Math.sin(tSec * freq * 3 * Math.PI * 2) * 230,
        y: centerY + Math.sin(tSec * freq * 2 * Math.PI * 2) * 150,
      };
    } else {
      // Waypoint pattern: cyclic path through bounded perimeter corners and center
      const points: Point2D[] = [
        { x: 140, y: 100 },
        { x: PLAY_WIDTH - 140, y: 100 },
        { x: PLAY_WIDTH - 140, y: PLAY_HEIGHT - 100 },
        { x: 140, y: PLAY_HEIGHT - 100 },
        { x: centerX, y: centerY },
      ];
      waypointsRef.current = points;
      const totalCycleTimeSec = (diff === 'fast' ? 10 : 16);
      const progress = (tSec % totalCycleTimeSec) / totalCycleTimeSec;
      const segIndex = Math.floor(progress * points.length);
      const nextIndex = (segIndex + 1) % points.length;
      const segProgress = (progress * points.length) - segIndex;

      const p1 = points[segIndex];
      const p2 = points[nextIndex];
      return {
        x: p1.x + (p2.x - p1.x) * segProgress,
        y: p1.y + (p2.y - p1.y) * segProgress,
      };
    }
  }, []);

  // Start tracking trial
  const startTracking = (practiceMode: boolean) => {
    setIsPractice(practiceMode);
    samplesRef.current = [];
    const now = performance.now();
    trialStartTimeRef.current = now;
    lastSampleTimeRef.current = now;
    lastFrameTimeRef.current = now;

    const initialTarget = computeTargetPosition(0, pattern, difficulty);
    setTargetPos(initialTarget);
    setCursorPos({ x: PLAY_WIDTH / 2, y: PLAY_HEIGHT / 2 });

    const durMs = practiceMode ? PRACTICE_DURATION_MS : TRIAL_DURATION_MS;
    setTimeRemainingSec(Math.ceil(durMs / 1000));
    setPhase('active_tracking');

    if (trialTimerRef.current) clearInterval(trialTimerRef.current);
    trialTimerRef.current = window.setInterval(() => {
      const elapsed = performance.now() - trialStartTimeRef.current;
      const remaining = Math.max(0, Math.ceil((durMs - elapsed) / 1000));
      setTimeRemainingSec(remaining);

      if (elapsed >= durMs) {
        if (trialTimerRef.current) clearInterval(trialTimerRef.current);
        finishTracking(practiceMode);
      }
    }, 200);
  };

  const finishTracking = (wasPractice: boolean) => {
    if (wasPractice) {
      setIsPractice(false);
      setPhase('practice_intro');
    } else {
      const stats = calculateTrackingStats(
        samplesRef.current,
        sessionId,
        pattern,
        difficulty,
        TARGET_RADIUS_PX
      );
      setTrackingSummary(stats);
      setPhase('summary');

      // Persist session to local history
      import('../utils/sessionStorage').then(({ saveSession }) => {
        saveSession({
          id: sessionId,
          timestamp: new Date().toISOString(),
          experimentType: 'continuous_tracking',
          protocolVersion: '3.0-controller-precision-tracking',
          hardwareName: controller ? (controller.id.includes('EvoFox') ? 'EvoFox One S' : controller.id.slice(0, 24)) : 'Standard Gamepad',
          controllerId: controller?.id || null,
          settingsSummary: { pattern, difficulty },
          sampleCount: stats.totalSamplesRecorded,
          hasInterruptedTrials: samplesRef.current.some(s => s.isInterrupted),
          dataQualityWarnings: stats.timeInTargetPercentage < 35 ? ['Low target tracking accuracy'] : [],
          trackingStats: stats,
          rawTrackingSamples: samplesRef.current,
        }).catch(console.error);
      });
    }
  };

  // Main Tracking Animation Loop
  useEffect(() => {
    let animId: number;

    const loop = () => {
      const now = performance.now();
      const dtSec = Math.min((now - lastFrameTimeRef.current) / 1000, 0.05);
      lastFrameTimeRef.current = now;

      if (phase === 'active_tracking') {
        const elapsed = now - trialStartTimeRef.current;
        const newTarget = computeTargetPosition(elapsed, pattern, difficulty);
        setTargetPos(newTarget);

        // Read left analog stick input with deadzone
        let moveX = 0;
        let moveY = 0;

        if (controller) {
          const rawX = controller.axes[0]?.value ?? 0;
          const rawY = controller.axes[1]?.value ?? 0;
          const deadzone = 0.08;
          const mag = Math.sqrt(rawX * rawX + rawY * rawY);

          if (mag > deadzone) {
            const norm = (mag - deadzone) / (1 - deadzone);
            moveX = (rawX / mag) * norm;
            moveY = (rawY / mag) * norm;
          }
        }

        // Move cursor with frame-rate independence
        setCursorPos(prev => {
          const nextX = Math.max(10, Math.min(PLAY_WIDTH - 10, prev.x + moveX * CURSOR_SPEED_PX_PER_SEC * dtSec));
          const nextY = Math.max(10, Math.min(PLAY_HEIGHT - 10, prev.y + moveY * CURSOR_SPEED_PX_PER_SEC * dtSec));
          const updatedCursor = { x: nextX, y: nextY };

          const distErr = calculateDistance(updatedCursor, newTarget);
          setCurrentErrorPx(distErr);
          const inside = distErr <= TARGET_RADIUS_PX;
          setIsInsideTarget(inside);

          // Record telemetry sample at regular interval (40ms / 25Hz)
          if (now - lastSampleTimeRef.current >= SAMPLE_INTERVAL_MS) {
            lastSampleTimeRef.current = now;
            samplesRef.current.push({
              timestampMs: now,
              elapsedMs: elapsed,
              targetX: newTarget.x,
              targetY: newTarget.y,
              cursorX: updatedCursor.x,
              cursorY: updatedCursor.y,
              distanceErrorPx: distErr,
              isInsideTargetRadius: inside,
              isInterrupted: false,
            });
          }

          return updatedCursor;
        });
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [phase, controller, pattern, difficulty, computeTargetPosition]);

  const handleRestart = () => {
    if (trialTimerRef.current) clearInterval(trialTimerRef.current);
    setSessionId(`track-${Date.now()}`);
    samplesRef.current = [];
    setTrackingSummary(null);
    setIsPractice(true);
    setPhase('idle');
  };

  return (
    <div className="w-full flex flex-col gap-6 font-mono text-neutral-200">
      {/* Top Banner */}
      <div className="border border-neutral-800 bg-neutral-900/90 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-base font-bold text-white tracking-wide">
            EXPERIMENT B // CONTINUOUS TRACKING (Pursuit Rotor Dynamics)
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Continuously track moving visual targets with the EvoFox left stick. Measures pursuit RMSE and tracking lag.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-neutral-500">PATTERN:</span>
          {(['sinusoidal', 'waypoint', 'lissajous'] as TrackingPattern[]).map(p => (
            <button
              key={p}
              disabled={phase === 'active_tracking'}
              onClick={() => setPattern(p)}
              className={`px-2 py-0.5 rounded border uppercase text-xs cursor-pointer ${
                pattern === p
                  ? 'bg-neutral-200 text-neutral-950 border-white font-bold'
                  : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
              }`}
            >
              {p}
            </button>
          ))}
          <span className="text-neutral-600">|</span>
          <button
            disabled={phase === 'active_tracking'}
            onClick={() => setDifficulty(d => (d === 'normal' ? 'fast' : 'normal'))}
            className={`px-2 py-0.5 rounded border text-xs cursor-pointer ${
              difficulty === 'fast'
                ? 'bg-amber-950 border-amber-600 text-amber-300 font-bold'
                : 'bg-neutral-950 text-neutral-400 border-neutral-800'
            }`}
          >
            {difficulty === 'fast' ? 'FAST SPEED' : 'NORMAL SPEED'}
          </button>
        </div>
      </div>

      {/* Main Play Area */}
      <div className="border border-neutral-800 bg-neutral-900/70 p-6 rounded-lg flex flex-col items-center justify-between min-h-[500px]">
        {/* Phase: IDLE */}
        {phase === 'idle' && (
          <div className="flex flex-col items-center justify-center max-w-xl text-center gap-4 my-auto">
            <h3 className="text-lg font-bold text-white uppercase tracking-wider">
              READY FOR CONTINUOUS PURSUIT TRACKING
            </h3>
            <p className="text-xs text-neutral-300 leading-relaxed bg-neutral-950 p-4 border border-neutral-800 rounded">
              • <strong>Objective:</strong> Keep the blue crosshair cursor inside the glowing target zone as it navigates the arena.<br />
              • <strong>Stick Input:</strong> Steer continuously with your EvoFox <strong>Left Analog Stick</strong>.<br />
              • <strong>Scoring:</strong> 10-second practice round followed by a 25-second scored run measuring RMSE tracking error, time in target, and correction frequency.
            </p>
            <button
              onClick={() => startTracking(true)}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs rounded cursor-pointer"
            >
              START PRACTICE ROUND (10s) →
            </button>
          </div>
        )}

        {/* Phase: PRACTICE FINISHED INTRODUCING SCORED */}
        {phase === 'practice_intro' && (
          <div className="flex flex-col items-center justify-center max-w-xl text-center gap-4 my-auto">
            <div className="p-3 bg-blue-950/60 border border-blue-700 text-blue-200 text-xs rounded">
              ✓ <strong>PRACTICE COMPLETE:</strong> You completed the practice session.
            </div>
            <h3 className="text-base font-bold text-white">READY FOR 25-SECOND SCORED RUN</h3>
            <p className="text-xs text-neutral-400">
              Focus on smooth stick adjustments. Maintain position inside the target perimeter.
            </p>
            <button
              onClick={() => startTracking(false)}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded cursor-pointer"
            >
              START SCORED RUN (25 SECONDS) →
            </button>
          </div>
        )}

        {/* Phase: ACTIVE TRACKING */}
        {phase === 'active_tracking' && (
          <div className="w-full flex flex-col gap-4">
            <div className="flex justify-between items-center text-xs text-neutral-400 border-b border-neutral-800 pb-2">
              <span className="font-bold text-white">
                {isPractice ? 'PRACTICE' : 'SCORED RUN'}: {timeRemainingSec}s REMAINING
              </span>
              <div className="flex items-center gap-4">
                <span>ERROR: <strong className={isInsideTarget ? 'text-emerald-400' : 'text-rose-400'}>{currentErrorPx.toFixed(1)} px</strong></span>
                <span className={isInsideTarget ? 'text-emerald-400 font-bold' : 'text-neutral-500'}>
                  {isInsideTarget ? '● ON TARGET' : '○ OFF TARGET'}
                </span>
              </div>
            </div>

            {/* Play Arena */}
            <div
              style={{ width: `${PLAY_WIDTH}px`, height: `${PLAY_HEIGHT}px` }}
              className="relative mx-auto bg-neutral-950 border border-neutral-800 rounded-lg overflow-hidden select-none"
            >
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2028_1px,transparent_1px),linear-gradient(to_bottom,#1f2028_1px,transparent_1px)] bg-[size:40px_40px] opacity-20" />

              {/* Moving Target */}
              <div
                style={{
                  left: `${targetPos.x}px`,
                  top: `${targetPos.y}px`,
                  width: `${TARGET_RADIUS_PX * 2}px`,
                  height: `${TARGET_RADIUS_PX * 2}px`,
                  transform: 'translate(-50%, -50%)',
                }}
                className={`absolute rounded-full border-2 flex items-center justify-center transition-colors ${
                  isInsideTarget
                    ? 'border-emerald-400 bg-emerald-500/25 shadow-[0_0_24px_rgba(16,185,129,0.6)]'
                    : 'border-rose-500 bg-rose-500/20 shadow-[0_0_16px_rgba(244,63,94,0.3)]'
                }`}
              >
                <div className="w-3 h-3 rounded-full bg-white opacity-90" />
              </div>

              {/* User Cursor */}
              <div
                style={{
                  left: `${cursorPos.x}px`,
                  top: `${cursorPos.y}px`,
                  transform: 'translate(-50%, -50%)',
                }}
                className="absolute w-6 h-6 pointer-events-none flex items-center justify-center"
              >
                <div className="w-6 h-0.5 bg-sky-400 absolute" />
                <div className="h-6 w-0.5 bg-sky-400 absolute" />
                <div className="w-2 h-2 rounded-full border border-white" />
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full max-w-[640px] mx-auto h-1.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
              <div
                className="h-full bg-rose-500 transition-all duration-200"
                style={{
                  width: `${(( (isPractice ? PRACTICE_DURATION_MS : TRIAL_DURATION_MS) / 1000 - timeRemainingSec) / ((isPractice ? PRACTICE_DURATION_MS : TRIAL_DURATION_MS) / 1000)) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Phase: SUMMARY RESULTS */}
        {phase === 'summary' && trackingSummary && (
          <div className="w-full flex flex-col gap-6">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white uppercase tracking-wider">
                  CONTINUOUS TRACKING // PERFORMANCE REPORT
                </h3>
                <span className="text-xs text-neutral-500">
                  Pattern: {trackingSummary.pattern.toUpperCase()} • Speed: {trackingSummary.difficulty.toUpperCase()} • Samples: {trackingSummary.totalSamplesRecorded}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => exportTrackingCSV(samplesRef.current, trackingSummary)}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 rounded text-xs font-bold cursor-pointer"
                >
                  EXPORT CSV
                </button>
                <button
                  onClick={() => exportTrackingJSON(samplesRef.current, trackingSummary)}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 rounded text-xs font-bold cursor-pointer"
                >
                  EXPORT JSON
                </button>
              </div>
            </div>

            {/* Primary Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded">
                <span className="text-neutral-500 block text-[11px]">TIME IN TARGET RADIUS</span>
                <span className="text-2xl font-bold text-emerald-400 mt-1 block">
                  {trackingSummary.timeInTargetPercentage}%
                </span>
                <span className="text-[10px] text-neutral-600 block mt-0.5">Target r={trackingSummary.targetRadiusPx}px</span>
              </div>

              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded">
                <span className="text-neutral-500 block text-[11px]">RMSE TRACKING ERROR</span>
                <span className="text-2xl font-bold text-sky-400 mt-1 block">
                  {trackingSummary.rmseTrackingErrorPx} px
                </span>
                <span className="text-[10px] text-neutral-600 block mt-0.5">Root-mean-square distance</span>
              </div>

              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded">
                <span className="text-neutral-500 block text-[11px]">MEAN ERROR (AVERAGE)</span>
                <span className="text-2xl font-bold text-neutral-200 mt-1 block">
                  {trackingSummary.meanTrackingErrorPx} px
                </span>
                <span className="text-[10px] text-neutral-600 block mt-0.5">Peak error: {trackingSummary.maxTrackingErrorPx}px</span>
              </div>

              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded">
                <span className="text-neutral-500 block text-[11px]">ESTIMATED TRACKING LAG</span>
                <span className="text-2xl font-bold text-purple-400 mt-1 block">
                  {trackingSummary.estimatedLagMs !== null ? `${trackingSummary.estimatedLagMs} ms` : 'N/A'}
                </span>
                <span className="text-[10px] text-neutral-600 block mt-0.5">Cross-correlation offset</span>
              </div>
            </div>

            {/* Kinematic summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded flex flex-col gap-1">
                <span className="text-neutral-500 block">TOTAL CURSOR DISPLACEMENT:</span>
                <span className="text-base font-bold text-neutral-200">
                  {trackingSummary.totalCursorDistancePx.toLocaleString()} px
                </span>
                <span className="text-[10px] text-neutral-500">
                  Total path length steered by analog stick over session duration.
                </span>
              </div>

              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded flex flex-col gap-1">
                <span className="text-neutral-500 block">CORRECTION FREQUENCY:</span>
                <span className="text-base font-bold text-amber-400">
                  {trackingSummary.correctionFrequencyHz} reversals / sec
                </span>
                <span className="text-[10px] text-neutral-500">
                  Directional velocity adjustments made to keep cursor on course.
                </span>
              </div>
            </div>

            {/* Methodology Note */}
            <div className="p-3 bg-neutral-950 border border-neutral-800 rounded text-[11px] text-neutral-500 leading-normal">
              <strong>Measurement boundary distinction:</strong> The metrics above record rendered cursor distance relative to target paths via the Web Gamepad API. They do not measure physical neuromuscular hand displacement directly.
            </div>

            <div className="pt-2">
              <button
                onClick={handleRestart}
                className="px-4 py-2 bg-neutral-200 text-neutral-950 font-bold text-xs rounded hover:bg-white cursor-pointer"
              >
                TEST ANOTHER PATTERN OR RETEST →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
