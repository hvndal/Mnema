import React, { useState, useEffect, useRef } from 'react';
import type { MotionSample } from '../../types/phoneSensors';
import type { TwoPlayerDuelResult } from '../../types/gyroLab';
import { soundEngine } from '../../utils/audioCues';
import { Users, Play, RotateCcw, Award, AlertTriangle } from 'lucide-react';

interface TwoPlayerDuelTestProps {
  latestMotion: MotionSample | null;
  sensorHz: number;
  isSimulated: boolean;
}

export const TwoPlayerDuelTest: React.FC<TwoPlayerDuelTestProps> = ({
  latestMotion,
  sensorHz,
  isSimulated,
}) => {
  const [phase, setPhase] = useState<'idle' | 'p1_countdown' | 'p1_turn' | 'p1_done' | 'p2_countdown' | 'p2_turn' | 'results'>('idle');
  const [p1Time, setP1Time] = useState<number>(0);
  const [p2Time, setP2Time] = useState<number>(0);
  const [p1MaxShake, setP1MaxShake] = useState<number>(0);
  const [countdownNum, setCountdownNum] = useState<number>(3);
  const [currentShake, setCurrentShake] = useState<number>(0);
  const [result, setResult] = useState<TwoPlayerDuelResult | null>(null);

  const wobbleThreshold = 0.45; // m/s² wobble fault limit
  const turnStartTimeRef = useRef<number>(0);
  const maxShakeRef = useRef<number>(0);

  // Stillness monitoring loop
  useEffect(() => {
    if (!latestMotion) return;

    const shake = Math.abs(latestMotion.magnitude - 9.81);
    setCurrentShake(Math.round(shake * 100) / 100);

    if (shake > maxShakeRef.current) {
      maxShakeRef.current = shake;
    }

    if (phase === 'p1_turn') {
      const elapsed = Math.round(((performance.now() - turnStartTimeRef.current) / 1000) * 10) / 10;
      setP1Time(elapsed);
      if (shake > wobbleThreshold) {
        soundEngine.phaseTransition();
        setP1MaxShake(Math.round(maxShakeRef.current * 100) / 100);
        setPhase('p1_done');
      }
    } else if (phase === 'p2_turn') {
      const elapsed = Math.round(((performance.now() - turnStartTimeRef.current) / 1000) * 10) / 10;
      setP2Time(elapsed);
      if (shake > wobbleThreshold) {
        soundEngine.completeFanfare();
        finishDuel(p1Time, elapsed);
      }
    }
  }, [phase, latestMotion, p1Time]);

  const startP1 = () => {
    maxShakeRef.current = 0;
    setP1Time(0);
    setP2Time(0);
    setResult(null);
    setPhase('p1_countdown');
    setCountdownNum(3);
    soundEngine.tick();

    let count = 3;
    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdownNum(count);
        soundEngine.tick();
      } else {
        clearInterval(interval);
        turnStartTimeRef.current = performance.now();
        setPhase('p1_turn');
        soundEngine.startPing();
      }
    }, 1000);
  };

  const startP2 = () => {
    maxShakeRef.current = 0;
    setPhase('p2_countdown');
    setCountdownNum(3);
    soundEngine.tick();

    let count = 3;
    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        setCountdownNum(count);
        soundEngine.tick();
      } else {
        clearInterval(interval);
        turnStartTimeRef.current = performance.now();
        setPhase('p2_turn');
        soundEngine.startPing();
      }
    }, 1000);
  };

  const finishDuel = (t1: number, t2: number) => {
    let winner = 'Player 1';
    if (t2 > t1) winner = 'Player 2';
    else if (t1 === t2) winner = 'Tie!';

    setResult({
      player1Name: 'Player 1',
      player2Name: 'Player 2',
      winner,
      player1SurvivalTimeSec: t1,
      player2SurvivalTimeSec: t2,
      wobbleThreshold,
      player1MaxWobble: p1MaxShake,
      player2MaxWobble: Math.round(maxShakeRef.current * 100) / 100,
    });
    setPhase('results');
  };

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex justify-between items-center pb-3 border-b border-zinc-100">
        <div>
          <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-violet-600" />
            Two-Player Stillness Duel (Pass & Play)
          </h3>
          <p className="text-xs text-zinc-500">
            Compete on the same device. Both players hold as still as possible; the first player to breach the wobble threshold loses!
          </p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 font-semibold">
          {isSimulated ? 'Simulator Mode' : `${sensorHz} Hz IMU`}
        </span>
      </div>

      {phase === 'idle' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-8 flex flex-col items-center text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mb-4">
            <Users className="w-8 h-8" />
          </div>
          <h4 className="text-sm font-bold text-zinc-900 mb-1">Sudden-Death Stillness Showdown</h4>
          <p className="text-xs text-zinc-500 max-w-sm mb-6 leading-relaxed">
            Player 1 holds the phone arm outstretched until they breach the 0.45 m/s² wobble limit. Pass the phone to Player 2 to see if they can survive longer!
          </p>
          <button
            onClick={startP1}
            className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            Start Player 1's Turn
          </button>
        </div>
      )}

      {phase === 'p1_countdown' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-violet-600 mb-2">Player 1 Ready</span>
          <div className="text-7xl font-black text-zinc-900 my-4 animate-bounce">{countdownNum}</div>
          <p className="text-xs text-zinc-400">Freeze in position, hold completely still...</p>
        </div>
      )}

      {phase === 'p1_turn' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-8 flex flex-col items-center justify-center shadow-xs">
          <span className="text-xs font-bold text-violet-600 uppercase tracking-wider mb-2">PLAYER 1 HOLDING</span>
          <div className="text-6xl font-black font-mono text-zinc-900 my-2">{p1Time}s</div>

          <div className="flex items-center gap-2 text-xs mt-3">
            <span className="text-zinc-500">Live Shake:</span>
            <span className={`font-mono font-bold ${currentShake > 0.35 ? 'text-rose-600 animate-pulse' : 'text-zinc-800'}`}>
              {currentShake} / {wobbleThreshold} m/s²
            </span>
          </div>
        </div>
      )}

      {phase === 'p1_done' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-8 flex flex-col items-center text-center shadow-xs">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-bold flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4" /> Wobble Threshold Breached!
          </div>
          <h4 className="text-lg font-bold text-zinc-900 mb-1">Player 1 Survived {p1Time}s</h4>
          <p className="text-xs text-zinc-500 max-w-sm mb-6">
            Now pass the phone to <strong>Player 2</strong>. They must hold still for longer than {p1Time} seconds to win!
          </p>
          <button
            onClick={startP2}
            className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer"
          >
            Start Player 2's Turn
          </button>
        </div>
      )}

      {phase === 'p2_countdown' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-16 flex flex-col items-center justify-center text-center shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-violet-600 mb-2">Player 2 Ready</span>
          <div className="text-7xl font-black text-zinc-900 my-4 animate-bounce">{countdownNum}</div>
          <p className="text-xs text-zinc-400">Beat {p1Time} seconds to claim victory...</p>
        </div>
      )}

      {phase === 'p2_turn' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-8 flex flex-col items-center justify-center shadow-xs">
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">PLAYER 2 HOLDING</span>
          <div className="text-6xl font-black font-mono text-zinc-900 my-2">{p2Time}s</div>
          <span className="text-xs text-zinc-400 font-medium">Target to beat: &gt; {p1Time}s</span>

          <div className="flex items-center gap-2 text-xs mt-3">
            <span className="text-zinc-500">Live Shake:</span>
            <span className={`font-mono font-bold ${currentShake > 0.35 ? 'text-rose-600 animate-pulse' : 'text-zinc-800'}`}>
              {currentShake} / {wobbleThreshold} m/s²
            </span>
          </div>
        </div>
      )}

      {phase === 'results' && result && (
        <div className="flex flex-col gap-5">
          <div className="bg-white border border-zinc-200 rounded-2xl p-8 shadow-xs flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center mb-3">
              <Award className="w-8 h-8" />
            </div>
            <span className="text-xs font-bold text-violet-600 uppercase tracking-wider">DUEL WINNER</span>
            <h4 className="text-3xl font-black text-zinc-900 my-1">{result.winner} VICTORY!</h4>

            <div className="grid grid-cols-2 gap-4 w-full max-w-sm mt-6 text-xs">
              <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl">
                <span className="text-zinc-500 block mb-1">Player 1 Time</span>
                <span className="text-2xl font-black font-mono text-zinc-900">{result.player1SurvivalTimeSec}s</span>
              </div>
              <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl">
                <span className="text-zinc-500 block mb-1">Player 2 Time</span>
                <span className="text-2xl font-black font-mono text-violet-600">{result.player2SurvivalTimeSec}s</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl p-4 flex justify-between items-center shadow-xs">
            <button
              onClick={startP1}
              className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Rematch Duel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
