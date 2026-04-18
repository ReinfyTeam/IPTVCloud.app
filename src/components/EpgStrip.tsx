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
    if (!channelId) { setData(null); return; }

    const controller = new AbortController();
    setLoading(true);

    fetch(`/api/epg/${encodeURIComponent(channelId)}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((d: EpgLookupResult) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));

    return () => controller.abort();
  }, [channelId]);

  if (!channelId) return null;
  if (loading) return (
    <div className={`rounded-xl border border-white/[0.06] bg-white/[0.03] ${compact ? 'p-2' : 'p-3'} animate-pulse`}>
      <div className="h-3 w-24 rounded bg-white/10" />
    </div>
  );
  if (!data?.found || (!data.now && !data.next)) return null;

  return (
    <div className={`rounded-xl border border-white/[0.06] bg-white/[0.03] ${compact ? 'p-2 text-xs' : 'p-3 text-sm'}`}>
      {data.now && (
        <div className="flex items-start gap-2">
          <span className="mt-0.5 shrink-0 rounded-full bg-red-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-red-400">NOW</span>
          <div className="min-w-0">
            <div className="font-medium text-white truncate">{data.now.title}</div>
            {data.now.desc && !compact && <div className="mt-0.5 text-slate-500 line-clamp-2">{data.now.desc}</div>}
          </div>
        </div>
      )}
      {data.next && (
        <div className={`flex items-start gap-2 ${data.now ? 'mt-2 pt-2 border-t border-white/[0.06]' : ''}`}>
          <span className="mt-0.5 shrink-0 rounded-full bg-slate-700/50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">NEXT</span>
          <div className="min-w-0 text-slate-400 truncate">{data.next.title}</div>
        </div>
      )}
    </div>
  );
}
