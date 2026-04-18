'use client';

import React, { useEffect, useState } from 'react';
import type { EpgLookupResult } from '@/types';

type Props = {
  channelId?: string;
  compact?: boolean;
};

export default function EpgStrip({ channelId, compact = false }: Props) {
  const [data, setData] = useState<EpgLookupResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!channelId) {
      setData(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    fetch(`/api/epg/${encodeURIComponent(channelId)}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((d: EpgLookupResult) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    return () => controller.abort();
  }, [channelId]);

  if (!channelId) return null;
  if (loading)
    return (
      <div
        className={`rounded-xl border border-white/[0.06] bg-white/[0.03] ${compact ? 'p-2' : 'p-3'} animate-pulse`}
      >
        <div className="flex gap-3">
          {compact && <div className="h-10 w-16 shrink-0 rounded-lg bg-white/5" />}
          <div className="flex-1 space-y-2">
            <div className="h-3 w-32 rounded bg-white/10" />
            <div className="h-2 w-24 rounded bg-white/5" />
          </div>
        </div>
      </div>
    );
  if (!data?.found || (!data.now && !data.next)) return null;

  return (
    <div
      className={`rounded-2xl border border-white/[0.06] bg-white/[0.03] overflow-hidden ${compact ? 'p-2.5 text-xs' : 'p-4 text-sm'} backdrop-blur-md transition-all`}
    >
      {data.now && (
        <div className="flex items-start gap-4">
          import Image from 'next/image'; ...
          {data.now.image && (
            <div className="hidden sm:block relative shrink-0 aspect-video h-14 rounded-lg overflow-hidden border border-white/10 shadow-lg">
              <Image
                src={data.now.image}
                alt={data.now.title}
                width={100}
                height={56}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>
          )}
          ...
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="shrink-0 rounded-full bg-red-500/80 px-2 py-0.5 text-[9px] font-bold text-white shadow-sm animate-pulse">
                LIVE NOW
              </span>
              {data.now.category && (
                <span className="truncate text-[9px] font-bold uppercase tracking-wider text-slate-500">
                  {data.now.category}
                </span>
              )}
            </div>
            <div className="font-bold text-white truncate leading-tight">{data.now.title}</div>
            {data.now.desc && !compact && (
              <div className="mt-1 text-slate-400 text-xs line-clamp-2 leading-relaxed opacity-80">
                {data.now.desc}
              </div>
            )}
          </div>
        </div>
      )}
      {data.next && (
        <div
          className={`flex items-start gap-3 ${data.now ? 'mt-3 pt-3 border-t border-white/[0.06]' : ''}`}
        >
          <span className="mt-0.5 shrink-0 rounded-full bg-slate-700/50 px-1.5 py-0.5 text-[9px] font-bold text-slate-400 uppercase tracking-tight">
            COMING UP
          </span>
          <div className="min-w-0">
            <div className="font-medium text-slate-300 truncate leading-tight">
              {data.next.title}
            </div>
            {data.next.category && (
              <div className="text-[9px] font-medium text-slate-600 uppercase mt-0.5">
                {data.next.category}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
