'use client';

import React, { useEffect, useState } from 'react';

export default function Footer() {
  const [commit, setCommit] = useState<{ sha: string; url: string; date: string } | null>(null);

  useEffect(() => {
    fetch('/api/github/commit')
      .then(res => res.json())
      .then(data => {
        if (data.sha) setCommit(data);
      })
      .catch(() => {});
  }, []);

  return (
    <footer className="border-t border-white/[0.06] bg-slate-950 py-8 text-center text-xs text-slate-500">
      <div className="mx-auto max-w-[1460px] px-4 sm:px-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="text-left">
          <p className="font-semibold text-slate-400">IPTVCloud.app</p>
          <div className="flex items-center gap-3 mt-1 text-sm">
            <span>© {new Date().getFullYear()} ReinfyTeam.</span>
            <span className="text-slate-700">•</span>
            <a href="/status" className="text-cyan-400 hover:text-cyan-300 transition-colors">System Status</a>
          </div>
          <p className="mt-2 max-w-sm text-[10px] opacity-70">
            Disclaimer: This application is a player and does not host or distribute any media content. 
            All channels are fetched from publicly available M3U sources.
          </p>
        </div>

        <div className="flex flex-col sm:items-end text-left sm:text-right">
          <p className="font-medium text-slate-400">Project Info</p>
          <div className="mt-1 flex items-center gap-2 text-[10px]">
            <span>Latest build:</span>
            {commit ? (
              <a href={commit.url} target="_blank" rel="noopener noreferrer" className="rounded bg-white/5 px-2 py-0.5 font-mono text-cyan-400 hover:bg-white/10 transition-colors">
                {commit.sha.slice(0, 7)}
              </a>
            ) : (
              <span className="rounded bg-white/5 px-2 py-0.5 font-mono">Fetching…</span>
            )}
          </div>
          {commit && <p className="mt-1 text-[10px] opacity-70">{new Date(commit.date).toLocaleDateString()}</p>}
        </div>
      </div>
    </footer>
  );
}
