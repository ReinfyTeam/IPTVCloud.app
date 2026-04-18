import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getChannelById, getEpgUrl } from '@/services/channel-service';
import { fetchEpgForId } from '@/services/epg-service';
import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getChannelById } from '@/services/channel-service';
import { getEpgData } from '@/services/epg-service';
import EpgStrip from '@/components/EpgStrip';

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
