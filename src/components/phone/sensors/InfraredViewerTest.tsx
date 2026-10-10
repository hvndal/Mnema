import React, { useState, useRef } from 'react';
import { Eye, Camera, Tv, Sparkles } from 'lucide-react';
import { soundEngine } from '../../../utils/soundEngine';

export const InfraredViewerTest: React.FC = () => {
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [filterMode, setFilterMode] = useState<'normal' | 'high_contrast_ir'>('high_contrast_ir');
  const [simulatedLedFlashing, setSimulatedLedFlashing] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      soundEngine.startPing();
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user', // Selfie cameras often have thinner IR cut filters than rear cameras
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }
    } catch (e) {
      // Permission denied or desktop simulation
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
    }
    setIsCameraActive(false);
    soundEngine.tick();
  };

  const triggerSimulatedRemote = () => {
    soundEngine.tick();
    setSimulatedLedFlashing(true);
    setTimeout(() => {
      setSimulatedLedFlashing(false);
    }, 1200);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Intro Header */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-800 text-[11px] font-bold mb-2">
            <Eye className="w-3.5 h-3.5" />
            Near-Infrared (940nm) Optical Detection
          </div>
          <h3 className="text-xl font-black text-zinc-900">Infrared Remote Control LED Viewer</h3>
          <p className="text-xs text-zinc-500 max-w-xl mt-1 leading-relaxed">
            Silicon CMOS camera sensors detect near-infrared radiation (850 – 950 nm) invisible to the human eye. Point your TV, cable box, or air conditioner remote directly at the camera lens and push buttons to see the blinking purple/white infrared diode.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={isCameraActive ? stopCamera : startCamera}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer ${
              isCameraActive
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-violet-600 hover:bg-violet-700 text-white'
            }`}
          >
            <Camera className="w-4 h-4" />
            {isCameraActive ? 'Stop Viewfinder' : 'Open Front/IR Camera'}
          </button>

          <button
            onClick={triggerSimulatedRemote}
            className="px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 text-xs font-semibold cursor-pointer"
          >
            Press Virtual Remote
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Viewfinder Display */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-zinc-500 font-semibold mb-2">
              <span>IR CAMERA VIEWFINDER</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterMode('high_contrast_ir')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                    filterMode === 'high_contrast_ir' ? 'bg-violet-600 text-white' : 'text-zinc-500'
                  }`}
                >
                  High-Contrast IR
                </button>
                <button
                  onClick={() => setFilterMode('normal')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                    filterMode === 'normal' ? 'bg-violet-600 text-white' : 'text-zinc-500'
                  }`}
                >
                  Raw Video
                </button>
              </div>
            </div>

            <div className="w-full h-56 bg-zinc-950 rounded-xl overflow-hidden relative border border-zinc-800 flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className={`w-full h-full object-cover ${
                  filterMode === 'high_contrast_ir'
                    ? 'contrast-200 brightness-90 saturate-50'
                    : ''
                }`}
              />

              {/* Simulated IR Remote Blinking LED Indicator */}
              {simulatedLedFlashing && (
                <div className="absolute w-12 h-12 rounded-full bg-violet-400/90 shadow-[0_0_24px_#c084fc] flex items-center justify-center animate-ping">
                  <div className="w-4 h-4 rounded-full bg-white shadow-[0_0_12px_#ffffff]" />
                </div>
              )}

              {!isCameraActive && (
                <div className="absolute text-zinc-500 text-xs flex flex-col items-center gap-2">
                  <Tv className="w-8 h-8 text-zinc-600" />
                  <span>Tap "Open Front/IR Camera" above or press Virtual Remote</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-100 text-[11px] text-zinc-400">
            Note: Smartphone front (selfie) cameras frequently have weaker IR cut-off filters than rear lenses.
          </div>
        </div>

        {/* Why This Works Explainer */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              SILICON BANDGAP PHYSICS
            </span>
            <div className="space-y-3 text-xs text-zinc-600 leading-relaxed mt-2">
              <p>
                Silicon has a bandgap of ~1.1 eV, corresponding to a cut-off wavelength of ~1,100 nm. While human retinal cone photopigments stop responding above 700 nm, silicon camera sensors capture up to 1,000 nm with ease.
              </p>
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                <strong className="text-zinc-800 block mb-1">Handy Everyday Diagnostic:</strong>
                If your TV or air conditioner remote stops working, point it at your phone camera and tap buttons. If you don't see bright purple flashes, the batteries are dead or the circuit is broken!
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-100 text-[11px] text-zinc-500 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-600 shrink-0" />
            <span>Used by technicians to instantly verify infrared transmitter remote functionality.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
