'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';
import { useFavoritesStore } from '@/store/favorites-store';
import { useHistoryStore } from '@/store/history-store';
import type { Channel } from '@/types';
import ChannelCard from '@/components/ChannelCard';
import HeroVideo from '@/components/HeroVideo';

export default function HomeDashboard({ allChannels }: { allChannels: Channel[] }) {
  const { isLoggedIn, user } = useAuthStore();
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

  if (!isLoggedIn) {
     return (
       <div className="pt-16 pb-20">
         <section className="relative min-h-[600px] flex items-center border-b border-white/[0.06] overflow-hidden">
           {allChannels.length > 0 && (
             <HeroVideo streamUrl={allChannels[0].streamUrl} channelId={allChannels[0].id} poster={allChannels[0].logo} />
           )}
           <div className="relative z-10 w-full mx-auto max-w-[1460px] px-4 sm:px-6 py-20 animate-fade-in text-center lg:text-left">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/[0.1] px-3 py-1.5 text-xs font-medium text-cyan-300 mb-6 shadow-lg backdrop-blur-md">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  Premium IPTV Reimagined
                </div>
                <h1 className="text-5xl sm:text-7xl font-bold tracking-tight text-white leading-[1.1] mb-6">
                  Watch live TV,<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-sky-400">anywhere.</span>
                </h1>
                <p className="text-lg text-slate-300 mb-8 max-w-xl mx-auto lg:mx-0">Join thousands of users watching global channels with our lightning-fast, ad-free player.</p>
                <div className="flex flex-wrap justify-center lg:justify-start gap-4">
                  <Link href="/account/signup" className="rounded-full bg-cyan-500 px-8 py-3.5 text-sm font-bold text-slate-950 hover:scale-105 transition-all shadow-lg shadow-cyan-500/25">Get Started</Link>
                  <Link href="/search" className="rounded-full border border-white/10 bg-white/5 backdrop-blur-md px-8 py-3.5 text-sm font-medium text-white hover:bg-white/10 transition-all">Browse Channels</Link>
                </div>
              </div>
           </div>
         </section>
         
         <section className="py-20 px-4 sm:px-6">
            <div className="mx-auto max-w-[1460px]">
               <div className="grid gap-8 md:grid-cols-3 mb-24">
                  <FeatureCard title="Adaptive Streaming" desc="Network-aware bitrates for smooth playback on any connection." icon="⚡" />
                  <FeatureCard title="Global Guide" desc="Real-time EPG with program images and detailed schedules." icon="📅" />
                  <FeatureCard title="Cloud Sync" desc="Your favorites and history, synced across all your devices." icon="☁️" />
               </div>
               
               <div className="mb-12">
                 <h2 className="text-2xl font-bold text-white mb-8">Trending Now</h2>
                 <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
                    {trending.map(ch => <ChannelCard key={ch.id} channel={ch} onSelect={() => {}} />)}
                 </div>
               </div>
            </div>
         </section>
       </div>
     );
  }

  return (
    <div className="pt-24 pb-20 space-y-12">
      <div className="mx-auto max-w-[1460px] px-4 sm:px-6">
        <h1 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
          Welcome back, {user?.name || user?.email.split('@')[0]}
          <span className="text-xs font-normal text-slate-500 bg-slate-900 border border-white/5 px-2 py-1 rounded-lg">PRO</span>
        </h1>

        {favorites.length > 0 && (
          <section>
            <SectionHeader title="Your Favorites" href="/search?favorites=true" />
            <HorizontalScroll>
               {favorites.map(ch => <ChannelCard key={ch.id} channel={ch} onSelect={() => {}} mode="grid" />)}
            </HorizontalScroll>
          </section>
        )}

        {recent.length > 0 && (
          <section>
            <SectionHeader title="Recently Watched" />
            <HorizontalScroll>
               {recent.map(ch => <ChannelCard key={ch.id} channel={ch} onSelect={() => {}} mode="grid" />)}
            </HorizontalScroll>
          </section>
        )}

        <section>
          <SectionHeader title="Trending Channels" href="/search" />
          <HorizontalScroll>
             {trending.map(ch => <ChannelCard key={ch.id} channel={ch} onSelect={() => {}} mode="grid" />)}
          </HorizontalScroll>
        </section>

        <section>
          <SectionHeader title="Recommendations for You" />
          <HorizontalScroll>
             {recommendations.map(ch => <ChannelCard key={ch.id} channel={ch} onSelect={() => {}} mode="grid" />)}
          </HorizontalScroll>
        </section>

        <div className="grid gap-8 lg:grid-cols-2">
           <section>
             <SectionHeader title="Categories" />
             <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {categories.slice(0, 9).map(cat => (
                  <Link key={cat} href={`/search?category=${encodeURIComponent(cat || '')}`} className="group p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07] hover:border-cyan-500/50 transition-all hover:bg-cyan-500/5">
                    <div className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors capitalize">{cat}</div>
                    <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-medium">Explore →</div>
                  </Link>
                ))}
             </div>
           </section>
           <section>
             <SectionHeader title="Top Countries" />
             <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {countries.slice(0, 9).map(c => (
                  <Link key={c} href={`/search?country=${encodeURIComponent(c || '')}`} className="group p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07] hover:border-cyan-500/50 transition-all hover:bg-cyan-500/5">
                    <div className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">{c}</div>
                    <div className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-medium">Browse →</div>
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
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-xl font-bold text-white">{title}</h2>
      {href && <Link href={href} className="text-xs font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-widest">See all</Link>}
    </div>
  );
}

function HorizontalScroll({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-1 px-1 snap-x">
      {React.Children.map(children, child => (
        <div className="shrink-0 w-[240px] snap-start">{child}</div>
      ))}
    </div>
  );
}

function FeatureCard({ title, desc, icon }: { title: string; desc: string; icon: string }) {
  return (
    <div className="p-8 rounded-[32px] bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition-colors group">
      <div className="text-3xl mb-6 grayscale group-hover:grayscale-0 transition-all scale-110">{icon}</div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
    </div>
  );
}
