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
    <div className="flex min-h-[80vh] items-center justify-center px-4 pt-16">
      <div className="w-full max-w-md animate-fade-up text-center">
        <div className="text-9xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-red-400 to-red-600 opacity-80 mb-4">
          500
        </div>
        <h1 className="text-3xl font-bold text-white mb-4">Something went wrong</h1>
        <p className="text-slate-400 mb-8 max-w-sm mx-auto">
          An unexpected server error occurred. Our engineers have been notified and are working to
          resolve the issue.
        </p>
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-md px-8 py-3.5 text-sm font-semibold text-white hover:bg-white/20 transition-all"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Try again
        </button>
      </div>
    </div>
  );
}
