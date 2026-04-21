import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getChannelById } from '@/services/channel-service';
import { fetchEpgForId } from '@/services/epg-service';
import EpgStrip from '@/components/EpgStrip';
import { getProxiedImageUrl } from '@/lib/image-proxy';
import { decodeBase64Url, encodeBase64Url } from '@/lib/base64';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const channel = await getChannelById(decodeBase64Url((await params).id));
  if (!channel) return { title: 'Channel Not Found — IPTVCloud.app' };

  return {
    title: `Schedule: ${channel.name} — IPTVCloud.app`,
    description: `Electronic Program Guide for ${channel.name} on IPTVCloud.app.`,
  };
}

export default async function EpgDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const decodedId = decodeBase64Url((await params).id);
  const channel = await getChannelById(decodedId);

  if (!channel) notFound();

  const epg = await fetchEpgForId(channel.epgId || '');

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 bg-slate-950">
      <div className="mx-auto max-w-4xl space-y-12 animate-fade-in transform-gpu">
        <div className="flex flex-col md:flex-row items-center gap-8 p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 h-64 w-64 bg-cyan-500/5 blur-[100px] rounded-full" />

          <Link
            href={`/channel/${encodeBase64Url(channel.id)}`}
            className="group shrink-0 relative z-10"
          >
            <div className="h-24 w-32 rounded-3xl bg-slate-900 border border-white/10 flex items-center justify-center overflow-hidden p-4 group-hover:border-cyan-500/50 transition-all shadow-xl group-hover:scale-105 active:scale-95">
              {channel.logo ? (
                <Image
                  src={getProxiedImageUrl(channel.logo)}
                  alt={channel.name}
                  width={96}
                  height={80}
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="text-3xl font-black text-slate-700 italic uppercase tracking-tighter">
                  {channel.name[0]}
                </span>
              )}
            </div>
          </Link>

          <div className="flex-1 text-center md:text-left relative z-10 min-w-0">
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic leading-none mb-4">
              {channel.name}
            </h1>
            <div className="flex flex-wrap justify-center md:justify-start items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-black uppercase tracking-widest">
                {channel.category}
              </span>
              <span className="px-3 py-1 rounded-full bg-white/5 text-slate-400 border border-white/10 text-[10px] font-black uppercase tracking-widest">
                {channel.country}
              </span>
              <Link
                href={`/channel/${encodeBase64Url(channel.id)}`}
                className="px-6 py-2 rounded-full bg-white text-slate-950 text-[10px] font-black uppercase tracking-widest hover:bg-cyan-400 transition-all active:scale-95 ml-2"
              >
                Watch Now
              </Link>
            </div>
          </div>
        </div>

        <section className="space-y-8">
          <div className="flex items-center justify-between px-4">
            <h2 className="text-2xl font-black text-white tracking-tight uppercase italic">
              Full Schedule<span className="text-cyan-500">.</span>
            </h2>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white/5 px-4 py-1.5 rounded-full border border-white/5">
              {new Date().toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </div>
          </div>

          <div className="space-y-4">
            <EpgStrip channelId={channel.epgId} />

            {epg && epg.schedule && epg.found ? (
              <div className="grid gap-4">
                {epg.schedule.map((prog, idx) => (
                  <div
                    key={`${prog.start}-${idx}`}
                    className="group p-6 rounded-[32px] bg-white/[0.02] border border-white/[0.06] hover:border-white/10 transition-all hover:bg-white/[0.04]"
                  >
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="w-full md:w-32 shrink-0">
                        <div className="text-sm font-black text-white group-hover:text-cyan-400 transition-colors">
                          {prog.start
                            ? new Date(prog.start).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '--:--'}
                        </div>
                        <div className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter mt-1">
                          UNTIL{' '}
                          {prog.stop
                            ? new Date(prog.stop).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '--:--'}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        {prog.image && (
                          <div className="aspect-video w-full max-w-xs rounded-2xl overflow-hidden border border-white/10 shadow-lg mb-4 opacity-80 group-hover:opacity-100 transition-opacity">
                            <Image
                              src={getProxiedImageUrl(prog.image)}
                              alt=""
                              width={320}
                              height={180}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        )}
                        <h3 className="text-xl font-bold text-white mb-2 leading-tight">
                          {prog.title}
                        </h3>
                        {prog.desc && (
                          <p className="text-sm text-slate-500 leading-relaxed line-clamp-3 font-medium">
                            {prog.desc}
                          </p>
                        )}
                        {prog.category && (
                          <div className="mt-4 flex gap-2">
                            {prog.category.split(',').map((cat) => (
                              <span
                                key={cat}
                                className="text-[9px] font-black text-slate-600 uppercase tracking-widest border border-white/5 px-2 py-0.5 rounded"
                              >
                                {cat.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[40px] border border-dashed border-white/10 p-20 text-center space-y-4 bg-white/[0.01]">
                <span className="material-icons text-4xl text-slate-700">calendar_today</span>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">
                  No detailed schedule available for this channel.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
