import React, { useState } from 'react';
import { usePhoneSensors } from '../../hooks/usePhoneSensors';
import { PhoneSteadinessTest } from './PhoneSteadinessTest';
import { PhoneBalanceTest } from './PhoneBalanceTest';
import { PhoneProprioceptionTest } from './PhoneProprioceptionTest';
import {
  Activity,
  Compass,
  Target,
  Smartphone,
  ShieldCheck,
  AlertTriangle,
  QrCode,
  Laptop,
} from 'lucide-react';

export type PhoneTestTab = 'steadiness' | 'balance' | 'proprioception';

interface PhoneGyroLabProps {
  initialTest?: PhoneTestTab;
}

export const PhoneGyroLab: React.FC<PhoneGyroLabProps> = ({ initialTest = 'steadiness' }) => {
  const [activeTab, setActiveTab] = useState<PhoneTestTab>(initialTest);

  const {
    permission,
    requestPermission,
    isHardwareAvailable,
    isSimulated,
    setIsSimulated,
    latestMotion,
    latestOrientation,
    sensorHz,
    simulatedPitch,
    setSimulatedPitch,
    simulatedTremorAmp,
    setSimulatedTremorAmp,
  } = usePhoneSensors();

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6">
      {/* Top Mobile Sensors Notification / Permission Card */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-zinc-900">Phone Gyro & Motion Psychophysics</h3>
              {isHardwareAvailable ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Live IMU ({sensorHz} Hz)
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-semibold border border-amber-200 flex items-center gap-1">
                  <Laptop className="w-3 h-3" /> Desktop Simulator
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              High-frequency accelerometer and gyroscope telemetry for motor steadiness, vestibular balance, and joint acuity.
            </p>
          </div>
        </div>

        {/* Action button for iOS permission or Simulator toggle */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {permission === 'prompt' && (
            <button
              onClick={requestPermission}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Smartphone className="w-3.5 h-3.5" />
              Enable Phone Sensors
            </button>
          )}

          {permission === 'denied' && (
            <div className="text-xs text-rose-600 font-medium flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Sensor permission denied
            </div>
          )}

          <button
            onClick={() => setIsSimulated(!isSimulated)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              isSimulated
                ? 'bg-zinc-100 border-zinc-300 text-zinc-800'
                : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            {isSimulated ? 'Using Desktop Simulator' : 'Switch to Simulator'}
          </button>
        </div>
      </div>

      {/* Sub-tabs Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            id: 'steadiness',
            label: '1. Arm-Length Steadiness',
            desc: '30s hold, micro-shake variance & FFT tremor frequency peak',
            icon: Activity,
          },
          {
            id: 'balance',
            label: '2. Vestibular Balance',
            desc: 'Romberg ratio: 15s eyes open vs 15s eyes closed sway',
            icon: Compass,
          },
          {
            id: 'proprioception',
            label: '3. Blind Proprioception',
            desc: 'Tilt to 30° without looking; reveal joint position error',
            icon: Target,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <div
              key={tab.id}
              onClick={() => setActiveTab(tab.id as PhoneTestTab)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                isActive
                  ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                  : 'bg-white text-zinc-800 border-zinc-200 hover:border-zinc-300 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm">{tab.label}</span>
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-violet-600'}`} />
              </div>
              <p className={`text-xs ${isActive ? 'text-violet-100' : 'text-zinc-500'}`}>
                {tab.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* Active Test Container */}
      <div className="bg-white border border-zinc-200 rounded-3xl p-6 sm:p-8 shadow-xs">
        {activeTab === 'steadiness' && (
          <PhoneSteadinessTest
            latestMotion={latestMotion}
            sensorHz={sensorHz}
            isSimulated={isSimulated}
            simulatedTremorAmp={simulatedTremorAmp}
            setSimulatedTremorAmp={setSimulatedTremorAmp}
          />
        )}

        {activeTab === 'balance' && (
          <PhoneBalanceTest
            latestOrientation={latestOrientation}
            sensorHz={sensorHz}
            isSimulated={isSimulated}
          />
        )}

        {activeTab === 'proprioception' && (
          <PhoneProprioceptionTest
            latestOrientation={latestOrientation}
            sensorHz={sensorHz}
            isSimulated={isSimulated}
            simulatedPitch={simulatedPitch}
            setSimulatedPitch={setSimulatedPitch}
          />
        )}
      </div>

      {/* Helpful Mobile Access Callout */}
      <div className="bg-violet-50/50 border border-violet-100 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-600">
        <div className="flex items-center gap-3">
          <QrCode className="w-5 h-5 text-violet-600 shrink-0" />
          <div>
            <span className="font-bold text-zinc-800 block">Want to test on your actual smartphone?</span>
            <span className="text-[11px] text-zinc-500">
              Open <strong>https://hvndal.github.io/Mnema/</strong> directly on mobile Safari or Chrome.
            </span>
          </div>
        </div>
        <a
          href="https://hvndal.github.io/Mnema/"
          target="_blank"
          rel="noreferrer"
          className="text-violet-700 font-bold hover:underline shrink-0"
        >
          Open Live URL ↗
        </a>
      </div>
    </div>
  );
};
