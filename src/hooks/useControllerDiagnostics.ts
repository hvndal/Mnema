import { useEffect, useRef, useState, useCallback } from 'react';
import type { RawGamepadState, InputTransitionEvent } from '../types/telemetry';

export interface UseControllerDiagnosticsOptions {
  maxEventHistory?: number;
  axisDeadbandThreshold?: number; // threshold to trigger an axis movement event
  onStateChange?: (previous: RawGamepadState | null, current: RawGamepadState, timestamp: number) => void;
}

export function useControllerDiagnostics(options: UseControllerDiagnosticsOptions = {}) {
  const { maxEventHistory = 40, axisDeadbandThreshold = 0.05 } = options;

  const [controller, setController] = useState<RawGamepadState | null>(null);
  const [allConnectedGamepads, setAllConnectedGamepads] = useState<{ index: number; id: string }[]>([]);
  const [activeSlot, setActiveSlot] = useState<number>(0);
  const [recentEvents, setRecentEvents] = useState<InputTransitionEvent[]>([]);
  
  // Telemetry metrics
  const [browserRenderHz, setBrowserRenderHz] = useState<number>(0);
  const [stateChangeIntervalStats, setStateChangeIntervalStats] = useState<{
    observedChanges: number;
    meanIntervalMs: number;
    stdDevMs: number;
    lastChangeIntervalMs: number;
  }>({
    observedChanges: 0,
    meanIntervalMs: 0,
    stdDevMs: 0,
    lastChangeIntervalMs: 0,
  });

  const [visibilityInterrupted, setVisibilityInterrupted] = useState<boolean>(false);
  const [interruptionCount, setInterruptionCount] = useState<number>(0);

  // References for polling loop
  const prevStateRef = useRef<RawGamepadState | null>(null);
  const lastStateChangeTimeRef = useRef<number>(performance.now());
  const stateChangeIntervalsRef = useRef<number[]>([]);
  const frameCountRef = useRef<number>(0);
  const lastFpsCalcRef = useRef<number>(performance.now());
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Track page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setVisibilityInterrupted(true);
        setInterruptionCount(prev => prev + 1);
      } else {
        setVisibilityInterrupted(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const addEvent = useCallback((event: InputTransitionEvent) => {
    setRecentEvents(prev => [event, ...prev].slice(0, maxEventHistory));
  }, [maxEventHistory]);

  const clearEventHistory = useCallback(() => {
    setRecentEvents([]);
  }, []);

  const resetTelemetryStats = useCallback(() => {
    stateChangeIntervalsRef.current = [];
    lastStateChangeTimeRef.current = performance.now();
    setStateChangeIntervalStats({
      observedChanges: 0,
      meanIntervalMs: 0,
      stdDevMs: 0,
      lastChangeIntervalMs: 0,
    });
  }, []);

  // Main polling loop using requestAnimationFrame
  useEffect(() => {
    let animId: number;

    const poll = () => {
      const now = performance.now();

      // Measure browser render sampling rate
      frameCountRef.current++;
      if (now - lastFpsCalcRef.current >= 1000) {
        const delta = now - lastFpsCalcRef.current;
        setBrowserRenderHz(Math.round((frameCountRef.current * 1000) / delta));
        frameCountRef.current = 0;
        lastFpsCalcRef.current = now;
      }

      // Query raw Gamepad API
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      
      // Update list of all connected gamepads
      const connectedList: { index: number; id: string }[] = [];
      for (let i = 0; i < gamepads.length; i++) {
        const gp = gamepads[i];
        if (gp && gp.connected) {
          connectedList.push({ index: gp.index, id: gp.id });
        }
      }
      setAllConnectedGamepads(connectedList);

      const targetPad = gamepads[activeSlot] || (connectedList.length > 0 ? gamepads[connectedList[0].index] : null);

      if (targetPad && targetPad.connected) {
        const currentState: RawGamepadState = {
          index: targetPad.index,
          id: targetPad.id,
          mapping: targetPad.mapping,
          connected: targetPad.connected,
          timestamp: targetPad.timestamp,
          buttons: targetPad.buttons.map((b, idx) => ({
            index: idx,
            pressed: b.pressed,
            value: b.value,
            touched: b.touched,
          })),
          axes: targetPad.axes.map((val, idx) => ({
            index: idx,
            value: val,
          })),
        };

        const prev = prevStateRef.current;
        let hasChanged = false;

        if (prev && prev.index === currentState.index) {
          // 1. Detect button transitions
          currentState.buttons.forEach((btn, idx) => {
            const prevBtn = prev.buttons[idx];
            if (!prevBtn) return;

            // Transition from released to pressed
            if (btn.pressed && !prevBtn.pressed) {
              hasChanged = true;
              addEvent({
                id: `${now}-${Math.random()}`,
                timestamp: now,
                hardwareTimestamp: currentState.timestamp,
                type: 'button_down',
                targetIndex: idx,
                value: btn.value,
                previousValue: prevBtn.value,
                description: `Button [${idx}] PRESSED (value: ${btn.value.toFixed(2)})`,
              });
            } 
            // Transition from pressed to released
            else if (!btn.pressed && prevBtn.pressed) {
              hasChanged = true;
              addEvent({
                id: `${now}-${Math.random()}`,
                timestamp: now,
                hardwareTimestamp: currentState.timestamp,
                type: 'button_up',
                targetIndex: idx,
                value: btn.value,
                previousValue: prevBtn.value,
                description: `Button [${idx}] RELEASED`,
              });
            }
            // Analog button variation while pressed
            else if (btn.pressed && Math.abs(btn.value - prevBtn.value) > 0.05) {
              hasChanged = true;
            }
          });

          // 2. Detect axis movement beyond deadband threshold
          currentState.axes.forEach((axis, idx) => {
            const prevAxis = prev.axes[idx];
            if (!prevAxis) return;

            if (Math.abs(axis.value - prevAxis.value) > axisDeadbandThreshold) {
              hasChanged = true;
              // Log significant axis motions
              if (Math.abs(axis.value - prevAxis.value) > 0.15) {
                addEvent({
                  id: `${now}-${Math.random()}`,
                  timestamp: now,
                  hardwareTimestamp: currentState.timestamp,
                  type: 'axis_moved',
                  targetIndex: idx,
                  value: axis.value,
                  previousValue: prevAxis.value,
                  description: `Axis [${idx}] MOVED: ${prevAxis.value.toFixed(2)} → ${axis.value.toFixed(2)}`,
                });
              }
            }
          });
        } else {
          // Initial connection frame
          hasChanged = true;
        }

        // Process telemetry intervals if state actually changed
        if (hasChanged && prev) {
          const deltaChange = now - lastStateChangeTimeRef.current;
          lastStateChangeTimeRef.current = now;

          // Track intervals between actual state updates
          if (deltaChange > 0 && deltaChange < 5000) {
            stateChangeIntervalsRef.current.push(deltaChange);
            if (stateChangeIntervalsRef.current.length > 100) {
              stateChangeIntervalsRef.current.shift();
            }

            const intervals = stateChangeIntervalsRef.current;
            const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            const variance = intervals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (intervals.length > 1 ? intervals.length - 1 : 1);
            const stdDev = Math.sqrt(variance);

            setStateChangeIntervalStats({
              observedChanges: intervals.length,
              meanIntervalMs: Math.round(mean * 100) / 100,
              stdDevMs: Math.round(stdDev * 100) / 100,
              lastChangeIntervalMs: Math.round(deltaChange * 100) / 100,
            });
          }

          if (optionsRef.current.onStateChange) {
            optionsRef.current.onStateChange(prev, currentState, now);
          }
        }

        prevStateRef.current = currentState;
        setController(currentState);
      } else {
        if (prevStateRef.current !== null) {
          prevStateRef.current = null;
          setController(null);
        }
      }

      animId = requestAnimationFrame(poll);
    };

    animId = requestAnimationFrame(poll);

    return () => cancelAnimationFrame(animId);
  }, [activeSlot, axisDeadbandThreshold, addEvent]);

  // Event listeners for connection/disconnection
  useEffect(() => {
    const handleConnected = (e: GamepadEvent) => {
      console.log(`Gamepad connected at slot ${e.gamepad.index}: ${e.gamepad.id}`);
      setActiveSlot(e.gamepad.index);
    };

    const handleDisconnected = (e: GamepadEvent) => {
      console.log(`Gamepad disconnected at slot ${e.gamepad.index}: ${e.gamepad.id}`);
      if (activeSlot === e.gamepad.index) {
        setController(null);
        prevStateRef.current = null;
      }
    };

    window.addEventListener('gamepadconnected', handleConnected);
    window.addEventListener('gamepaddisconnected', handleDisconnected);

    return () => {
      window.removeEventListener('gamepadconnected', handleConnected);
      window.removeEventListener('gamepaddisconnected', handleDisconnected);
    };
  }, [activeSlot]);

  return {
    controller,
    allConnectedGamepads,
    activeSlot,
    setActiveSlot,
    recentEvents,
    clearEventHistory,
    browserRenderHz,
    stateChangeIntervalStats,
    resetTelemetryStats,
    visibilityInterrupted,
    interruptionCount,
  };
}
