'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import Link from 'next/link';
import Image from 'next/image';
import type { Channel } from '@/types';

type CustomChannel = Channel & {
  is_submitted: boolean;
  is_approved: boolean;
};

export default function CustomChannelsPage() {
  const { user, token } = useAuthStore();
  const [channels, setChannels] = useState<CustomChannel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchChannels() {
      if (!token) return;
      try {
        const res = await fetch('/api/custom-channels', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setChannels(data);
        }
      } catch (error) {
        console.error('Failed to fetch custom channels', error);
      } finally {
        setLoading(false);
      }
    }
    fetchChannels();
  }, [token]);

  const getStatus = (channel: CustomChannel) => {
    if (channel.is_approved) {
      return <span className="text-green-400">Approved</span>;
    }
    if (channel.is_submitted) {
      return <span className="text-yellow-400">Pending Review</span>;
    }
    return <span className="text-slate-400">Private</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-white">Loading your channels...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-20 px-4 sm:px-6 bg-slate-950">
      <div className="mx-auto max-w-4xl space-y-12">
        <div className="space-y-4 text-center">
          <h1 className="text-5xl font-black text-white uppercase italic tracking-tighter leading-none">
            My Custom Channels<span className="text-cyan-500">.</span>
          </h1>
          <p className="text-slate-400 text-sm font-medium max-w-lg mx-auto leading-relaxed">
            Here are the channels you have created. You can play them directly, edit them, or submit
            them for public review.
          </p>
        </div>

        {channels.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-400">You haven&apos;t created any channels yet.</p>
            <Link
              href="/channel/create"
              className="mt-4 inline-block px-6 py-3 rounded-xl bg-cyan-500 text-slate-950 font-bold"
            >
              Create a Channel
            </Link>
          </div>
        ) : (
          <div className="grid gap-6">
            {channels.map((channel) => (
              <div
                key={channel.id}
                className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5"
              >
                <Link href={`/channel/${channel.id}`}>
                  {channel.logo ? (
                    <Image
                      src={channel.logo}
                      alt={channel.name}
                      width={64}
                      height={64}
                      className="rounded-lg object-cover h-16 w-16"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500">
                      <span className="material-icons">tv</span>
                    </div>
                  )}
                </Link>
                <div className="flex-1">
                  <Link href={`/channel/${channel.id}`}>
                    <h3 className="font-bold text-white">{channel.name}</h3>
                  </Link>
                  <p className="text-sm text-slate-400">
                    {channel.category} &middot; {getStatus(channel)}
                  </p>
                </div>
                <Link
                  href={`/channel/${channel.id}`}
                  className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-bold text-sm"
                >
                  Play
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
