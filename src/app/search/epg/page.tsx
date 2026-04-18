'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';

type Channel = {
  id: string;
  name: string;
  logo?: string;
  category: string;
};

export default function SearchEpgPage() {
  const searchParams = useSearchParams();
  const q = (searchParams.get('q') || '').toLowerCase();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/channels')
      .then((res) => res.json())
      .then((data) => {
        if (data.channels) {
          const filtered = data.channels.filter((c: Channel) => c.name.toLowerCase().includes(q));
          setChannels(filtered);
        }
      })
      .finally(() => setLoading(false));
  }, [q]);

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 bg-slate-950">
      <div className="mx-auto max-w-4xl space-y-12">
        <div className="space-y-4">
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 px-1">
            Schedule Discovery
          </div>
          <h1 className="text-5xl font-black text-white uppercase italic tracking-tighter leading-none">
            Find Guides<span className="text-cyan-500">.</span>
          </h1>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {channels.map((ch) => (
            <Link
              key={ch.id}
              href={`/epg/${ch.id}`}
              className="p-5 rounded-[32px] border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] transition-all flex items-center gap-4 shadow-xl active:scale-[0.98]"
            >
              <div className="h-12 w-12 rounded-2xl bg-slate-900 border border-white/5 flex items-center justify-center p-2 shrink-0">
                {ch.logo ? (
                  <Image
                    src={ch.logo}
                    alt=""
                    width={32}
                    height={32}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="text-lg font-black text-slate-700 uppercase italic">
                    {ch.name[0]}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-black text-white truncate uppercase italic tracking-tighter">
                  {ch.name}
                </div>
                <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-0.5">
                  {ch.category}
                </div>
              </div>
              <span className="material-icons text-slate-700">event_note</span>
            </Link>
          ))}
          {channels.length === 0 && !loading && (
            <div className="p-32 text-center text-slate-600 font-bold uppercase tracking-widest text-xs border border-dashed border-white/10 rounded-[40px] col-span-full">
              No matching channel guides found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
