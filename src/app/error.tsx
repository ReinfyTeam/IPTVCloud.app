'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application Error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 pt-32 pb-20 bg-slate-950">
      <div className="w-full max-w-md animate-fade-up text-center space-y-8">
        <div className="relative inline-block">
          <div className="text-9xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-red-400 to-red-600 opacity-20 italic">
            500
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="material-icons text-6xl text-red-500">error_outline</span>
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-3xl sm:text-4xl font-black text-white uppercase italic tracking-tighter">
            System Failure<span className="text-red-500">.</span>
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-xs mx-auto leading-relaxed font-medium">
            An unexpected error has disrupted the signal. Our technicians are currently
            investigating the cause.
          </p>
        </div>

        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-3 rounded-2xl bg-white/5 border border-white/10 px-10 py-4 text-xs font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all active:scale-95"
        >
          <span className="material-icons text-lg">refresh</span>
          Re-synchronize
        </button>
      </div>
    </div>
  );
}
