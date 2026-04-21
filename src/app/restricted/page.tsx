import React from 'react';
import Link from 'next/link';

export default function RestrictedPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full space-y-8 animate-fade-in">
        <div className="space-y-4">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-red-500/10 border border-red-500/20 mb-4">
            <span className="material-icons text-red-500 text-4xl">block</span>
          </div>
          <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">
            Account Restricted<span className="text-red-500">.</span>
          </h1>
          <p className="text-slate-400 text-sm font-medium leading-relaxed">
            Your access to IPTVCloud.app has been restricted due to a violation of our Terms of
            Service or community guidelines.
          </p>
        </div>

        <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-8 space-y-6">
          <div className="space-y-2">
            <h3 className="text-xs font-black text-white uppercase tracking-widest">
              What does this mean?
            </h3>
            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
              Restricted accounts cannot watch streams, create posts, participate in group chats, or
              create custom channels.
            </p>
          </div>

          <div className="space-y-4">
            <Link
              href="/support"
              className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-white/10 text-white font-black text-[10px] uppercase tracking-widest hover:bg-white/20 transition-all active:scale-95"
            >
              <span className="material-icons text-sm">mail</span>
              Appeal Restriction
            </Link>
            <Link
              href="/tos"
              className="block text-[9px] font-black text-slate-600 hover:text-slate-400 uppercase tracking-widest transition-colors"
            >
              Review Terms of Service
            </Link>
          </div>
        </div>

        <div className="pt-8">
          <Link
            href="/api/auth/signout"
            className="px-8 py-3 rounded-full border border-white/10 text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-white hover:border-white/20 transition-all"
          >
            Sign Out
          </Link>
        </div>
      </div>
    </div>
  );
}
