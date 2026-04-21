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
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-4 text-[11px] leading-relaxed font-bold text-white bg-slate-950/95 border border-cyan-500/40 shadow-[0_0_50px_rgba(6,182,212,0.4)] rounded-[24px] z-[9999] text-center animate-fade-in pointer-events-none backdrop-blur-3xl">
          <div className="flex flex-col gap-2.5 items-center">
            <div className="h-10 w-10 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
              <span className="material-icons text-cyan-400 text-xl animate-pulse">verified</span>
            </div>
            <span className="tracking-[0.1em] uppercase italic text-cyan-400">
              Verified Identity
            </span>
            <p className="text-[10px] text-slate-300 font-semibold normal-case leading-relaxed">
              This user has been verified by the IPTVCloud.app staff for authenticity and community
              trust.
            </p>
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-[10px] border-transparent border-t-slate-950/95" />
        </div>
      )}
    </div>
  );
}
