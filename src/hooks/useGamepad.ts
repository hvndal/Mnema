import { useEffect, useRef, useState, useCallback } from 'react';
import type { GamepadSnapshot } from '../types';

export interface GamepadButtonEvent {
  buttonIndex: number;
  buttonName: string;
  value: number;
  timestamp: number;
}

interface UseGamepadOptions {
  onButtonDown?: (event: GamepadButtonEvent) => void;
  onButtonUp?: (event: GamepadButtonEvent) => void;
}

export function useGamepad(options: UseGamepadOptions = {}) {
  const [snapshot, setSnapshot] = useState<GamepadSnapshot | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [controllerIndex, setControllerIndex] = useState<number>(0);
  const [pollingRateHz, setPollingRateHz] = useState<number>(0);

  const prevButtonsRef = useRef<boolean[]>([]);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Track polling rate
  const frameCountRef = useRef(0);
  const lastFpsCalcRef = useRef(performance.now());

  const pollLoopRef = useRef<number | null>(null);

  // Poll loop using requestAnimationFrame + high-resolution performance.now()
  const poll = useCallback(() => {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const activePad = gamepads[controllerIndex] || (gamepads.find(gp => gp !== null) ?? null);

    const now = performance.now();
    frameCountRef.current++;
    if (now - lastFpsCalcRef.current >= 1000) {
      setPollingRateHz(Math.round((frameCountRef.current * 1000) / (now - lastFpsCalcRef.current)));
      frameCountRef.current = 0;
      lastFpsCalcRef.current = now;
    }

    if (activePad) {
      if (!isConnected) {
        setIsConnected(true);
        setControllerIndex(activePad.index);
      }

      const buttonsState = activePad.buttons.map(b => ({
        pressed: b.pressed,
        value: b.value,
        touched: b.touched,
      }));

      // Edge detection (Rising & Falling edges)
      const prevButtons = prevButtonsRef.current;
      buttonsState.forEach((btn, idx) => {
        const wasPressed = !!prevButtons[idx];
        const isPressed = btn.pressed || btn.value > 0.45; // trigger analog deflection threshold

        if (isPressed && !wasPressed) {
          // Rising edge (Button Down)
          if (optionsRef.current.onButtonDown) {
            optionsRef.current.onButtonDown({
              buttonIndex: idx,
              buttonName: idx.toString(),
              value: btn.value,
              timestamp: performance.now(),
            });
          }
        } else if (!isPressed && wasPressed) {
          // Falling edge (Button Up)
          if (optionsRef.current.onButtonUp) {
            optionsRef.current.onButtonUp({
              buttonIndex: idx,
              buttonName: idx.toString(),
              value: btn.value,
              timestamp: performance.now(),
            });
          }
        }
      });

      prevButtonsRef.current = buttonsState.map(b => b.pressed || b.value > 0.45);

      setSnapshot({
        connected: activePad.connected,
        id: activePad.id,
        mapping: activePad.mapping,
        timestamp: activePad.timestamp,
        buttons: buttonsState,
        axes: [...activePad.axes],
        vibrationSupported: !!(activePad as any).vibrationActuator,
      });
    } else {
      if (isConnected) {
        setIsConnected(false);
        setSnapshot(null);
      }
    }

    pollLoopRef.current = requestAnimationFrame(poll);
  }, [controllerIndex, isConnected]);

  useEffect(() => {
    const handleConnected = (e: GamepadEvent) => {
      console.log('Gamepad connected:', e.gamepad.id);
      setIsConnected(true);
      setControllerIndex(e.gamepad.index);
    };

    const handleDisconnected = (e: GamepadEvent) => {
      console.log('Gamepad disconnected:', e.gamepad.id);
      if (e.gamepad.index === controllerIndex) {
        setIsConnected(false);
        setSnapshot(null);
      }
    };

    window.addEventListener('gamepadconnected', handleConnected);
    window.addEventListener('gamepaddisconnected', handleDisconnected);

    pollLoopRef.current = requestAnimationFrame(poll);

    return () => {
      window.removeEventListener('gamepadconnected', handleConnected);
      window.removeEventListener('gamepaddisconnected', handleDisconnected);
      if (pollLoopRef.current) {
        cancelAnimationFrame(pollLoopRef.current);
      }
    };
  }, [poll, controllerIndex]);

  return {
    snapshot,
    isConnected,
    controllerIndex,
    pollingRateHz,
  };
}
