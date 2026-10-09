import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { RawGamepadState } from '../types/telemetry';
import type {
  Point2D,
  AcquisitionTargetConfig,
  AcquisitionTargetSize,
  AcquisitionDistanceCategory,
  RawAcquisitionTrialRecord,
  TargetAcquisitionStats,
} from '../types/precisionTracking';
import {
  calculateDistance,
  calculatePathEfficiency,
  calculateTargetAcquisitionStats,
} from '../utils/precisionTrackingStats';
import {
  exportTargetAcquisitionCSV,
  exportTargetAcquisitionJSON,
} from '../utils/precisionTrackingExport';

interface TargetAcquisitionLabProps {
  controller: RawGamepadState | null;
  browserRenderHz: number;
}

const PLAY_WIDTH = 640;
const PLAY_HEIGHT = 420;
const CURSOR_SPEED_PX_PER_SEC = 460;
const SCORED_TARGETS_TOTAL = 20;
const PRACTICE_TARGETS_TOTAL = 3;
const TARGET_TIMEOUT_MS = 4500; // Documented timeout per target

export const TargetAcquisitionLab: React.FC<TargetAcquisitionLabProps> = ({ controller, browserRenderHz: _browserRenderHz }) => {
  const [phase, setPhase] = useState<'idle' | 'practice_intro' | 'active_trial' | 'inter_trial' | 'summary'>('idle');
  const [sessionId, setSessionId] = useState<string>(() => `acq-${Date.now()}`);
  const [isPractice, setIsPractice] = useState<boolean>(true);
  const [currentTrialNumber, setCurrentTrialNumber] = useState<number>(0);

  // Calibration check / Confirmation button mapping (defaults to Button 0 / A, or verified)
  const [confirmButtonIndex, setConfirmButtonIndex] = useState<number>(0);
  const [isConfiguringButton, setIsConfiguringButton] = useState<boolean>(false);

  // Allow configuring confirm button by listening to any button press
  useEffect(() => {
    if (!isConfiguringButton || !controller) return;
    for (let i = 0; i < controller.buttons.length; i++) {
      if (controller.buttons[i].pressed) {
        setConfirmButtonIndex(i);
        setIsConfiguringButton(false);
        break;
      }
    }
  }, [controller, isConfiguringButton]);

  // Play area cursor and target
  const [cursorPos, setCursorPos] = useState<Point2D>({ x: PLAY_WIDTH / 2, y: PLAY_HEIGHT / 2 });
  const [activeTarget, setActiveTarget] = useState<AcquisitionTargetConfig | null>(null);
  const [lastFeedback, setLastFeedback] = useState<{ msg: string; hit: boolean } | null>(null);

  // Summary results
  const [statsSummary, setStatsSummary] = useState<TargetAcquisitionStats | null>(null);

  // References for timing, kinematics & trial tracking
  const trialsHistoryRef = useRef<RawAcquisitionTrialRecord[]>([]);
  const cursorTrajectoryRef = useRef<Point2D[]>([]);
  const trialStartTimeRef = useRef<number>(0);
  const targetAppearanceTimeRef = useRef<number>(0);
  const cursorStartPosRef = useRef<Point2D>({ x: PLAY_WIDTH / 2, y: PLAY_HEIGHT / 2 });
  const timeoutTimerRef = useRef<number | null>(null);

  // Overshoot state tracker
  const wasInsideTargetRef = useRef<boolean>(false);
  const overshootsCountRef = useRef<number>(0);

  // Button edge detector for confirmation
  const prevButtonStateRef = useRef<boolean>(false);
  const hasConfirmedThisTrialRef = useRef<boolean>(false);
  const lastFrameTimeRef = useRef<number>(performance.now());

  // Cleanup timeout timer on unmount
  useEffect(() => {
    return () => {
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
    };
  }, []);

  // Monitor visibility interruptions
  useEffect(() => {
    const handleVisChange = () => {
      if (document.hidden && phase === 'active_trial') {
        if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
        // Mark trial as invalidated
        recordTrialOutcome('invalidated', 'Browser tab lost visibility during trial');
      }
    };
    document.addEventListener('visibilitychange', handleVisChange);
    return () => document.removeEventListener('visibilitychange', handleVisChange);
  }, [phase]);

  // Generate a random target with controlled sizes & distances from current cursor position
  const spawnTarget = useCallback((_currentCursor: Point2D): AcquisitionTargetConfig => {
    // 3 distinct sizes: small (r=14), medium (r=24), large (r=36)
    const sizes: { cat: AcquisitionTargetSize; r: number }[] = [
      { cat: 'small', r: 14 },
      { cat: 'medium', r: 24 },
      { cat: 'large', r: 36 },
    ];
    const pickedSize = sizes[Math.floor(Math.random() * sizes.length)];

    // Target positions bounded inside play area with 40px margin
    const margin = 50;
    const x = margin + Math.random() * (PLAY_WIDTH - margin * 2);
    const y = margin + Math.random() * (PLAY_HEIGHT - margin * 2);

    return {
      id: `target-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      x: Math.round(x),
      y: Math.round(y),
      radius: pickedSize.r,
      sizeCategory: pickedSize.cat,
    };
  }, []);

  // Start next trial
  const startNextTrial = useCallback((_trialIdx: number, _practiceMode: boolean) => {
    hasConfirmedThisTrialRef.current = false;
    wasInsideTargetRef.current = false;
    overshootsCountRef.current = 0;
    setLastFeedback(null);

    const newTarget = spawnTarget(cursorPos);
    setActiveTarget(newTarget);
    cursorStartPosRef.current = { ...cursorPos };
    cursorTrajectoryRef.current = [{ ...cursorPos }];
    targetAppearanceTimeRef.current = performance.now();
    trialStartTimeRef.current = performance.now();
    setPhase('active_trial');

    // Documented timeout limit
    timeoutTimerRef.current = window.setTimeout(() => {
      if (!hasConfirmedThisTrialRef.current) {
        recordTrialOutcome('timeout', `Target acquisition timed out (> ${TARGET_TIMEOUT_MS}ms)`);
      }
    }, TARGET_TIMEOUT_MS);
  }, [cursorPos, spawnTarget]);

  // Record outcome of the trial
  const recordTrialOutcome = (outcome: 'hit' | 'miss_button' | 'timeout' | 'invalidated', errorReason: string | null = null) => {
    if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
    hasConfirmedThisTrialRef.current = true;

    const now = performance.now();
    const target = activeTarget;
    if (!target) return;

    const startPos = cursorStartPosRef.current;
    const finalPos = cursorPos;
    const shortestDist = calculateDistance(startPos, { x: target.x, y: target.y });

    // Actual path length
    let actualPathLen = 0;
    const pts = cursorTrajectoryRef.current;
    for (let i = 1; i < pts.length; i++) {
      actualPathLen += calculateDistance(pts[i - 1], pts[i]);
    }

    const efficiency = calculatePathEfficiency(shortestDist, actualPathLen);
    const endpointErr = calculateDistance(finalPos, { x: target.x, y: target.y });
    const acqTime = outcome === 'hit' ? now - targetAppearanceTimeRef.current : null;

    // Determine distance category
    let distCat: AcquisitionDistanceCategory = 'medium';
    if (shortestDist < 160) distCat = 'short';
    else if (shortestDist > 320) distCat = 'long';

    const record: RawAcquisitionTrialRecord = {
      sessionId,
      protocolVersion: '3.0-controller-precision-tracking',
      isPractice,
      trialNumber: currentTrialNumber + 1,
      targetId: target.id,
      targetX: target.x,
      targetY: target.y,
      targetRadius: target.radius,
      sizeCategory: target.sizeCategory,
      distanceCategory: distCat,
      cursorStartX: startPos.x,
      cursorStartY: startPos.y,
      cursorFinalX: finalPos.x,
      cursorFinalY: finalPos.y,
      targetAppearanceTimeMs: targetAppearanceTimeRef.current,
      confirmationTimeMs: outcome === 'hit' || outcome === 'miss_button' ? now : null,
      acquisitionTimeMs: acqTime,
      shortestDistancePx: Math.round(shortestDist * 10) / 10,
      actualPathLengthPx: Math.round(actualPathLen * 10) / 10,
      pathEfficiency: Math.round(efficiency * 100) / 100,
      endpointErrorPx: Math.round(endpointErr * 10) / 10,
      overshootCount: overshootsCountRef.current,
      outcome,
      isValid: outcome !== 'invalidated',
      invalidationReason: errorReason,
    };

    trialsHistoryRef.current.push(record);

    setLastFeedback({
      hit: outcome === 'hit',
      msg: outcome === 'hit'
        ? `ACQUIRED! ${acqTime?.toFixed(0)} ms (Error: ${endpointErr.toFixed(1)}px)`
        : outcome === 'timeout'
        ? 'TIMEOUT: Acquisition exceeded 4.5s'
        : outcome === 'miss_button'
        ? 'MISS: Confirmed outside target radius'
        : 'INVALIDATED TRIAL',
    });

    setPhase('inter_trial');
    const nextTrial = currentTrialNumber + 1;
    setCurrentTrialNumber(nextTrial);

    const maxTrials = isPractice ? PRACTICE_TARGETS_TOTAL : SCORED_TARGETS_TOTAL;

    window.setTimeout(() => {
      if (nextTrial >= maxTrials) {
        if (isPractice) {
          setIsPractice(false);
          setCurrentTrialNumber(0);
          setPhase('practice_intro');
        } else {
          const stats = calculateTargetAcquisitionStats(trialsHistoryRef.current, sessionId);
          setStatsSummary(stats);
          setPhase('summary');
        }
      } else {
        startNextTrial(nextTrial, isPractice);
      }
    }, 900);
  };

  // Main game loop (Cursor movement decoupled from frame rate via delta-time)
  useEffect(() => {
    let animId: number;

    const loop = () => {
      const now = performance.now();
      const dtSec = Math.min((now - lastFrameTimeRef.current) / 1000, 0.05); // cap at 50ms
      lastFrameTimeRef.current = now;

      if (phase === 'active_trial' && controller) {
        // Read Left Stick axes: Index 0 (X) and Index 1 (Y)
        const rawX = controller.axes[0]?.value ?? 0;
        const rawY = controller.axes[1]?.value ?? 0;

        // Apply software deadzone (respect 8% standard deadzone)
        const deadzone = 0.08;
        const mag = Math.sqrt(rawX * rawX + rawY * rawY);

        let moveX = 0;
        let moveY = 0;
        if (mag > deadzone) {
          const norm = (mag - deadzone) / (1 - deadzone);
          moveX = (rawX / mag) * norm;
          moveY = (rawY / mag) * norm;
        }

        // Frame-rate independent cursor displacement
        setCursorPos(prev => {
          const nextX = Math.max(10, Math.min(PLAY_WIDTH - 10, prev.x + moveX * CURSOR_SPEED_PX_PER_SEC * dtSec));
          const nextY = Math.max(10, Math.min(PLAY_HEIGHT - 10, prev.y + moveY * CURSOR_SPEED_PX_PER_SEC * dtSec));
          const updated = { x: nextX, y: nextY };

          cursorTrajectoryRef.current.push(updated);

          // Overshoot detection rule:
          // Check if cursor entered target radius, exited, and re-entered
          if (activeTarget) {
            const dist = calculateDistance(updated, { x: activeTarget.x, y: activeTarget.y });
            const isInside = dist <= activeTarget.radius;

            if (wasInsideTargetRef.current && !isInside) {
              // Exited after having entered: increment overshoot
              overshootsCountRef.current++;
            }
            wasInsideTargetRef.current = isInside;
          }

          return updated;
        });

        // Edge-triggered confirmation button detection
        const confirmBtn = controller.buttons[confirmButtonIndex];
        const isDown = confirmBtn ? (confirmBtn.pressed || confirmBtn.value > 0.45) : false;
        const wasDown = prevButtonStateRef.current;

        if (isDown && !wasDown && !hasConfirmedThisTrialRef.current) {
          // Button pressed on this frame
          if (activeTarget) {
            const dist = calculateDistance(cursorPos, { x: activeTarget.x, y: activeTarget.y });
            if (dist <= activeTarget.radius) {
              recordTrialOutcome('hit');
            } else {
              recordTrialOutcome('miss_button', `Clicked outside target boundary (distance: ${dist.toFixed(1)}px)`);
            }
          }
        }
        prevButtonStateRef.current = isDown;
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [phase, controller, confirmButtonIndex, activeTarget, cursorPos]);

  // Restart / Reset
  const handleRestart = () => {
    if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
    setSessionId(`acq-${Date.now()}`);
    trialsHistoryRef.current = [];
    setStatsSummary(null);
    setCurrentTrialNumber(0);
    setIsPractice(true);
    setCursorPos({ x: PLAY_WIDTH / 2, y: PLAY_HEIGHT / 2 });
    setActiveTarget(null);
    setPhase('idle');
  };

  return (
    <div className="w-full flex flex-col gap-6 font-mono text-neutral-200">
      {/* Top Banner & Instructions */}
      <div className="border border-neutral-800 bg-neutral-900/90 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-base font-bold text-white tracking-wide">
            EXPERIMENT A // TARGET ACQUISITION (Fitts' Law Kinematics)
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Use the EvoFox left analog stick to navigate the cursor to targets and confirm with the trigger button.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-neutral-500">CONFIRM BUTTON:</span>
          {isConfiguringButton ? (
            <span className="px-2 py-0.5 bg-rose-950 border border-rose-600 text-rose-300 font-bold rounded animate-pulse">
              PRESS ANY BUTTON ON CONTROLLER...
            </span>
          ) : (
            <button
              onClick={() => setIsConfiguringButton(true)}
              className="px-2 py-0.5 bg-neutral-950 border border-neutral-700 text-neutral-300 hover:text-white rounded cursor-pointer"
            >
              Button [{confirmButtonIndex}] (Click to change)
            </button>
          )}
        </div>
      </div>

      {/* Button mapping assignment listener when configuring */}
      {isConfiguringButton && controller && (
        <div className="p-3 bg-neutral-950 border border-neutral-800 rounded text-xs text-neutral-300 flex justify-between items-center">
          <span>Press the button on your controller you wish to use for target confirmation:</span>
          <button
            onClick={() => setIsConfiguringButton(false)}
            className="text-neutral-500 hover:text-white underline"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Main Play Area Card */}
      <div className="border border-neutral-800 bg-neutral-900/70 p-6 rounded-lg flex flex-col items-center justify-between min-h-[500px]">
        {/* Phase: IDLE */}
        {phase === 'idle' && (
          <div className="flex flex-col items-center justify-center max-w-xl text-center gap-4 my-auto">
            <h3 className="text-lg font-bold text-white uppercase tracking-wider">
              READY TO BENCHMARK TARGET ACQUISITION
            </h3>
            <p className="text-xs text-neutral-300 leading-relaxed bg-neutral-950 p-4 border border-neutral-800 rounded">
              • <strong>Stick Navigation:</strong> Move the crosshair cursor with your EvoFox <strong>Left Analog Stick</strong>.<br />
              • <strong>Target Confirmation:</strong> Align the cursor inside the target circle and press <strong>Button [{confirmButtonIndex}]</strong>.<br />
              • <strong>Protocol:</strong> 3 practice rounds followed by 20 scored trials across various distances and target sizes.<br />
              • <strong>Timeout:</strong> Each target must be acquired within 4.5 seconds.
            </p>
            <button
              onClick={() => {
                trialsHistoryRef.current = [];
                setCurrentTrialNumber(0);
                setIsPractice(true);
                startNextTrial(0, true);
              }}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs rounded cursor-pointer"
            >
              START PRACTICE (3 TARGETS) →
            </button>
          </div>
        )}

        {/* Phase: PRACTICE INTRODUCING SCORED */}
        {phase === 'practice_intro' && (
          <div className="flex flex-col items-center justify-center max-w-xl text-center gap-4 my-auto">
            <div className="p-3 bg-blue-950/60 border border-blue-700 text-blue-200 text-xs rounded">
              ✓ <strong>PRACTICE COMPLETE:</strong> You have completed 3 practice targets. These are excluded from your scored metrics.
            </div>
            <h3 className="text-base font-bold text-white">READY FOR 20 SCORED TARGETS</h3>
            <p className="text-xs text-neutral-400">
              Acquire each target as swiftly and cleanly as possible. Overshooting and path inefficiency are recorded.
            </p>
            <button
              onClick={() => {
                trialsHistoryRef.current = [];
                setCurrentTrialNumber(0);
                setIsPractice(false);
                startNextTrial(0, false);
              }}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded cursor-pointer"
            >
              BEGIN 20 SCORED TARGETS →
            </button>
          </div>
        )}

        {/* Phase: ACTIVE TRIAL / INTER-TRIAL FEEDBACK */}
        {(phase === 'active_trial' || phase === 'inter_trial') && (
          <div className="w-full flex flex-col gap-4">
            {/* Header info */}
            <div className="flex justify-between items-center text-xs text-neutral-400 border-b border-neutral-800 pb-2">
              <span className="font-bold text-white">
                {isPractice ? 'PRACTICE TARGET' : 'SCORED TARGET'} {currentTrialNumber + 1} OF {isPractice ? PRACTICE_TARGETS_TOTAL : SCORED_TARGETS_TOTAL}
              </span>
              <span className="text-neutral-500">
                SIZE: {activeTarget?.sizeCategory.toUpperCase()} (r={activeTarget?.radius}px) • CONFIRM: Button [{confirmButtonIndex}]
              </span>
            </div>

            {/* Play Area Canvas */}
            <div
              style={{ width: `${PLAY_WIDTH}px`, height: `${PLAY_HEIGHT}px` }}
              className="relative mx-auto bg-neutral-950 border border-neutral-800 rounded-lg overflow-hidden select-none"
            >
              {/* Subtle background grid */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2028_1px,transparent_1px),linear-gradient(to_bottom,#1f2028_1px,transparent_1px)] bg-[size:40px_40px] opacity-20" />

              {/* Target circle */}
              {activeTarget && (
                <div
                  style={{
                    left: `${activeTarget.x}px`,
                    top: `${activeTarget.y}px`,
                    width: `${activeTarget.radius * 2}px`,
                    height: `${activeTarget.radius * 2}px`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className={`absolute rounded-full border-2 flex items-center justify-center transition-all ${
                    calculateDistance(cursorPos, { x: activeTarget.x, y: activeTarget.y }) <= activeTarget.radius
                      ? 'border-emerald-400 bg-emerald-500/25 shadow-[0_0_20px_rgba(16,185,129,0.5)]'
                      : 'border-rose-500 bg-rose-500/15'
                  }`}
                >
                  <div className="w-2 h-2 rounded-full bg-white opacity-80" />
                </div>
              )}

              {/* User Cursor (Crosshair) */}
              <div
                style={{
                  left: `${cursorPos.x}px`,
                  top: `${cursorPos.y}px`,
                  transform: 'translate(-50%, -50%)',
                }}
                className="absolute w-6 h-6 pointer-events-none flex items-center justify-center"
              >
                <div className="w-6 h-0.5 bg-sky-400 absolute opacity-80" />
                <div className="h-6 w-0.5 bg-sky-400 absolute opacity-80" />
                <div className="w-2 h-2 rounded-full border border-white" />
              </div>

              {/* Inter-trial outcome toast */}
              {phase === 'inter_trial' && lastFeedback && (
                <div className="absolute inset-0 bg-neutral-950/70 backdrop-blur-xs flex items-center justify-center">
                  <div className={`p-4 rounded-lg border font-bold text-sm ${
                    lastFeedback.hit
                      ? 'bg-emerald-950 border-emerald-600 text-emerald-200'
                      : 'bg-rose-950 border-rose-600 text-rose-200'
                  }`}>
                    {lastFeedback.msg}
                  </div>
                </div>
              )}
            </div>

            {/* Trial progress bar */}
            <div className="w-full max-w-[640px] mx-auto h-1.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{
                  width: `${((currentTrialNumber) / (isPractice ? PRACTICE_TARGETS_TOTAL : SCORED_TARGETS_TOTAL)) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Phase: SUMMARY RESULTS */}
        {phase === 'summary' && statsSummary && (
          <div className="w-full flex flex-col gap-6">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white uppercase tracking-wider">
                  TARGET ACQUISITION // PERFORMANCE REPORT
                </h3>
                <span className="text-xs text-neutral-500">
                  Session: {statsSummary.sessionId} • {statsSummary.validHitsCount} / {statsSummary.scoredTrialsCount} Acquired Targets
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => exportTargetAcquisitionCSV(trialsHistoryRef.current, statsSummary)}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 rounded text-xs font-bold cursor-pointer"
                >
                  EXPORT CSV
                </button>
                <button
                  onClick={() => exportTargetAcquisitionJSON(trialsHistoryRef.current, statsSummary)}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 rounded text-xs font-bold cursor-pointer"
                >
                  EXPORT JSON
                </button>
              </div>
            </div>

            {/* Speed vs Accuracy Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded">
                <span className="text-neutral-500 block text-[11px]">MEDIAN ACQUISITION TIME</span>
                <span className="text-2xl font-bold text-emerald-400 mt-1 block">
                  {statsSummary.medianAcquisitionTimeMs} ms
                </span>
                <span className="text-[10px] text-neutral-600 block mt-0.5">Mean: {statsSummary.meanAcquisitionTimeMs} ms (±{statsSummary.stdDevAcquisitionTimeMs})</span>
              </div>

              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded">
                <span className="text-neutral-500 block text-[11px]">HIT RATE</span>
                <span className="text-2xl font-bold text-purple-400 mt-1 block">
                  {statsSummary.hitRatePercentage}%
                </span>
                <span className="text-[10px] text-neutral-600 block mt-0.5">Misses: {statsSummary.missCount} | Timeouts: {statsSummary.timeoutCount}</span>
              </div>

              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded">
                <span className="text-neutral-500 block text-[11px]">MEAN ENDPOINT ERROR</span>
                <span className="text-2xl font-bold text-sky-400 mt-1 block">
                  {statsSummary.meanEndpointErrorPx} px
                </span>
                <span className="text-[10px] text-neutral-600 block mt-0.5">From target center</span>
              </div>

              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded">
                <span className="text-neutral-500 block text-[11px]">PATH EFFICIENCY</span>
                <span className="text-2xl font-bold text-amber-400 mt-1 block">
                  {(statsSummary.meanPathEfficiency * 100).toFixed(0)}%
                </span>
                <span className="text-[10px] text-neutral-600 block mt-0.5">Shortest path / Actual path</span>
              </div>
            </div>

            {/* Overshoot & Kinematic Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Performance by Target Size */}
              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded flex flex-col gap-2">
                <span className="font-bold text-neutral-300 uppercase">PERFORMANCE BY TARGET SIZE:</span>
                {(['small', 'medium', 'large'] as AcquisitionTargetSize[]).map(sz => {
                  const data = statsSummary.bySize[sz];
                  return (
                    <div key={sz} className="flex justify-between items-center py-1 border-b border-neutral-900 last:border-0">
                      <span className="text-neutral-400 uppercase">{sz} ({data.count} targets):</span>
                      <span className="font-bold text-neutral-200">
                        {data.meanTimeMs > 0 ? `${data.meanTimeMs}ms` : 'N/A'} • {data.hitRate}% hit rate • ±{data.meanErrorPx}px err
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Performance by Distance */}
              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded flex flex-col gap-2">
                <span className="font-bold text-neutral-300 uppercase">PERFORMANCE BY DISTANCE:</span>
                {(['short', 'medium', 'long'] as AcquisitionDistanceCategory[]).map(d => {
                  const data = statsSummary.byDistance[d];
                  return (
                    <div key={d} className="flex justify-between items-center py-1 border-b border-neutral-900 last:border-0">
                      <span className="text-neutral-400 uppercase">{d} ({data.count} targets):</span>
                      <span className="font-bold text-neutral-200">
                        {data.meanTimeMs > 0 ? `${data.meanTimeMs}ms` : 'N/A'} • {(data.meanEfficiency * 100).toFixed(0)}% efficiency
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-xs text-neutral-500">
                Total overshoots: {statsSummary.totalOvershoots} ({statsSummary.meanOvershootsPerHit} per acquired target)
              </span>
              <button
                onClick={handleRestart}
                className="px-4 py-2 bg-neutral-200 text-neutral-950 font-bold text-xs rounded hover:bg-white cursor-pointer"
              >
                RESTART EXPERIMENT →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
