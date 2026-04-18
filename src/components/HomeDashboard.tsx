'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { useFavoritesStore } from '@/store/favorites-store';
import { useHistoryStore } from '@/store/history-store';
import type { Channel } from '@/types';
import ChannelCard from '@/components/ChannelCard';
import HeroVideo from '@/components/HeroVideo';

export default function HomeDashboard({ allChannels }: { allChannels: Channel[] }) {
  const { isLoggedIn, user } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
       <div className="h-10 w-10 border-4 border-cyan-400/30 border-t-cyan-400 animate-spin rounded-full" />
    </div>
  );

  return isLoggedIn() ? (
    <UserHome allChannels={allChannels} user={user} />
  ) : (
    <GuestHome allChannels={allChannels} />
  );
}

function GuestHome({ allChannels }: { allChannels: Channel[] }) {
  const [randomChannel, setRandomChannel] = useState<Channel | null>(null);

  useEffect(() => {
    if (allChannels.length > 0) {
      const liveCandidates = allChannels.filter(c => c.streamUrl && c.logo && c.country === 'UNITED STATES');
      const pick = liveCandidates.length > 0 
        ? liveCandidates[Math.floor(Math.random() * liveCandidates.length)] 
        : allChannels[Math.floor(Math.random() * allChannels.length)];
      setRandomChannel(pick);
    }
  }, [allChannels]);

  const trending = useMemo(() => allChannels.filter(c => c.logo).slice(0, 12), [allChannels]);

  return (
    <div className="pt-16 pb-20 animate-fade-in transform-gpu">
      <section className="relative min-h-[700px] flex items-center border-b border-white/[0.06] overflow-hidden">
        {randomChannel && (
          <HeroVideo streamUrl={randomChannel.streamUrl} channelId={randomChannel.id} poster={randomChannel.logo} />
        )}
        <div className="relative z-10 w-full mx-auto max-w-[1460px] px-4 sm:px-6 py-20 text-center lg:text-left">
           <div className="max-w-3xl">
             <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/[0.1] px-3 py-1.5 text-xs font-bold text-cyan-300 mb-6 shadow-lg backdrop-blur-md">
               <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
               Join the Revolution
             </div>
             <h1 className="text-5xl sm:text-8xl font-bold tracking-tighter text-white leading-[0.9] mb-8">
               Watch TV<br />
               <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-500">Live & Free.</span>
             </h1>
             <p className="text-xl text-slate-300 mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium">Experience thousands of global channels with a premium, ad-free interface. No subscription required.</p>
             <div className="flex flex-wrap justify-center lg:justify-start gap-4">
               <Link href="/account/signup" className="rounded-2xl bg-cyan-500 px-10 py-4 text-sm font-bold text-slate-950 hover:bg-cyan-400 hover:scale-105 transition-all shadow-xl shadow-cyan-500/30 active:scale-95">CREATE FREE ACCOUNT</Link>
               <Link href="/search" className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md px-10 py-4 text-sm font-bold text-white hover:bg-white/10 hover:border-white/20 transition-all active:scale-95">BROWSE CHANNELS</Link>
             </div>
           </div>
        </div>
      </section>
      
      <section className="py-24 px-4 sm:px-6 bg-slate-950">
         <div className="mx-auto max-w-[1460px]">
            <div className="grid gap-12 md:grid-cols-3 mb-32">
               <FeatureCard title="Adaptive HD" desc="Smart network-aware streaming that adjusts quality in real-time." icon="⚡" />
               <FeatureCard title="Global EPG" desc="Full program guides with images and localized schedules." icon="📅" />
               <FeatureCard title="Sync Anywhere" desc="Cloud-powered history and favorites across all devices." icon="☁️" />
            </div>
            
            <div className="mb-20">
              <div className="flex items-center justify-between mb-10">
                 <h2 className="text-3xl font-bold text-white tracking-tight">Trending Worldwide</h2>
                 <Link href="/search" className="text-sm font-bold text-cyan-400 hover:underline uppercase tracking-widest">View All</Link>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
                 {trending.map(ch => <ChannelCard key={ch.id} channel={ch} onSelect={(c) => window.location.href=`/channel/${c.id}`} />)}
              </div>
            </div>
         </div>
      </section>
    </div>
  );
}

