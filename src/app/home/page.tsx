import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getChannels } from '@/services/channel-service';
import ChannelCard from '@/components/ChannelCard';

export const metadata: Metadata = {
  title: 'Home — IPTVCloud.app',
  description: 'Welcome to IPTVCloud.app. The smartest way to watch live TV.',
};

export default async function HomePage() {
  const { channels } = await getChannels();
  
  // Grab a few sample channels to display as "Trending" or "Featured"
  const featured = channels.filter(c => c.logo).slice(0, 12);
  const categoriesCount = new Set(channels.map(c => c.category)).size;
  const countriesCount = new Set(channels.map(c => c.country)).size;

  return (
    <div className="pt-16 pb-20">
      <section className="py-16 px-4 sm:px-6 border-b border-white/[0.06]">
        <div className="mx-auto max-w-[1460px] animate-fade-in text-center lg:text-left flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/[0.07] px-3 py-1.5 text-xs font-medium text-cyan-300 mb-6 shadow-lg shadow-cyan-500/10 backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Welcome to the future of TV
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.1]">
              Live Television,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-sky-400">reimagined.</span>
            </h1>
            <p className="mt-6 text-lg text-slate-400 max-w-xl mx-auto lg:mx-0">
              Access {channels.length.toLocaleString()} live channels from {countriesCount} countries. 
              Enjoy a premium interface, save your favorites, and track your history—all in one place.
            </p>
            <div className="mt-8 flex flex-wrap justify-center lg:justify-start gap-4">
              <Link href="/search" className="rounded-full bg-gradient-to-r from-cyan-500 to-sky-500 px-8 py-3.5 text-sm font-semibold text-slate-950 hover:scale-105 transition-transform shadow-lg shadow-cyan-500/25">
                Start Watching
              </Link>
              <Link href="/account/signup" className="rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-md px-8 py-3.5 text-sm font-medium text-white hover:bg-white/[0.08] transition-all">
                Create Account
              </Link>
            </div>
            
            <div className="mt-10 grid grid-cols-3 gap-4 max-w-md mx-auto lg:mx-0">
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 text-center backdrop-blur-sm">
                <div className="text-2xl font-bold text-white">{channels.length.toLocaleString()}</div>
                <div className="text-xs text-slate-500 mt-1">Channels</div>
              </div>
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 text-center backdrop-blur-sm">
                <div className="text-2xl font-bold text-white">{countriesCount}</div>
                <div className="text-xs text-slate-500 mt-1">Countries</div>
              </div>
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 text-center backdrop-blur-sm">
                <div className="text-2xl font-bold text-white">{categoriesCount}</div>
                <div className="text-xs text-slate-500 mt-1">Categories</div>
              </div>
            </div>
          </div>
          
          <div className="hidden lg:block lg:w-[600px] relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/20 to-sky-500/20 blur-3xl rounded-full" />
            <div className="relative rounded-3xl border border-white/10 bg-slate-900 shadow-2xl overflow-hidden aspect-video">
               <div className="absolute inset-0 flex items-center justify-center text-slate-700 bg-slate-950/80">
                 <svg className="w-20 h-20 opacity-50" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
               </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 sm:px-6">
        <div className="mx-auto max-w-[1460px]">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-cyan-400 mb-1">Discover</div>
              <h2 className="text-2xl font-bold text-white">Featured Channels</h2>
            </div>
            <Link href="/search" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
              View all →
            </Link>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {featured.map(ch => (
               <Link href={`/channel/${encodeURIComponent(ch.id)}`} key={ch.id} className="block group">
                 <div className="relative aspect-video overflow-hidden rounded-2xl bg-slate-900 border border-white/[0.07] mb-3 group-hover:border-cyan-500/50 transition-colors">
                   {ch.logo ? (
                     <img src={ch.logo} alt={ch.name} loading="lazy" className="h-full w-full object-contain p-4 group-hover:scale-110 transition-transform duration-500" />
                   ) : (
                     <div className="flex h-full items-center justify-center font-bold text-slate-700 text-2xl">{ch.name.substring(0, 2)}</div>
                   )}
                   <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                     <div className="h-12 w-12 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center pl-1 shadow-lg shadow-cyan-500/50 transform scale-75 group-hover:scale-100 transition-transform">
                       <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                     </div>
                   </div>
                 </div>
                 <div className="flex items-center gap-2">
                   {ch.country && ch.country !== 'UNKNOWN' && ch.country !== 'INTERNATIONAL' && (
                     <img src={`https://flagcdn.com/w20/${ch.country.toLowerCase()}.png`} alt={ch.country} className="h-3 w-4 rounded-sm" />
                   )}
                   <div className="truncate text-sm font-medium text-white group-hover:text-cyan-400 transition-colors">{ch.name}</div>
                 </div>
                 <div className="truncate text-xs text-slate-500 mt-0.5">{ch.category}</div>
               </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
