import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getChannelById, getEpgUrl } from '@/services/channel-service';
import { fetchEpgForId } from '@/services/epg-service';
import Link from 'next/link';
import Image from 'next/image';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
...
          <Link href={`/channel/${encodeURIComponent(channel.id)}`} className="group shrink-0">
            <div className="h-20 w-24 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center overflow-hidden p-2 group-hover:border-cyan-500/50 transition-colors shadow-lg">
              {channel.logo ? (
                <Image src={channel.logo} alt="" width={96} height={80} className="h-full w-full object-contain" />
              ) : (
                <span className="text-2xl font-bold text-slate-700">{channel.name[0]}</span>
              )}
            </div>
          </Link>
...
                    {prog.image && (
                      <div className="aspect-video w-full max-w-sm rounded-2xl overflow-hidden border border-white/10 shadow-lg mb-2">
                        <Image
                          src={prog.image}
                          alt=""
                          width={384}
                          height={216}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
...
