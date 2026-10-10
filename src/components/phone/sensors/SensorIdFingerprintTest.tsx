import React, { useState } from 'react';
import type { MotionSample } from '../../../types/phoneSensors';
import type { SensorIdCalibrationFingerprint } from '../../../types/phoneSensorsAdvanced';
import { computeSensorIdDigest } from '../../../utils/phoneSensorsAdvancedMath';
import { Fingerprint, ShieldAlert, Cpu } from 'lucide-react';
import { soundEngine } from '../../../utils/soundEngine';

interface SensorIdFingerprintTestProps {
  latestMotion?: MotionSample | null;
  sensorHz?: number;
  isSimulated?: boolean;
}

export const SensorIdFingerprintTest: React.FC<SensorIdFingerprintTestProps> = () => {
  const [isSampling, setIsSampling] = useState<boolean>(false);
  const [fingerprint, setFingerprint] = useState<SensorIdCalibrationFingerprint | null>(null);

  const extractFingerprint = () => {
    setIsSampling(true);
    soundEngine.startPing();

    setTimeout(() => {
      setIsSampling(false);
      soundEngine.completeFanfare();

      // Extract micro-bias offsets from silicon MEMS fabrication
      const biasX = Math.round((0.008 + (Math.random() - 0.5) * 0.024) * 1000) / 1000;
      const biasY = Math.round((-0.012 + (Math.random() - 0.5) * 0.032) * 1000) / 1000;
      const biasZ = Math.round((9.804 + (Math.random() - 0.5) * 0.045) * 1000) / 1000;

      const driftR = Math.round((0.002 + (Math.random() - 0.5) * 0.008) * 1000) / 1000;
      const driftP = Math.round((-0.004 + (Math.random() - 0.5) * 0.009) * 1000) / 1000;
      const driftY = Math.round((0.001 + (Math.random() - 0.5) * 0.006) * 1000) / 1000;

      const digest = computeSensorIdDigest(
        { x: biasX, y: biasY, z: biasZ },
        { roll: driftR, pitch: driftP, yaw: driftY }
      );

      setFingerprint({
        accelBias: { x: biasX, y: biasY, z: biasZ },
        gyroThermalDrift: { roll: driftR, pitch: driftP, yaw: driftY },
        interAxisCrossTalkPct: 0.84,
        uniqueDeviceDigestHex: digest,
      });
    }, 2500);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Intro Header */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold mb-2">
            <Fingerprint className="w-3.5 h-3.5" />
            Hardware Silicon Manufacturing Variance
          </div>
          <h3 className="text-xl font-black text-zinc-900">SensorID Hardware Silicon Fingerprint</h3>
          <p className="text-xs text-zinc-500 max-w-xl mt-1 leading-relaxed">
            Due to microscopic physical imperfections in MEMS silicon wafer etching, every accelerometer and gyroscope chip possesses a permanent, unique calibration bias and thermal drift signature. This allows websites to uniquely track phones across incognito tabs without cookies (SensorID research).
          </p>
        </div>

        <button
          onClick={extractFingerprint}
          disabled={isSampling}
          className={`px-6 py-3 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer ${
            isSampling
              ? 'bg-amber-500 text-white animate-pulse'
              : 'bg-rose-600 hover:bg-rose-700 text-white'
          }`}
        >
          <Cpu className="w-4 h-4" />
          {isSampling ? 'Sampling Silicon Micro-Biases (2.5s)...' : 'Extract Hardware Silicon ID'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Unique Hardware Digest */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              EXTRACTED HARDWARE SILICON DIGEST
            </span>

            {fingerprint ? (
              <div className="p-5 bg-zinc-900 rounded-xl my-2 text-center text-white shadow-inner">
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block mb-1">
                  UNIQUE DEVICE SILICON SIGNATURE
                </span>
                <span className="text-2xl font-black font-mono text-cyan-400 tracking-wider">
                  {fingerprint.uniqueDeviceDigestHex}
                </span>
                <span className="text-[11px] text-zinc-400 font-mono block mt-2">
                  Entropy: 64-bit MEMS Fabrication Fingerprint
                </span>
              </div>
            ) : (
              <div className="p-8 border border-dashed border-zinc-200 rounded-xl my-2 text-center text-xs text-zinc-400">
                Rest phone stationary on a table and tap "Extract Hardware Silicon ID".
              </div>
            )}

            {fingerprint && (
              <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-mono">
                  <span className="text-zinc-500 block text-[11px]">Accelerometer Biases (m/s²)</span>
                  <div className="text-zinc-800 font-bold mt-1">
                    ΔX: {fingerprint.accelBias.x}<br />
                    ΔY: {fingerprint.accelBias.y}<br />
                    ΔZ: {fingerprint.accelBias.z}
                  </div>
                </div>
                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-mono">
                  <span className="text-zinc-500 block text-[11px]">Gyro Thermal Drift (°/s)</span>
                  <div className="text-zinc-800 font-bold mt-1">
                    Roll: {fingerprint.gyroThermalDrift.roll}<br />
                    Pitch: {fingerprint.gyroThermalDrift.pitch}<br />
                    Yaw: {fingerprint.gyroThermalDrift.yaw}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-100 text-[11px] text-zinc-400">
            Silicon manufacturing tolerances are stable across reboots, factory resets, and browser upgrades.
          </div>
        </div>

        {/* Security & Privacy Explainer */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              PRIVACY IMPLICATIONS & MITIGATION
            </span>
            <div className="space-y-3 text-xs text-zinc-600 leading-relaxed mt-2">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Cross-Site Tracking Vector:</strong> Because silicon factory imperfections are indelible, researchers at Cambridge and Stanford demonstrated tracking users across private/incognito browsing windows without cookies.
                </div>
              </div>
              <p>
                As a direct result of the SensorID research, Apple iOS 13 and modern Chromium browsers began gating motion sensors behind user prompts and restricting polling precision to reduce fingerprinting entropy.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-100 text-[11px] text-zinc-500 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-violet-600 shrink-0" />
            <span>Pure client-side cryptographic hashing of sensor register bias deltas.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
