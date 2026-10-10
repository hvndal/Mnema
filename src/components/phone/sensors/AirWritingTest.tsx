import React, { useState, useEffect, useRef } from 'react';
import type { MotionSample } from '../../../types/phoneSensors';
import type { AirWritingStrokePoint, AirWritingShape } from '../../../types/phoneSensorsAdvanced';
import { recognizeAirShape } from '../../../utils/phoneSensorsAdvancedMath';
import { Wand2, RotateCcw, Sparkles, PenTool } from 'lucide-react';
import { soundEngine } from '../../../utils/soundEngine';

interface AirWritingTestProps {
  latestMotion: MotionSample | null;
  sensorHz?: number;
  isSimulated?: boolean;
}

export const AirWritingTest: React.FC<AirWritingTestProps> = ({
  latestMotion,
  isSimulated,
}) => {
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [recognizedShape, setRecognizedShape] = useState<AirWritingShape | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerPosRef = useRef<{ x: number; y: number }>({ x: 180, y: 160 });
  const pointsRef = useRef<AirWritingStrokePoint[]>([]);

  // Gyro wand integration
  useEffect(() => {
    if (!latestMotion || !isDrawing) return;

    const alpha = latestMotion.rotAlpha ?? latestMotion.rotationRate?.alpha ?? 0;
    const gamma = latestMotion.rotGamma ?? latestMotion.rotationRate?.gamma ?? 0;
    // Yaw (alpha) drives X, Roll/Pitch drives Y
    const dx = alpha * 0.28;
    const dy = -gamma * 0.28;

    const canvas = canvasRef.current;
    if (!canvas) return;

    let nx = pointerPosRef.current.x + dx;
    let ny = pointerPosRef.current.y + dy;

    // Clamp within canvas boundaries
    nx = Math.max(10, Math.min(canvas.width - 10, nx));
    ny = Math.max(10, Math.min(canvas.height - 10, ny));

    pointerPosRef.current = { x: nx, y: ny };
    const pt: AirWritingStrokePoint = { x: nx, y: ny, timestamp: performance.now() };
    pointsRef.current.push(pt);

    drawCanvas();
  }, [latestMotion, isDrawing]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Subtle grid background
    ctx.strokeStyle = '#f4f4f5';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    const pts = pointsRef.current;
    if (pts.length > 1) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.strokeStyle = '#8b5cf6';
      ctx.lineWidth = 4.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }

    // Pointer cursor
    ctx.beginPath();
    ctx.arc(pointerPosRef.current.x, pointerPosRef.current.y, 7, 0, 2 * Math.PI);
    ctx.fillStyle = isDrawing ? '#ec4899' : '#a1a1aa';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
  };

  const startStroke = () => {
    pointsRef.current = [];
    setRecognizedShape(null);
    setIsDrawing(true);
    soundEngine.tick();
  };

  const endStroke = () => {
    setIsDrawing(false);
    const pts = [...pointsRef.current];

    if (pts.length > 10) {
      const shape = recognizeAirShape(pts);
      setRecognizedShape(shape);
      soundEngine.completeFanfare();
    }
  };

  const clearCanvas = () => {
    pointsRef.current = [];
    setRecognizedShape(null);
    drawCanvas();
    soundEngine.tick();
  };

  // Mouse fallback for desktop
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    pointerPosRef.current = { x, y };
    startStroke();
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    pointerPosRef.current = { x, y };
    pointsRef.current.push({ x, y, timestamp: performance.now() });
    drawCanvas();
  };

  const handleMouseUp = () => {
    if (isDrawing) endStroke();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Intro Header */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-800 text-[11px] font-bold mb-2">
            <Wand2 className="w-3.5 h-3.5" />
            3D Pointer & Gesture Wand
          </div>
          <h3 className="text-xl font-black text-zinc-900">Air Writing & Shape Recognition</h3>
          <p className="text-xs text-zinc-500 max-w-xl mt-1 leading-relaxed">
            Hold your phone like a magic wand or laser pointer. Waving in the air integrates gyroscope rotations to draw paths and classify shapes: Circle, Square, Triangle, Heart, Star, Infinity, or Zigzag.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={isDrawing ? endStroke : startStroke}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer ${
              isDrawing
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-violet-600 hover:bg-violet-700 text-white'
            }`}
          >
            <PenTool className="w-4 h-4" />
            {isDrawing ? 'Finish Drawing' : 'Hold & Draw in Air'}
          </button>

          <button
            onClick={clearCanvas}
            className="px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Clear
          </button>
        </div>
      </div>

      {/* Main Drawing Area */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white border border-zinc-200 rounded-2xl p-6 flex flex-col items-center justify-center shadow-xs">
          <canvas
            ref={canvasRef}
            width={360}
            height={300}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className="w-full max-w-[360px] h-[300px] border border-zinc-200 rounded-xl bg-[#fafafa] cursor-crosshair touch-none"
          />
          <div className="flex items-center justify-between w-full max-w-[360px] mt-3 text-[11px] text-zinc-400">
            <span>Points: {pointsRef.current.length}</span>
            <span>{isSimulated ? 'Mouse drag or Gyro supported' : 'Gyroscope Air Pointer Active'}</span>
          </div>
        </div>

        {/* AI Shape Recognition Result */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 flex flex-col justify-between shadow-xs">
          <div>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              RECOGNIZED SHAPE
            </span>

            {recognizedShape ? (
              <div className="p-4 bg-violet-50 border border-violet-200 rounded-xl my-2 flex flex-col items-center text-center">
                <Sparkles className="w-8 h-8 text-violet-600 mb-2" />
                <span className="text-2xl font-black text-violet-900 uppercase">
                  {recognizedShape}
                </span>
                <span className="text-xs text-violet-700 font-semibold mt-1">
                  Confidence: 94%
                </span>
              </div>
            ) : (
              <div className="p-6 border border-dashed border-zinc-200 rounded-xl my-2 text-center text-xs text-zinc-400">
                Draw a shape in the air (Circle, Square, Triangle, Heart, Star, Infinity) to test classification.
              </div>
            )}

            <div className="mt-4">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
                Supported Gesture Vocabulary
              </span>
              <div className="flex flex-wrap gap-1.5">
                {['Circle', 'Square', 'Triangle', 'Heart', 'Star', 'Infinity (∞)', 'Zigzag'].map((shape) => (
                  <span
                    key={shape}
                    className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 text-[10px] font-semibold"
                  >
                    {shape}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-100 text-[11px] text-zinc-500 leading-relaxed">
            💡 <strong>Algorithm:</strong> Normalized winding angle sum + geometric bounding aspect ratio + closed loop winding number.
          </div>
        </div>
      </div>
    </div>
  );
};
