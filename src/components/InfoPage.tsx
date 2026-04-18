'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { BRAND_NAME } from '@/components/Brand';

export default function InfoPage({ title, content }: { title: string; content: string }) {
  return (
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 bg-slate-950">
      <div className="mx-auto max-w-3xl space-y-12 animate-fade-in transform-gpu">
        <div className="space-y-4">
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-2 px-1">
            Legal Documentation
          </div>
          <h1 className="text-5xl font-black text-white tracking-tighter uppercase italic leading-none">
            {title}
            <span className="text-cyan-500">.</span>
          </h1>
        </div>

        <div className="prose prose-invert prose-slate prose-cyan max-w-none p-10 rounded-[48px] bg-white/[0.02] border border-white/[0.08] shadow-2xl backdrop-blur-xl">
          <div className="text-slate-300 font-medium leading-relaxed prose-headings:font-black prose-headings:uppercase prose-headings:italic prose-headings:tracking-tighter prose-a:text-cyan-400 prose-strong:text-white">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>

          <div className="mt-16 pt-8 border-t border-white/[0.06] flex items-center justify-between">
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
              © {new Date().getFullYear()} IPTVCloud Community
            </p>
            <div className="h-1.5 w-1.5 rounded-full bg-cyan-500/20" />
          </div>
        </div>
      </div>
    </div>
  );
}
