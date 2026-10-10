/**
 * Hook to manage DeviceMotionEvent and DeviceOrientationEvent
 * Supports iOS 13+ permission requests, Android/W3C sensors,
 * and Desktop Simulator fallback.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type {
  MotionSample,
  OrientationSample,
  PhoneSensorPermissionState,
} from '../types/phoneSensors';

interface UsePhoneSensorsReturn {
  permission: PhoneSensorPermissionState;
  requestPermission: () => Promise<boolean>;
  isHardwareAvailable: boolean;
  isSimulated: boolean;
  setIsSimulated: (val: boolean) => void;
  latestMotion: MotionSample | null;
  latestOrientation: OrientationSample | null;
  sensorHz: number;
  // Recording controls
  isRecording: boolean;
  startRecording: (type: 'motion' | 'orientation') => void;
  stopRecording: () => { motion: MotionSample[]; orientation: OrientationSample[] };
  // Simulator manual controls for desktop testing
  simulatedPitch: number;
  setSimulatedPitch: (deg: number) => void;
  simulatedTremorAmp: number;
  setSimulatedTremorAmp: (amp: number) => void;
}

export function usePhoneSensors(): UsePhoneSensorsReturn {
  const [permission, setPermission] = useState<PhoneSensorPermissionState>('prompt');
  const [isHardwareAvailable, setIsHardwareAvailable] = useState<boolean>(false);
  const [isSimulated, setIsSimulated] = useState<boolean>(false);
  const [latestMotion, setLatestMotion] = useState<MotionSample | null>(null);
  const [latestOrientation, setLatestOrientation] = useState<OrientationSample | null>(null);
  const [sensorHz, setSensorHz] = useState<number>(0);
  const [isRecording, setIsRecording] = useState<boolean>(false);

  // Manual desktop simulator states
  const [simulatedPitch, setSimulatedPitch] = useState<number>(0);
  const [simulatedTremorAmp, setSimulatedTremorAmp] = useState<number>(0.25);

  const motionBufferRef = useRef<MotionSample[]>([]);
  const orientationBufferRef = useRef<OrientationSample[]>([]);
  const recordTypeRef = useRef<'motion' | 'orientation' | null>(null);
  const isRecordingRef = useRef<boolean>(false);

  const eventCountRef = useRef<number>(0);
  const lastHzCalcTimeRef = useRef<number>(performance.now());

  // Check hardware availability on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hasMotion = 'DeviceMotionEvent' in window;
    const hasOrientation = 'DeviceOrientationEvent' in window;

    if (!hasMotion && !hasOrientation) {
      setPermission('unsupported');
      setIsHardwareAvailable(false);
      setIsSimulated(true); // Automatically enable simulation on desktop
      return;
    }

    // Check if permission API is needed (iOS Safari)
    const requiresExplicitPermission =
      typeof (window.DeviceMotionEvent as any)?.requestPermission === 'function';

    if (!requiresExplicitPermission) {
      // Standard Android / Desktop browser with sensors
      setPermission('granted');
    } else {
      setPermission('prompt');
    }

    // Test if real events fire (desktop laptops often expose DeviceMotionEvent with all nulls)
    let fired = false;
    const testHandler = (e: DeviceMotionEvent) => {
      if (e.acceleration || e.accelerationIncludingGravity) {
        fired = true;
        setIsHardwareAvailable(true);
      }
      window.removeEventListener('devicemotion', testHandler);
    };
    window.addEventListener('devicemotion', testHandler);

    const timer = setTimeout(() => {
      window.removeEventListener('devicemotion', testHandler);
      if (!fired) {
        setIsHardwareAvailable(false);
        // Default to simulation mode if on desktop
        setIsSimulated(true);
      }
    }, 1200);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('devicemotion', testHandler);
    };
  }, []);

  // Request permission (iOS 13+)
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false;

    try {
      const motionReq = (window.DeviceMotionEvent as any)?.requestPermission;
      const orientReq = (window.DeviceOrientationEvent as any)?.requestPermission;

      if (typeof motionReq === 'function') {
        const state = await motionReq();
        if (state === 'granted') {
          if (typeof orientReq === 'function') {
            await orientReq();
          }
          setPermission('granted');
          setIsHardwareAvailable(true);
          setIsSimulated(false);
          return true;
        } else {
          setPermission('denied');
          return false;
        }
      } else {
        setPermission('granted');
        return true;
      }
    } catch (err) {
      console.warn('Error requesting device motion permission:', err);
      setPermission('denied');
      return false;
    }
  }, []);

  // Real Hardware Listeners
  useEffect(() => {
    if (permission !== 'granted' || isSimulated) return;

    const handleMotion = (event: DeviceMotionEvent) => {
      const now = performance.now();
      eventCountRef.current++;

      // Frequency calculation
      if (now - lastHzCalcTimeRef.current >= 1000) {
        setSensorHz(eventCountRef.current);
        eventCountRef.current = 0;
        lastHzCalcTimeRef.current = now;
      }

      // Linear acceleration or fallback
      const ax = event.acceleration?.x ?? (event.accelerationIncludingGravity?.x ? event.accelerationIncludingGravity.x * 0.1 : 0);
      const ay = event.acceleration?.y ?? (event.accelerationIncludingGravity?.y ? event.accelerationIncludingGravity.y * 0.1 : 0);
      const az = event.acceleration?.z ?? (event.accelerationIncludingGravity?.z ? (event.accelerationIncludingGravity.z - 9.81) * 0.1 : 0);
      const mag = Math.sqrt(ax * ax + ay * ay + az * az);

      const sample: MotionSample = {
        timestamp: now,
        accelX: ax,
        accelY: ay,
        accelZ: az,
        magnitude: mag,
        rotAlpha: event.rotationRate?.alpha ?? undefined,
        rotBeta: event.rotationRate?.beta ?? undefined,
        rotGamma: event.rotationRate?.gamma ?? undefined,
        accelerationIncludingGravity: {
          x: event.accelerationIncludingGravity?.x ?? ax,
          y: event.accelerationIncludingGravity?.y ?? ay,
          z: event.accelerationIncludingGravity?.z ?? (az + 9.81),
        },
        rotationRate: {
          alpha: event.rotationRate?.alpha ?? 0,
          beta: event.rotationRate?.beta ?? 0,
          gamma: event.rotationRate?.gamma ?? 0,
        },
      };

      setLatestMotion(sample);

      if (isRecordingRef.current && recordTypeRef.current === 'motion') {
        motionBufferRef.current.push(sample);
      }
    };

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const now = performance.now();
      const sample: OrientationSample = {
        timestamp: now,
        alpha: event.alpha ?? 0,
        beta: event.beta ?? 0,
        gamma: event.gamma ?? 0,
      };

      setLatestOrientation(sample);

      if (isRecordingRef.current && recordTypeRef.current === 'orientation') {
        orientationBufferRef.current.push(sample);
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    window.addEventListener('deviceorientation', handleOrientation);

    return () => {
      window.removeEventListener('devicemotion', handleMotion);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [permission, isSimulated]);

  // Desktop Simulator Tick Loop (50 Hz synthetic generator)
  useEffect(() => {
    if (!isSimulated) return;

    setSensorHz(50);
    const interval = setInterval(() => {
      const now = performance.now();
      const timeSec = now / 1000;

      // Realistic 9.3 Hz physiological tremor + minor 1.2 Hz postural sway
      const tremorFreq = 9.3;
      const tremorSignal =
        simulatedTremorAmp * Math.sin(2 * Math.PI * tremorFreq * timeSec) +
        0.05 * Math.sin(2 * Math.PI * 1.5 * timeSec) +
        (Math.random() - 0.5) * 0.04;

      const motionSample: MotionSample = {
        timestamp: now,
        accelX: tremorSignal,
        accelY: tremorSignal * 0.7,
        accelZ: 9.81 + tremorSignal * 0.4,
        magnitude: Math.abs(tremorSignal),
        accelerationIncludingGravity: {
          x: tremorSignal,
          y: tremorSignal * 0.7,
          z: 9.81 + tremorSignal * 0.4,
        },
        rotationRate: {
          alpha: tremorSignal * 8.5,
          beta: tremorSignal * 6.2,
          gamma: tremorSignal * 4.8,
        },
      };

      setLatestMotion(motionSample);

      if (isRecordingRef.current && recordTypeRef.current === 'motion') {
        motionBufferRef.current.push(motionSample);
      }

      // Simulated orientation (adds slight micro-drift to user's set pitch)
      const swayBeta = Math.sin(timeSec * 0.8) * 0.8 + (Math.random() - 0.5) * 0.15;
      const swayGamma = Math.cos(timeSec * 0.6) * 0.6 + (Math.random() - 0.5) * 0.15;

      const orientSample: OrientationSample = {
        timestamp: now,
        alpha: 0,
        beta: simulatedPitch + swayBeta,
        gamma: swayGamma,
      };

      setLatestOrientation(orientSample);

      if (isRecordingRef.current && recordTypeRef.current === 'orientation') {
        orientationBufferRef.current.push(orientSample);
      }
    }, 20);

    return () => clearInterval(interval);
  }, [isSimulated, simulatedPitch, simulatedTremorAmp]);

  const startRecording = useCallback((type: 'motion' | 'orientation') => {
    recordTypeRef.current = type;
    if (type === 'motion') {
      motionBufferRef.current = [];
    } else {
      orientationBufferRef.current = [];
    }
    isRecordingRef.current = true;
    setIsRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    isRecordingRef.current = false;
    setIsRecording(false);
    const result = {
      motion: [...motionBufferRef.current],
      orientation: [...orientationBufferRef.current],
    };
    recordTypeRef.current = null;
    return result;
  }, []);

  return {
    permission,
    requestPermission,
    isHardwareAvailable,
    isSimulated,
    setIsSimulated,
    latestMotion,
    latestOrientation,
    sensorHz,
    isRecording,
    startRecording,
    stopRecording,
    simulatedPitch,
    setSimulatedPitch,
    simulatedTremorAmp,
    setSimulatedTremorAmp,
  };
}
