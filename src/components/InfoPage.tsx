'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BRAND_NAME } from '@/components/Brand';

export default function InfoPage({ title, content }: { title: string; content: string }) {
  return (
    <div className="min-h-screen pt-32 pb-20 px-4 sm:px-6 bg-background">
      <div className="mx-auto max-w-4xl space-y-10 sm:space-y-16 animate-fade-in transform-gpu">
        <div className="space-y-4 px-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse shadow-accent" />
            <div className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.4em] text-foreground-muted">
              Network Protocol
            </div>
          </div>
          <h1 className="text-4xl sm:text-7xl font-black text-foreground tracking-tighter uppercase italic leading-none">
            {title}
            <span className="text-accent">.</span>
          </h1>
        </div>

        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-br from-accent/20 to-transparent blur-3xl opacity-20" />
          <div className="relative p-8 sm:p-16 rounded-[48px] bg-background-elevated/40 border border-border shadow-2xl backdrop-blur-2xl overflow-hidden">
            <div
              className="prose prose-slate dark:prose-invert prose-cyan max-w-none 
              prose-headings:font-black prose-headings:uppercase prose-headings:italic prose-headings:tracking-tighter prose-headings:text-foreground
              prose-p:text-foreground-muted prose-p:leading-relaxed prose-p:font-medium
              prose-strong:text-foreground prose-strong:font-black
              prose-ul:list-disc prose-ul:ml-6 prose-ol:list-decimal prose-ol:ml-6
              prose-li:text-foreground-muted prose-li:font-medium prose-li:my-2
              prose-a:text-accent prose-a:font-black prose-a:no-underline hover:prose-a:underline
              prose-hr:border-border prose-hr:my-10"
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>

            <div className="mt-16 sm:mt-24 pt-8 sm:pt-12 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-2xl bg-foreground/5 border border-border flex items-center justify-center text-foreground-muted">
                  <span className="material-icons text-xl">verified_user</span>
                </div>
                <p className="text-[10px] font-black text-foreground-muted/60 uppercase tracking-widest leading-relaxed">
                  Legally verified and community approved
                  <br />© {new Date().getFullYear()} {BRAND_NAME}
                </p>
              </div>
              <div className="px-6 py-2.5 rounded-full bg-accent/10 border border-accent/20 text-[9px] font-black text-accent uppercase tracking-[0.2em]">
                Encryption Active
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