function UserHome({ allChannels, user }: { allChannels: Channel[], user: any }) {
  const router = useRouter();
  const { ids: favoriteIds } = useFavoritesStore();
  const { history } = useHistoryStore();

  const categories = useMemo(() => [...new Set(allChannels.map(c => c.category))].sort(), [allChannels]);
  const countries = useMemo(() => [...new Set(allChannels.map(c => c.country))].sort(), [allChannels]);

  const favorites = useMemo(() => allChannels.filter(c => favoriteIds.includes(c.id)), [allChannels, favoriteIds]);
  const recent = useMemo(() => {
     const recentIds = history.slice(0, 10).map(h => h.channelId);
     return allChannels.filter(c => recentIds.includes(c.id)).sort((a, b) => recentIds.indexOf(a.id) - recentIds.indexOf(b.id));
  }, [allChannels, history]);

  const trending = useMemo(() => allChannels.filter(c => c.logo).slice(0, 12), [allChannels]);
  
  const recommendations = useMemo(() => {
     if (favorites.length === 0) return allChannels.slice(20, 32);
     const topCat = favorites[0].category;
     return allChannels.filter(c => c.category === topCat && !favoriteIds.includes(c.id)).slice(0, 12);
  }, [allChannels, favorites, favoriteIds]);

  const onSelect = (ch: Channel) => router.push(`/channel/${encodeURIComponent(ch.id)}`);

  return (
    <div className="pt-24 pb-20 space-y-16 animate-fade-in transform-gpu bg-slate-950 min-h-screen">
      <div className="mx-auto max-w-[1460px] px-4 sm:px-6">
        <div className="flex items-center gap-4 mb-12">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-xl shadow-cyan-950/40">
             <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Welcome back, {user?.name || user?.email.split('@')[0]}</h1>
            <p className="text-slate-500 text-sm font-medium">Continue where you left off or explore what's trending.</p>
          </div>
        </div>

        {favorites.length > 0 && (
          <section className="mb-16">
            <SectionHeader title="Your Favorites" href="/search?favorites=true" />
            <HorizontalScroll>
               {favorites.map(ch => <ChannelCard key={ch.id} channel={ch} onSelect={onSelect} mode="grid" />)}
            </HorizontalScroll>
          </section>
        )}

        {recent.length > 0 && (
          <section className="mb-16">
            <SectionHeader title="Recently Watched" />
            <HorizontalScroll>
               {recent.map(ch => <ChannelCard key={ch.id} channel={ch} onSelect={onSelect} mode="grid" />)}
            </HorizontalScroll>
          </section>
        )}

        <section className="mb-16">
          <SectionHeader title="Trending on IPTVCloud" href="/search" />
          <HorizontalScroll>
             {trending.map(ch => <ChannelCard key={ch.id} channel={ch} onSelect={onSelect} mode="grid" />)}
          </HorizontalScroll>
        </section>

        <section className="mb-16">
          <SectionHeader title="Picked for You" />
          <HorizontalScroll>
             {recommendations.map(ch => <ChannelCard key={ch.id} channel={ch} onSelect={onSelect} mode="grid" />)}
          </HorizontalScroll>
        </section>

        <div className="grid gap-12 lg:grid-cols-2">
           <section>
             <SectionHeader title="Categories" />
             <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {categories.slice(0, 9).map(cat => (
                  <Link key={cat} href={`/search?category=${encodeURIComponent(cat || '')}`} className="group p-6 rounded-3xl bg-white/[0.02] border border-white/[0.08] hover:border-cyan-500/50 transition-all hover:bg-cyan-500/5 shadow-lg">
                    <div className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors capitalize truncate">{cat}</div>
                    <div className="text-[9px] text-slate-500 mt-2 uppercase tracking-widest font-bold">Explore Content →</div>
                  </Link>
                ))}
             </div>
           </section>
           <section>
             <SectionHeader title="Countries" />
             <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {countries.slice(0, 9).map(c => (
                  <Link key={c} href={`/search?country=${encodeURIComponent(c || '')}`} className="group p-6 rounded-3xl bg-white/[0.02] border border-white/[0.08] hover:border-cyan-500/50 transition-all hover:bg-cyan-500/5 shadow-lg">
                    <div className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors truncate">{c}</div>
                    <div className="text-[9px] text-slate-500 mt-2 uppercase tracking-widest font-bold">Browse Region →</div>
                  </Link>
                ))}
             </div>
           </section>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, href }: { title: string; href?: string }) {
  return (
    <div className="flex items-center justify-between mb-8 px-1">
      <h2 className="text-2xl font-bold text-white tracking-tight">{title}</h2>
      {href && <Link href={href} className="text-xs font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-widest transition-colors">See all results</Link>}
    </div>
  );
}

function HorizontalScroll({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-6 overflow-x-auto pb-8 scrollbar-hide -mx-4 px-4 snap-x">
      {React.Children.map(children, child => (
        <div className="shrink-0 w-[280px] snap-start">{child}</div>
      ))}
    </div>
  );
}

function FeatureCard({ title, desc, icon }: { title: string; desc: string; icon: string }) {
  return (
    <div className="p-10 rounded-[40px] bg-white/[0.02] border border-white/[0.07] hover:bg-white/[0.04] transition-all group hover:-translate-y-2 shadow-2xl">
      <div className="text-4xl mb-8 grayscale group-hover:grayscale-0 transition-all scale-110">{icon}</div>
      <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
      <p className="text-slate-400 leading-relaxed font-medium">{desc}</p>
    </div>
  );
}
