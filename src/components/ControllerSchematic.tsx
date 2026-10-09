import React from 'react';
import type { RawGamepadState } from '../types/telemetry';

interface ControllerSchematicProps {
  controller: RawGamepadState | null;
  className?: string;
}

export const ControllerSchematic: React.FC<ControllerSchematicProps> = ({ controller, className = '' }) => {
  // Helpers to inspect button status
  const isDown = (idx: number) => {
    if (!controller) return false;
    const btn = controller.buttons[idx];
    return btn ? (btn.pressed || btn.value > 0.45) : false;
  };

  const getAxis = (idx: number) => {
    if (!controller || !controller.axes[idx]) return 0;
    return controller.axes[idx].value;
  };

  const lx = getAxis(0);
  const ly = getAxis(1);
  const rx = getAxis(2);
  const ry = getAxis(3);

  // LT and RT analog values
  const ltVal = controller?.buttons[6]?.value ?? 0;
  const rtVal = controller?.buttons[7]?.value ?? 0;

  return (
    <div className={`relative w-full max-w-md mx-auto aspect-[16/10] bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm flex items-center justify-center select-none ${className}`}>
      {/* SVG Vector Controller Body */}
      <svg viewBox="0 0 400 250" className="w-full h-full drop-shadow-sm">
        {/* Main Chassis */}
        <path
          d="M 100,55 C 130,50 270,50 300,55 C 345,60 375,100 375,160 C 375,210 335,235 305,230 C 275,225 255,185 240,185 C 220,185 210,195 200,195 C 190,195 180,185 160,185 C 145,185 125,225 95,230 C 65,235 25,210 25,160 C 25,100 55,60 100,55 Z"
          fill="#f4f4f7"
          stroke="#d4d4d8"
          strokeWidth="2.5"
        />

        {/* Bumpers & Triggers (Top) */}
        {/* LB & LT */}
        <path
          d="M 85,42 C 100,38 135,38 145,45 L 140,55 L 80,55 Z"
          fill={isDown(4) ? '#7c3aed' : '#e4e4e7'}
          stroke="#a1a1aa"
          strokeWidth="1.5"
          className="transition-colors duration-75"
        />
        <text x="110" y="32" fontSize="9" fontWeight="bold" fill="#71717a" textAnchor="middle">
          LB {isDown(4) ? '●' : ''}
        </text>

        {/* RB & RT */}
        <path
          d="M 255,45 C 265,38 300,38 315,42 L 320,55 L 260,55 Z"
          fill={isDown(5) ? '#7c3aed' : '#e4e4e7'}
          stroke="#a1a1aa"
          strokeWidth="1.5"
          className="transition-colors duration-75"
        />
        <text x="290" y="32" fontSize="9" fontWeight="bold" fill="#71717a" textAnchor="middle">
          RB {isDown(5) ? '●' : ''}
        </text>

        {/* D-PAD (Index 12: Up, 13: Down, 14: Left, 15: Right) */}
        <g transform="translate(115, 140)">
          {/* Base Cross */}
          <rect x="-24" y="-8" width="48" height="16" rx="2" fill="#e4e4e7" stroke="#d4d4d8" strokeWidth="1" />
          <rect x="-8" y="-24" width="16" height="48" rx="2" fill="#e4e4e7" stroke="#d4d4d8" strokeWidth="1" />

          {/* Up */}
          <rect x="-6" y="-22" width="12" height="12" rx="2" fill={isDown(12) ? '#7c3aed' : '#d4d4d8'} />
          {/* Down */}
          <rect x="-6" y="10" width="12" height="12" rx="2" fill={isDown(13) ? '#7c3aed' : '#d4d4d8'} />
          {/* Left */}
          <rect x="-22" y="-6" width="12" height="12" rx="2" fill={isDown(14) ? '#7c3aed' : '#d4d4d8'} />
          {/* Right */}
          <rect x="10" y="-6" width="12" height="12" rx="2" fill={isDown(15) ? '#7c3aed' : '#d4d4d8'} />
        </g>

        {/* FACE BUTTONS (Index 0: A, 1: B, 2: X, 3: Y) */}
        <g transform="translate(285, 105)">
          {/* A (Bottom - Index 0) */}
          <circle cx="0" cy="22" r="10" fill={isDown(0) ? '#10b981' : '#ffffff'} stroke="#a1a1aa" strokeWidth="1.5" />
          <text x="0" y="25.5" fontSize="10" fontWeight="bold" fill={isDown(0) ? '#ffffff' : '#18181b'} textAnchor="middle">A</text>

          {/* B (Right - Index 1) */}
          <circle cx="22" cy="0" r="10" fill={isDown(1) ? '#ef4444' : '#ffffff'} stroke="#a1a1aa" strokeWidth="1.5" />
          <text x="22" y="3.5" fontSize="10" fontWeight="bold" fill={isDown(1) ? '#ffffff' : '#18181b'} textAnchor="middle">B</text>

          {/* X (Left - Index 2) */}
          <circle cx="-22" cy="0" r="10" fill={isDown(2) ? '#3b82f6' : '#ffffff'} stroke="#a1a1aa" strokeWidth="1.5" />
          <text x="-22" y="3.5" fontSize="10" fontWeight="bold" fill={isDown(2) ? '#ffffff' : '#18181b'} textAnchor="middle">X</text>

          {/* Y (Top - Index 3) */}
          <circle cx="0" cy="-22" r="10" fill={isDown(3) ? '#f59e0b' : '#ffffff'} stroke="#a1a1aa" strokeWidth="1.5" />
          <text x="0" y="-18.5" fontSize="10" fontWeight="bold" fill={isDown(3) ? '#ffffff' : '#18181b'} textAnchor="middle">Y</text>
        </g>

        {/* LEFT STICK (LX: Axes 0, LY: Axes 1, L3: Button 10) */}
        <g transform="translate(125, 95)">
          {/* Base Rim */}
          <circle cx="0" cy="0" r="24" fill="#ffffff" stroke="#d4d4d8" strokeWidth="2" />
          {/* Moving Thumbstick Cap */}
          <circle
            cx={lx * 14}
            cy={ly * 14}
            r="16"
            fill={isDown(10) ? '#7c3aed' : '#52525b'}
            stroke="#27272a"
            strokeWidth="2"
            className="transition-transform duration-75"
          />
          <circle cx={lx * 14} cy={ly * 14} r="5" fill="#3f3f46" />
        </g>

        {/* RIGHT STICK (RX: Axes 2, RY: Axes 3, R3: Button 11) */}
        <g transform="translate(250, 150)">
          {/* Base Rim */}
          <circle cx="0" cy="0" r="24" fill="#ffffff" stroke="#d4d4d8" strokeWidth="2" />
          {/* Moving Thumbstick Cap */}
          <circle
            cx={rx * 14}
            cy={ry * 14}
            r="16"
            fill={isDown(11) ? '#7c3aed' : '#52525b'}
            stroke="#27272a"
            strokeWidth="2"
            className="transition-transform duration-75"
          />
          <circle cx={rx * 14} cy={ry * 14} r="5" fill="#3f3f46" />
        </g>

        {/* CENTER BUTTONS (Back: 8, Start: 9, Guide/Home: 16) */}
        <g transform="translate(200, 105)">
          {/* Home/Guide */}
          <circle cx="0" cy="-10" r="12" fill={isDown(16) ? '#7c3aed' : '#ffffff'} stroke="#a1a1aa" strokeWidth="1.5" />
          <text x="0" y="-6.5" fontSize="8" fontWeight="bold" fill={isDown(16) ? '#ffffff' : '#71717a'} textAnchor="middle">EVO</text>

          {/* Back/Select (8) */}
          <rect x="-30" y="-8" width="12" height="6" rx="2" fill={isDown(8) ? '#7c3aed' : '#d4d4d8'} />
          {/* Start (9) */}
          <rect x="18" y="-8" width="12" height="6" rx="2" fill={isDown(9) ? '#7c3aed' : '#d4d4d8'} />
        </g>
      </svg>

      {/* Trigger floating gauges */}
      <div className="absolute top-2 left-6 flex items-center gap-1.5 text-[10px] font-mono text-zinc-500">
        <span>LT:</span>
        <div className="w-12 h-2 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200">
          <div className="h-full bg-violet-600 transition-all" style={{ width: `${Math.round(ltVal * 100)}%` }} />
        </div>
      </div>

      <div className="absolute top-2 right-6 flex items-center gap-1.5 text-[10px] font-mono text-zinc-500">
        <span>RT:</span>
        <div className="w-12 h-2 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200">
          <div className="h-full bg-violet-600 transition-all" style={{ width: `${Math.round(rtVal * 100)}%` }} />
        </div>
      </div>
    </div>
  );
};
