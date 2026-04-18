import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getChannelById, getEpgUrl } from '@/services/channel-service';
import { fetchEpgForId } from '@/services/epg-service';
import Link from 'next/link';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const channel = await getChannelById(decodeURIComponent(params.id));
  if (!channel) return { title: 'EPG Not Found' };
  return { title: `Schedule: ${channel.name} — IPTVCloud.app` };
}

export default async function EpgPage({ params }: { params: { id: string } }) {
  const channel = await getChannelById(decodeURIComponent(params.id));
  if (!channel || !channel.epgId) notFound();

  const preferredEpgUrl = await getEpgUrl();
  const epg = await fetchEpgForId(channel.epgId, preferredEpgUrl);
  if (!epg.found) notFound();

  const schedule = epg.schedule || [];

  return (
    <div className="pt-24 pb-20 px-4 sm:px-6 min-h-screen">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center gap-6 mb-12 animate-fade-in">
          <Link href={`/channel/${encodeURIComponent(channel.id)}`} className="group shrink-0">
            <div className="h-20 w-24 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center overflow-hidden p-2 group-hover:border-cyan-500/50 transition-colors shadow-lg">
              {channel.logo ? (
                <img src={channel.logo} alt="" className="h-full w-full object-contain" />
              ) : (
                <span className="text-2xl font-bold text-slate-700">{channel.name[0]}</span>
              )}
            </div>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{channel.name} Schedule</h1>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span className="uppercase tracking-widest font-bold text-[10px] text-cyan-400">
                {channel.category}
              </span>
              <span>•</span>
              <span>{channel.language}</span>
              <span>•</span>
              <Link
                href={`/channel/${encodeURIComponent(channel.id)}`}
                className="text-white hover:underline"
              >
                Watch Live →
              </Link>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {schedule.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 p-20 text-center text-slate-500">
              No schedule data available for this channel.
            </div>
          ) : (
            schedule.map((prog, idx) => {
              const start = prog.start ? new Date(prog.start) : null;
              const stop = prog.stop ? new Date(prog.stop) : null;
              const isNow = start && stop && start <= new Date() && new Date() < stop;

              return (
                <div
                  key={idx}
                  className={`relative flex gap-6 p-6 rounded-3xl border transition-all duration-300 animate-fade-up ${isNow ? 'bg-cyan-500/10 border-cyan-500/30 shadow-xl shadow-cyan-950/20' : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'}`}
                >
                  {isNow && (
                    <div className="absolute left-0 top-6 bottom-6 w-1 bg-cyan-500 rounded-r-full" />
                  )}

                  <div className="shrink-0 w-20 pt-1 text-right">
                    <div className="text-sm font-bold text-white">
                      {start?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="text-[10px] font-medium text-slate-500 mt-1 uppercase">
                      {start?.toLocaleDateString([], { weekday: 'short' })}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-white truncate">{prog.title}</h3>
                      {isNow && (
                        <span className="rounded-full bg-red-500 px-2 py-0.5 text-[9px] font-bold text-white animate-pulse">
                          LIVE
                        </span>
                      )}
                      {prog.category && (
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          {prog.category}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-400 line-clamp-3 leading-relaxed mb-4">
                      {prog.desc}
                    </p>

                    {prog.image && (
                      <div className="aspect-video w-full max-w-sm rounded-2xl overflow-hidden border border-white/10 shadow-lg mb-2">
                        <img
                          src={prog.image}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
