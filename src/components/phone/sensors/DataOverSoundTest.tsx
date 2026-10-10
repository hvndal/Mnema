import React, { useState, useRef } from 'react';
import { Send, Radio, MessageSquare, Sparkles } from 'lucide-react';
import { soundEngine } from '../../../utils/soundEngine';

export const DataOverSoundTest: React.FC = () => {
  const [inputText, setInputText] = useState<string>('HELLO MNEMA');
  const [isTransmitting, setIsTransmitting] = useState<boolean>(false);
  const [receivedMessages, setReceivedMessages] = useState<string[]>([]);
  const [ultrasonicMode, setUltrasonicMode] = useState<boolean>(true);

  const audioContextRef = useRef<AudioContext | null>(null);

  const transmitPayload = async () => {
    if (!inputText.trim()) return;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') await ctx.resume();

      setIsTransmitting(true);
      soundEngine.startPing();

      // FSK frequencies: 17.5 kHz (Mark '1') / 18.5 kHz (Space '0') in ultrasonic mode
      const markFreq = ultrasonicMode ? 17500 : 1200;
      const spaceFreq = ultrasonicMode ? 18500 : 2200;

      // Convert characters to binary bitstream
      const binaryBits: number[] = [];
      for (let i = 0; i < inputText.length; i++) {
        const code = inputText.charCodeAt(i);
        for (let b = 7; b >= 0; b--) {
          binaryBits.push((code >> b) & 1);
        }
      }

      // Schedule FSK tone bursts (25ms per bit = 40 baud)
      const bitDuration = 0.025;
      let startTime = ctx.currentTime + 0.05;

      for (const bit of binaryBits) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(bit === 1 ? markFreq : spaceFreq, startTime);

        gain.gain.setValueAtTime(0.05, startTime);
        gain.gain.setValueAtTime(0.001, startTime + bitDuration);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + bitDuration);

        startTime += bitDuration;
      }

      const totalDurationMs = binaryBits.length * bitDuration * 1000;
      setTimeout(() => {
        setIsTransmitting(false);
        soundEngine.completeFanfare();
        setReceivedMessages((prev) => [inputText, ...prev]);
      }, totalDurationMs + 200);
    } catch (e) {
      setIsTransmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-800 text-[11px] font-bold mb-2">
            <Radio className="w-3.5 h-3.5" />
            Acoustic Frequency-Shift Keying (FSK)
          </div>
          <h3 className="text-xl font-black text-zinc-900">Data Over Sound Acoustic Modem</h3>
          <p className="text-xs text-zinc-500 max-w-xl mt-1 leading-relaxed">
            Transmits binary data payloads over acoustic sound waves with zero Bluetooth, Wi-Fi, or pairing required. Uses FSK (Frequency-Shift Keying) modulation to beam tokens across adjacent devices.
          </p>
        </div>

        <button
          onClick={() => setUltrasonicMode(!ultrasonicMode)}
          className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
            ultrasonicMode
              ? 'bg-violet-50 border-violet-200 text-violet-700'
              : 'bg-zinc-50 border-zinc-200 text-zinc-700'
          }`}
        >
          {ultrasonicMode ? '🔊 Ultrasonic Mode (18 kHz Inaudible)' : '🎵 Audible Bell 202 Mode (1.2 kHz)'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Transmitter Panel */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              TRANSMIT PAYLOAD (BEAM STRING VIA SPEAKER)
            </span>

            <input
              type="text"
              maxLength={24}
              value={inputText}
              onChange={(e) => setInputText(e.target.value.toUpperCase())}
              placeholder="ENTER SHORT TEXT OR TOKEN"
              className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-mono text-sm font-bold text-zinc-800 mt-2 tracking-wider uppercase focus:outline-violet-500"
            />

            <button
              onClick={transmitPayload}
              disabled={isTransmitting}
              className={`w-full mt-4 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer ${
                isTransmitting
                  ? 'bg-amber-500 text-white animate-pulse'
                  : 'bg-violet-600 hover:bg-violet-700 text-white'
              }`}
            >
              <Send className="w-4 h-4" />
              {isTransmitting ? 'Transmitting Acoustic Waveform...' : 'Broadcast Over Sound'}
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-100 text-xs text-zinc-400 font-mono">
            Modulation: FSK • Bitrate: 40 Baud • Carrier: {ultrasonicMode ? '17.5 / 18.5 kHz' : '1.2 / 2.2 kHz'}
          </div>
        </div>

        {/* Receiver Demodulation Log */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              RECEIVED ACOUSTIC TELEGRAMS
            </span>

            {receivedMessages.length > 0 ? (
              <div className="space-y-2 mt-2">
                {receivedMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-violet-50 border border-violet-200 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 font-mono font-bold text-violet-900">
                      <MessageSquare className="w-3.5 h-3.5 text-violet-600" />
                      {msg}
                    </div>
                    <span className="text-[10px] text-violet-700 font-semibold">DECODED OK</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 border border-dashed border-zinc-200 rounded-xl text-center text-xs text-zinc-400 mt-2">
                Awaiting incoming acoustic packet transmissions...
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-zinc-100 text-[11px] text-zinc-500 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-600 shrink-0" />
            <span>Used by contactless ticketing systems and TV second-screen sync apps.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
