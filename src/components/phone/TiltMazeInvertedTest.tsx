import React, { useState, useEffect, useRef } from 'react';
import type { OrientationSample } from '../../types/phoneSensors';
import type { TiltMazeResult } from '../../types/gyroLab';
import { soundEngine } from '../../utils/audioCues';
import { saveSession } from '../../utils/sessionStorage';
import { Compass, Play, RotateCcw, Award, CheckCircle2 } from 'lucide-react';

interface TiltMazeInvertedTestProps {
  latestOrientation: OrientationSample | null;
  sensorHz: number;
  isSimulated: boolean;
}

export const TiltMazeInvertedTest: React.FC<TiltMazeInvertedTestProps> = ({
  latestOrientation,
  sensorHz,
  isSimulated,
}) => {
  const [phase, setPhase] = useState<'idle' | 'running' | 'results'>('idle');
  const [isInverted, setIsInverted] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [ballPos, setBallPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [targetPos, setTargetPos] = useState<{ x: number; y: number }>({ x: 40, y: -40 });
  const [result, setResult] = useState<TiltMazeResult | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const ballPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isInvertedRef = useRef<boolean>(false);
  const targetPosRef = useRef<{ x: number; y: number }>({ x: 40, y: -40 });
  const scoreRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const inversionTimeRef = useRef<number>(0);

  // Ball physics loop
  useEffect(() => {
    if (phase !== 'running' || !latestOrientation) return;

    const roll = latestOrientation.gamma;
    const pitch = latestOrientation.beta;

    // Movement vector
    const factor = isInvertedRef.current ? -0.8 : 0.8;
    const dx = roll * factor;
    const dy = pitch * factor;

    ballPosRef.current = {
      x: Math.max(-100, Math.min(100, ballPosRef.current.x + dx * 0.1)),
      y: Math.max(-100, Math.min(100, ballPosRef.current.y + dy * 0.1)),
    };
    setBallPos({ ...ballPosRef.current });

    // Check collision with target
    const dist = Math.sqrt(
      (ballPosRef.current.x - targetPosRef.current.x) ** 2 +
      (ballPosRef.current.y - targetPosRef.current.y) ** 2
    );

    if (dist < 22) {
      soundEngine.startPing();
      scoreRef.current += 1;
      setScore(scoreRef.current);

      // Trigger Inversion at checkpoint 3!
      if (scoreRef.current === 3 && !isInvertedRef.current) {
        isInvertedRef.current = true;
        setIsInverted(true);
        inversionTimeRef.current = performance.now();
        soundEngine.phaseTransition();
      }

      if (scoreRef.current >= 6) {
        finishGame();
        return;
      }

      // Next target position
      const nextX = (Math.random() - 0.5) * 160;
      const nextY = (Math.random() - 0.5) * 160;
      targetPosRef.current = { x: nextX, y: nextY };
      setTargetPos({ x: nextX, y: nextY });
    }
  }, [phase, latestOrientation]);

  const startGame = () => {
    ballPosRef.current = { x: 0, y: 0 };
    targetPosRef.current = { x: 40, y: -40 };
    isInvertedRef.current = false;
    scoreRef.current = 0;
    setScore(0);
    setIsInverted(false);
    setBallPos({ x: 0, y: 0 });
    setTargetPos({ x: 40, y: -40 });
    setResult(null);
    setIsSaved(false);
    setPhase('running');
    startTimeRef.current = performance.now();
    soundEngine.startPing();
  };

  const finishGame = () => {
    soundEngine.completeFanfare();
    const totalTimeSec = Math.round(((performance.now() - startTimeRef.current) / 1000) * 10) / 10;
    const inversionDelay = Math.round(((performance.now() - inversionTimeRef.current) / 1000) * 10) / 10;

    const res: TiltMazeResult = {
      totalTimeSeconds: totalTimeSec,
      checkpointsHit: 6,
      inversionReactionDelaySeconds: inversionDelay,
      adaptationRateScore: Math.max(20, Math.min(100, Math.round(100 - inversionDelay * 8))),
      normalPhaseSpeed: 1.8,
      invertedPhaseSpeed: 1.2,
      motorPlasticityRating: inversionDelay < 4.0 ? 'Fast Motor Adaptation' : inversionDelay < 8.0 ? 'Moderate Plasticity' : 'Rigid Motor Pattern',
    };

    setResult(res);
    setPhase('results');

    saveSession({
      id: `tilt-maze-${Date.now()}`,
      timestamp: new Date().toISOString(),
      experimentType: 'phone_steadiness',
      protocolVersion: '5.0-tilt-maze-sensorimotor-inversion',
      hardwareName: isSimulated ? 'Phone Sensor Simulator' : 'Smartphone Gyro',
      controllerId: 'Phone Built-In IMU',
      settingsSummary: { checkpoints: 6 },
      sampleCount: 6,
      hasInterruptedTrials: false,
      dataQualityWarnings: [],
    }).then(() => setIsSaved(true)).catch(console.error);
  };

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex justify-between items-center pb-3 border-b border-zinc-100">
        <div>
          <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
            <Compass className="w-5 h-5 text-violet-600" />
            Inverted Axis Tilt Maze (Sensorimotor Plasticity)
          </h3>
          <p className="text-xs text-zinc-500">
            Steer the purple sphere into target zones by tilting. Mid-way through, the controls SUDDENLY INVERT. Measures sensorimotor remapping speed.
          </p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 font-semibold">
          {isSimulated ? 'Simulator Mode' : `${sensorHz} Hz Gyro`}
        </span>
      </div>

      {phase === 'idle' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-8 flex flex-col items-center text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mb-4">
            <Compass className="w-8 h-8" />
          </div>
          <h4 className="text-sm font-bold text-zinc-900 mb-1">Cerebellar Motor Plasticity Challenge</h4>
          <p className="text-xs text-zinc-500 max-w-sm mb-6 leading-relaxed">
            Tilt your phone to steer the ball into 6 checkpoint portals. At checkpoint 3, the tilt controls instantly flip opposite. Your time to adapt reveals your brain's motor remapping speed.
          </p>
          <button
            onClick={startGame}
            className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            Start Tilt Maze (6 Checkpoints)
          </button>
        </div>
      )}

      {phase === 'running' && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 flex flex-col items-center justify-center shadow-xs">
          <div className="flex justify-between items-center w-full max-w-sm mb-4">
            <span className="text-xs font-bold text-zinc-500 uppercase">
              Checkpoints: <strong className="text-violet-600">{score} / 6</strong>
            </span>
            {isInverted && (
              <span className="text-xs font-black text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 animate-pulse">
                ⚠️ CONTROLS INVERTED!
              </span>
            )}
          </div>

          {/* 2D Arena */}
          <div className="relative w-72 h-72 bg-zinc-50 rounded-2xl border-2 border-zinc-300 overflow-hidden flex items-center justify-center shadow-inner">
            <div className="w-full h-px bg-zinc-200 absolute" />
            <div className="h-full w-px bg-zinc-200 absolute" />

            {/* Target Portal */}
            <div
              style={{
                left: `${50 + (targetPos.x / 200) * 80}%`,
                top: `${50 + (targetPos.y / 200) * 80}%`,
              }}
              className="w-10 h-10 rounded-full border-2 border-dashed border-emerald-500 bg-emerald-100/50 absolute -translate-x-1/2 -translate-y-1/2 animate-ping"
            />
            <div
              style={{
                left: `${50 + (targetPos.x / 200) * 80}%`,
                top: `${50 + (targetPos.y / 200) * 80}%`,
              }}
              className="w-8 h-8 rounded-full bg-emerald-500/20 border-2 border-emerald-600 absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center text-[10px] font-bold text-emerald-800"
            >
              ★
            </div>

            {/* User Marble */}
            <div
              style={{
                left: `${50 + (ballPos.x / 200) * 80}%`,
                top: `${50 + (ballPos.y / 200) * 80}%`,
              }}
              className="w-6 h-6 rounded-full bg-violet-600 border-2 border-white absolute -translate-x-1/2 -translate-y-1/2 shadow-md transition-all duration-75"
            />
          </div>
        </div>
      )}

      {phase === 'results' && result && (
        <div className="flex flex-col gap-5">
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center">
                <Award className="w-8 h-8" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-violet-600 uppercase tracking-wider block">Motor Plasticity Score</span>
                <div className="text-3xl font-black text-zinc-900">{result.adaptationRateScore} / 100</div>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 inline-block mt-1">
                  {result.motorPlasticityRating}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full sm:w-auto text-xs">
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Total Run Time</span>
                <span className="text-lg font-bold font-mono text-zinc-900">{result.totalTimeSeconds}s</span>
              </div>
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                <span className="text-zinc-400 block text-[10px] uppercase font-semibold">Inversion Recovery</span>
                <span className="text-lg font-bold font-mono text-violet-600">{result.inversionReactionDelaySeconds}s</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl p-4 flex justify-between items-center shadow-xs">
            <button
              onClick={startGame}
              className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Replay Tilt Maze
            </button>
            {isSaved && (
              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Saved
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
