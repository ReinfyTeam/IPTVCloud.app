import React, { Suspense } from 'react';

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-slate-950 text-cyan-400">
          <span className="material-icons animate-spin text-4xl">autorenew</span>
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
