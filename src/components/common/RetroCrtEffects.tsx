import React, { useEffect, useState } from 'react';

interface RetroCrtEffectsProps {
  crtEnabled: boolean;
}

export const RetroCrtEffects: React.FC<RetroCrtEffectsProps> = ({ crtEnabled }) => {
  const [clickSparks, setClickSparks] = useState<Array<{ id: number; x: number; y: number }>>([]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const spark = {
        id: Date.now() + Math.random(),
        x: e.clientX,
        y: e.clientY,
      };
      setClickSparks((prev) => [...prev.slice(-8), spark]);
      setTimeout(() => {
        setClickSparks((prev) => prev.filter((s) => s.id !== spark.id));
      }, 450);
    };

    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  return (
    <>
      {/* Global CRT Scanlines & Vignette */}
      {crtEnabled && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {/* Scanline Raster */}
          <div className="absolute inset-0 crt-scanlines opacity-40 mix-blend-overlay" />
          {/* Subtle Radial Cathode Vignette */}
          <div className="absolute inset-0 crt-vignette opacity-60" />
          {/* Phosphor Glow Edge Frame */}
          <div className="absolute inset-0 border border-emerald-500/10 shadow-[inset_0_0_80px_rgba(34,197,94,0.06)]" />
        </div>
      )}

      {/* 8-Bit Pixel Click Sparks */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {clickSparks.map((spark) => (
          <div
            key={spark.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ left: spark.x, top: spark.y }}
          >
            <div className="w-1.5 h-1.5 bg-emerald-400 absolute top-0 left-1 animate-ping" />
            <div className="w-1.5 h-1.5 bg-amber-400 absolute bottom-0 right-1 animate-ping" />
            <div className="w-1 h-1 bg-cyan-400 absolute top-1 right-0 animate-ping" />
          </div>
        ))}
      </div>
    </>
  );
};
