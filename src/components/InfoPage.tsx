'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { BRAND_NAME } from '@/components/Brand';

export default function InfoPage({ title, content }: { title: string; content: string }) {
  return (
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-8 animate-fade-in">
        <h1 className="text-4xl font-black text-white tracking-tight">{title}</h1>
        <div className="prose prose-invert prose-slate prose-cyan max-w-none">
          <ReactMarkdown>{content}</ReactMarkdown>
          <div className="mt-12 pt-8 border-t border-white/[0.06]">
            <p className="text-sm font-bold text-slate-500">
              © {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
