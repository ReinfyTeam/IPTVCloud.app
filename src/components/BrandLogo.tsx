'use client';

import React from 'react';

export default function BrandLogo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center font-black tracking-tighter uppercase italic ${className}`}>
      <span className="text-foreground">IPTVCloud</span>
      <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-sky-400">
        .
      </span>
      <span className="text-foreground">app</span>
    </div>
  );
}
