'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) setShow(true);
  }, []);

  const accept = () => {
    localStorage.setItem('cookie-consent', 'true');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-8 left-4 right-4 sm:left-auto sm:right-8 sm:w-[400px] z-[100] animate-fade-up">
      <div className="p-8 rounded-[36px] bg-slate-900/90 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
            <span className="material-icons">cookie</span>
          </div>
          <h3 className="text-lg font-bold text-white uppercase italic tracking-tighter">
            Cookie Policy.
          </h3>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed font-medium">
          We use essential cookies to provide our technical media player services and analyze site
          traffic. By continuing to use IPTVCloud.app, you agree to our
          <Link href="/privacy" className="text-cyan-400 hover:underline mx-1">
            Privacy Policy
          </Link>
          .
        </p>

        <div className="flex gap-3">
          <button
            onClick={accept}
            className="flex-1 py-4 rounded-2xl bg-cyan-500 text-slate-950 font-black text-[10px] uppercase tracking-widest hover:bg-cyan-400 transition-all active:scale-95 shadow-lg shadow-cyan-900/20"
          >
            I Accept
          </button>
          <button
            onClick={() => setShow(false)}
            className="px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-slate-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}
