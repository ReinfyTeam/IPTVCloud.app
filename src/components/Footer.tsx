'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Footer() {
  const [commit, setCommit] = useState<{ sha: string; url: string; date: string } | null>(null);

  useEffect(() => {
    fetch('/api/github/commit')
      .then((res) => res.json())
      .then((data) => {
        if (data.sha) setCommit(data);
      })
      .catch(() => {});
  }, []);

  return (
    <footer className="border-t border-white/[0.06] bg-slate-950/80 backdrop-blur-xl py-20 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />

      <div className="mx-auto max-w-[1460px] px-6 sm:px-8 grid gap-16 lg:grid-cols-4">
        import {BRAND_NAME} from './Brand'; ...
        <div className="lg:col-span-2 space-y-8">
          <div className="text-2xl font-black tracking-tighter text-white uppercase italic">
            {BRAND_NAME}
          </div>
          <p className="text-slate-500 text-sm max-w-sm leading-relaxed font-medium">
            The next generation of television streaming. Advanced, private, and community-driven.
            Built for the modern web with performance at its core.
          </p>
          <div className="flex items-center gap-5">
            <SocialLink href="https://facebook.com/ReinfyTeam" icon="facebook" />
            <SocialLink href="https://twitter.com/ReinfyTeam" icon="X" isX />
            <SocialLink href="https://github.com/ReinfyTeam/IPTVCloud.app" icon="github" isGithub />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-10">
          <div className="space-y-6">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white opacity-40">
              Platform
            </h4>
            <ul className="space-y-4 text-xs font-bold text-slate-400">
              <li>
                <Link href="/search" className="hover:text-cyan-400 transition-colors">
                  Browse Library
                </Link>
              </li>
              <li>
                <Link href="/status" className="hover:text-cyan-400 transition-colors">
                  System Status
                </Link>
              </li>
              <li>
                <Link href="/account/signin" className="hover:text-cyan-400 transition-colors">
                  Get Started
                </Link>
              </li>
              <li>
                <Link href="/forbidden" className="hover:text-cyan-400 transition-colors">
                  Support
                </Link>
              </li>
            </ul>
          </div>
          <div className="space-y-6">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white opacity-40">
              Legal
            </h4>
            <ul className="space-y-4 text-xs font-bold text-slate-400">
              <li>
                <Link href="/privacy" className="hover:text-cyan-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/tos" className="hover:text-cyan-400 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/dmca" className="hover:text-cyan-400 transition-colors">
                  DMCA Disclaimer
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="space-y-8">
          <div className="space-y-2">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white opacity-40">
              Latest Build
            </h4>
            <div className="flex items-center gap-3">
              {commit ? (
                <a
                  href={commit.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 font-mono text-[10px] text-cyan-400 hover:bg-white/10 transition-all active:scale-95"
                >
                  {commit.sha.slice(0, 7)}
                </a>
              ) : (
                <div className="h-6 w-20 bg-white/5 animate-pulse rounded-lg" />
              )}
              {commit && (
                <span className="text-[9px] font-bold text-slate-600 uppercase">
                  {new Date(commit.date).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 space-y-2">
            <div className="text-[9px] font-black text-cyan-500 uppercase tracking-widest">
              Disclaimer
            </div>
            <p className="text-[9px] leading-relaxed text-slate-600 font-medium italic">
              IPTVCloud.app is a technical player and does not host, provide or distribute any media
              content. All streams are sourced from public M3U repositories.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1460px] px-8 mt-20 pt-8 border-t border-white/[0.03] flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
          © {new Date().getFullYear()} ReinfyTeam. All rights reserved.
        </p>
        <div className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase tracking-tighter">
          <span>Powered by</span>
          <span className="text-white">Vercel Edge</span>
          <span className="h-1 w-1 rounded-full bg-slate-800" />
          <span className="text-white">Next.js 14</span>
        </div>
      </div>
    </footer>
  );
}

function SocialLink({
  href,
  icon,
  isX,
  isGithub,
}: {
  href: string;
  icon: string;
  isX?: boolean;
  isGithub?: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="h-10 w-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 hover:-translate-y-1 transition-all active:scale-90"
    >
      {isX ? (
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ) : isGithub ? (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.042-1.416-4.042-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.241-1.304.408-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
        </svg>
      ) : (
        <span className="material-icons text-xl">{icon}</span>
      )}
    </a>
  );
}
