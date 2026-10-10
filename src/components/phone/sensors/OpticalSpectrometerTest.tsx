import React, { useState } from 'react';
import type { SpectrometerEmissionPeak } from '../../../types/phoneSensorsAdvanced';
import { Sparkles, Info } from 'lucide-react';
import { soundEngine } from '../../../utils/soundEngine';

export const OpticalSpectrometerTest: React.FC = () => {
  const [selectedSource, setSelectedSource] = useState<'fluorescent' | 'white_led' | 'incandescent' | 'neon'>('fluorescent');

  const sources: Record<
    'fluorescent' | 'white_led' | 'incandescent' | 'neon',
    { name: string; desc: string; peaks: SpectrometerEmissionPeak[] }
  > = {
    fluorescent: {
      name: 'Compact Fluorescent Lamp (CFL)',
      desc: 'Discrete mercury vapor emission lines at 436nm, 546nm, and terbium green phosphor.',
      peaks: [
        { wavelengthNm: 436, relativeIntensity: 85, colorHex: '#3b82f6', elementOrSourceHint: 'Mercury (Hg) Blue Line' },
        { wavelengthNm: 546, relativeIntensity: 98, colorHex: '#22c55e', elementOrSourceHint: 'Mercury (Hg) Green Line' },
        { wavelengthNm: 611, relativeIntensity: 92, colorHex: '#ef4444', elementOrSourceHint: 'Europium Red Phosphor' },
      ],
    },
    white_led: {
      name: 'Commercial White LED',
      desc: 'Sharp 450nm royal blue gallium-nitride pump spike + broad yellow YAG:Ce phosphor hump.',
      peaks: [
        { wavelengthNm: 450, relativeIntensity: 100, colorHex: '#2563eb', elementOrSourceHint: 'GaN Blue Pump Diode' },
        { wavelengthNm: 565, relativeIntensity: 62, colorHex: '#eab308', elementOrSourceHint: 'YAG:Ce Yellow Phosphor' },
      ],
    },
    incandescent: {
      name: 'Incandescent / Sunlight',
      desc: 'Smooth continuous Planck blackbody radiation curve without sharp atomic emission spikes.',
      peaks: [
        { wavelengthNm: 550, relativeIntensity: 78, colorHex: '#84cc16', elementOrSourceHint: 'Peak Solar Luminosity' },
        { wavelengthNm: 680, relativeIntensity: 95, colorHex: '#dc2626', elementOrSourceHint: 'Deep Red / Near IR' },
      ],
    },
    neon: {
      name: 'Neon Discharge Sign',
      desc: 'Dense cluster of characteristic orange-red atomic emission lines between 585nm and 650nm.',
      peaks: [
        { wavelengthNm: 585, relativeIntensity: 82, colorHex: '#f97316', elementOrSourceHint: 'Neon (Ne) Yellow-Orange' },
        { wavelengthNm: 640, relativeIntensity: 96, colorHex: '#ea580c', elementOrSourceHint: 'Neon (Ne) Deep Orange' },
      ],
    },
  };

  const handleSelect = (key: any) => {
    soundEngine.tick();
    setSelectedSource(key);
  };

  const current = sources[selectedSource];

  return (
    <div className="flex flex-col gap-6">
      {/* Intro Header */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-800 text-[11px] font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Optical Spectroscopy & Diffraction
          </div>
          <h3 className="text-xl font-black text-zinc-900">Diffraction Grating Spectrometer (CD Scrap)</h3>
          <p className="text-xs text-zinc-500 max-w-xl mt-1 leading-relaxed">
            Tape a tiny piece of transparent DVD/CD track (with foil peeled) over your smartphone camera lens. The microscopic spiral tracks (1,350 lines/mm) act as a transmission diffraction grating, dispersing incoming light into its constituent wavelengths (400 – 700 nm).
          </p>
        </div>
      </div>

      {/* Light Source Switcher */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(sources).map(([key, item]) => (
          <button
            key={key}
            onClick={() => handleSelect(key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedSource === key
                ? 'bg-violet-600 text-white shadow-xs'
                : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
            }`}
          >
            {item.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Continuous Rainbow Spectrum with Peak Markers */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-zinc-500 font-semibold mb-2">
              <span>DISPERSED WAVELENGTH SPECTRUM</span>
              <span className="font-mono text-violet-600 font-bold">400nm — 700nm</span>
            </div>

            {/* Rainbow gradient bar */}
            <div
              className="w-full h-12 rounded-xl shadow-inner my-3 relative overflow-hidden"
              style={{
                background:
                  'linear-gradient(to right, #4c1d95, #3b82f6, #06b6d4, #22c55e, #eab308, #f97316, #ef4444, #991b1b)',
              }}
            >
              {/* Peak lines */}
              {current.peaks.map((p, idx) => {
                const leftPct = ((p.wavelengthNm - 400) / 300) * 100;
                return (
                  <div
                    key={idx}
                    className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_6px_#ffffff]"
                    style={{ left: `${leftPct}%` }}
                    title={`${p.wavelengthNm} nm`}
                  />
                );
              })}
            </div>

            {/* Scale legend */}
            <div className="flex justify-between text-[11px] font-mono text-zinc-400 mt-1">
              <span>400 nm (Violet)</span>
              <span>500 nm (Cyan)</span>
              <span>600 nm (Orange)</span>
              <span>700 nm (Red)</span>
            </div>
          </div>

          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-600 mt-4">
            <strong>Source Description:</strong> {current.desc}
          </div>
        </div>

        {/* Identified Spectral Emission Lines */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              IDENTIFIED EMISSION PEAKS
            </span>

            <div className="space-y-2.5 mt-2">
              {current.peaks.map((p, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: p.colorHex }}
                    />
                    <div>
                      <span className="font-bold text-zinc-800 block">
                        {p.elementOrSourceHint}
                      </span>
                      <span className="text-[11px] text-zinc-400 font-mono">
                        {p.wavelengthNm} nm
                      </span>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-md border border-violet-100">
                    {p.relativeIntensity}% Intensity
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-100 text-[11px] text-zinc-500 flex items-center gap-2">
            <Info className="w-4 h-4 text-violet-600 shrink-0" />
            <span>Used by citizen science projects for water contamination and light pollution monitoring.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
