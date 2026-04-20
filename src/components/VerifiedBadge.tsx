'use client';

import React, { useState } from 'react';

export default function VerifiedBadge({ className = '' }: { className?: string }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={() => setShowTooltip(!showTooltip)}
    >
      <span className="material-icons text-[1em] text-cyan-400">verified</span>
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-56 p-4 text-[11px] leading-relaxed font-bold text-white bg-slate-950 border border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.3)] rounded-[20px] z-[100] text-center animate-fade-in pointer-events-none backdrop-blur-2xl">
          <div className="flex flex-col gap-2 items-center">
            <span className="material-icons text-cyan-400 text-lg">verified</span>
            <span className="tracking-[0.1em] uppercase italic">Verified Identity</span>
            <p className="text-[10px] text-slate-400 font-medium normal-case leading-relaxed">
              This user has been verified by the IPTVCloud.app staff for authenticity.
            </p>
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-[8px] border-transparent border-t-slate-950" />
        </div>
      )}
    </div>
  );
}
