'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { BRAND_NAME } from '@/components/Brand';

export default function InfoPage({ title, content }: { title: string; content: string }) {
  return (
    <div className="min-h-screen pt-32 pb-20 px-4 sm:px-6 bg-background">
      <div className="mx-auto max-w-3xl space-y-8 sm:space-y-12 animate-fade-in transform-gpu">
        <div className="space-y-4 px-2">
          <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-foreground-muted mb-2">
            Legal Documentation
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-foreground tracking-tighter uppercase italic leading-none">
            {title}
            <span className="text-cyan-500">.</span>
          </h1>
        </div>

        <div className="prose dark:prose-invert prose-slate prose-cyan max-w-none p-6 sm:p-10 rounded-[32px] sm:rounded-[48px] bg-white/[0.02] dark:bg-black/[0.02] border border-border shadow-2xl backdrop-blur-xl">
          <div className="text-foreground-muted text-sm sm:text-base font-medium leading-relaxed prose-headings:font-black prose-headings:uppercase prose-headings:italic prose-headings:tracking-tighter prose-a:text-cyan-400 prose-strong:text-foreground">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>

          <div className="mt-12 sm:mt-16 pt-6 sm:pt-8 border-t border-border flex items-center justify-between">
            <p className="text-[9px] sm:text-[10px] font-black text-foreground-muted/60 uppercase tracking-widest">
              © {new Date().getFullYear()} {BRAND_NAME} Community
            </p>
            <div className="h-1.5 w-1.5 rounded-full bg-cyan-500/20" />
          </div>
        </div>
      </div>
    </div>
  );
}
