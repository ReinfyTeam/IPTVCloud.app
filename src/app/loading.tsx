'use client';

import React from 'react';

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-3xl overflow-hidden">
      {/* Background Pulse Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[120px] animate-pulse" />
      </div>

      <div className="relative flex flex-col items-center space-y-12">
        {/* Futuristic Holographic Ring Loader */}
        <div className="relative h-32 w-32">
          {/* Outer Ring */}
          <div className="absolute inset-0 rounded-full border-[1px] border-white/5 shadow-[inset_0_0_20px_rgba(255,255,255,0.02)]" />

          {/* Spinning Cyan Arc */}
          <div className="absolute inset-0 rounded-full border-t-2 border-l-2 border-cyan-500/80 shadow-[0_0_30px_rgba(6,182,212,0.3)] animate-spin duration-1000" />

          {/* Reverse Spinning Violet Arc */}
          <div className="absolute inset-4 rounded-full border-b-2 border-r-2 border-violet-500/60 shadow-[0_0_25px_rgba(139,92,246,0.2)] animate-spin-reverse duration-[1500ms]" />

          {/* Inner Glow Core */}
          <div className="absolute inset-10 rounded-full bg-gradient-to-tr from-cyan-500/20 to-violet-500/20 blur-md animate-pulse" />

          <div className="absolute inset-0 flex items-center justify-center">
            <span className="material-icons text-cyan-400 text-3xl animate-pulse">sensors</span>
          </div>
        </div>

        <div className="space-y-3 text-center">
          <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-none">
            Synchronizing<span className="text-cyan-500">.</span>
          </h2>
          <div className="flex items-center justify-center gap-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-1 w-4 rounded-full bg-cyan-500/20 overflow-hidden relative">
                <div
                  className="absolute inset-0 bg-cyan-500 animate-loading-bar"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              </div>
            ))}
          </div>
          <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.4em] mt-4">
            Establishing Secure Signal
          </p>
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin-reverse {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(-360deg);
          }
        }
        .animate-spin-reverse {
          animation: spin-reverse linear infinite;
        }
        @keyframes loading-bar {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-loading-bar {
          animation: loading-bar 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
