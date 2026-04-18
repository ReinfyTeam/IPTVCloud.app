import React from 'react';
import { getChannels } from '@/services/channel-service';
import Link from 'next/link';
import Image from 'next/image';
import { REVERSE_COUNTRY_MAP } from '@/lib/countries';
import BrandLogo from '@/components/BrandLogo';

export default async function EpgListPage() {
  const dataset = await getChannels();
  const sortedChannels = [...dataset.channels].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 bg-slate-950">
      <div className="mx-auto max-w-[1460px] space-y-12">
        <div className="flex flex-col md:flex-row items-end justify-between gap-8 p-12 rounded-[48px] bg-white/[0.02] border border-white/5 relative overflow-hidden shadow-2xl backdrop-blur-xl">
          <div className="absolute top-0 right-0 h-64 w-64 bg-cyan-500/5 blur-[100px] rounded-full" />
          <div className="space-y-4 relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-black text-cyan-400 uppercase tracking-widest">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Live Electronic Program Guide
            </div>
            <h1 className="text-5xl font-black text-white tracking-tighter uppercase italic leading-none">
              TV Schedule<span className="text-cyan-500">.</span>
            </h1>
            <p className="text-slate-400 text-sm font-medium max-w-lg leading-relaxed">
              Browse the complete schedule for all available premium channels. High-precision guide
              data updated every hour.
            </p>
          </div>
          <div className="hidden md:block relative z-10">
            <BrandLogo className="text-4xl opacity-20" />
          </div>
        </div>

        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {sortedChannels.map((ch) => (
            <Link
              key={ch.id}
              href={`/epg/${encodeURIComponent(ch.id)}`}
              className="group p-6 rounded-[32px] bg-white/[0.02] border border-white/[0.08] hover:border-cyan-500/50 hover:bg-cyan-500/[0.03] transition-all transform-gpu hover:-translate-y-1 shadow-xl"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="h-14 w-14 rounded-2xl bg-slate-900 border border-white/5 flex items-center justify-center p-2 shadow-lg group-hover:scale-110 transition-transform">
                  {ch.logo ? (
                    <Image
                      src={ch.logo}
                      alt=""
                      width={48}
                      height={48}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span className="text-xl font-black text-slate-700 uppercase italic">
                      {ch.name[0]}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-black text-white truncate group-hover:text-cyan-400 transition-colors uppercase italic tracking-tighter">
                    {ch.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    {ch.country && REVERSE_COUNTRY_MAP[ch.country.toUpperCase()] && (
                      <div className="h-3 w-4 rounded-sm overflow-hidden border border-white/10 shrink-0">
                        <Image
                          src={`https://flagcdn.com/w20/${REVERSE_COUNTRY_MAP[ch.country.toUpperCase()]}.png`}
                          alt=""
                          width={20}
                          height={15}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest truncate">
                      {ch.category}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/[0.04]">
                <div className="text-[9px] font-black text-cyan-500 uppercase tracking-widest opacity-60">
                  View Schedule
                </div>
                <span className="material-icons text-sm text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all">
                  east
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
