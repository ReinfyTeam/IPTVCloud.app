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
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 text-[10px] leading-tight font-bold text-white bg-slate-800 rounded-xl border border-white/10 shadow-2xl z-50 text-center animate-fade-in pointer-events-none">
          This user is verified in the IPTVCloud.app and proved identity.
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-800" />
        </div>
      )}
    </div>
  );
}
