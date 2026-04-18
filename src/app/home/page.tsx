import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getChannels } from '@/services/channel-service';
import HeroVideo from '@/components/HeroVideo';

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
  
  // Select a random channel for the background video
  const liveCandidates = channels.filter(c => c.streamUrl && c.logo && c.country === 'US');
  const randomChannel = liveCandidates.length > 0 
    ? liveCandidates[Math.floor(Math.random() * liveCandidates.length)] 
    : channels[Math.floor(Math.random() * channels.length)];

  return (
    <div className="pt-16 pb-20">
      <section className="relative min-h-[600px] flex items-center border-b border-white/[0.06] overflow-hidden">
        {randomChannel && (
          <HeroVideo streamUrl={randomChannel.streamUrl} channelId={randomChannel.id} poster={randomChannel.logo} />
        )}
        
        <div className="relative z-10 w-full mx-auto max-w-[1460px] px-4 sm:px-6 py-20 animate-fade-in text-center lg:text-left flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/[0.1] px-3 py-1.5 text-xs font-medium text-cyan-300 mb-6 shadow-lg shadow-cyan-500/10 backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Welcome to the future of TV
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.1] drop-shadow-2xl">
              Live Television,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-sky-400">reimagined.</span>
            </h1>
            <p className="mt-6 text-lg text-slate-300 max-w-xl mx-auto lg:mx-0 drop-shadow-md">
              Access {channels.length.toLocaleString()} live channels from {countriesCount} countries. 
              Enjoy a premium interface, save your favorites, and track your history—all in one place.
            </p>
            <div className="mt-8 flex flex-wrap justify-center lg:justify-start gap-4">
              <Link href="/search" className="rounded-full bg-gradient-to-r from-cyan-500 to-sky-500 px-8 py-3.5 text-sm font-semibold text-slate-950 hover:scale-105 transition-transform shadow-lg shadow-cyan-500/25">
                Start Watching
              </Link>
              <Link href="/account/signup" className="rounded-full border border-white/20 bg-white/10 backdrop-blur-md px-8 py-3.5 text-sm font-medium text-white hover:bg-white/20 hover:border-white/30 transition-all shadow-lg">
                Create Account
              </Link>
            </div>
            
            <div className="mt-12 grid grid-cols-3 gap-4 max-w-md mx-auto lg:mx-0">
              <div className="rounded-2xl border border-white/[0.07] bg-black/40 p-4 text-center backdrop-blur-md">
                <div className="text-2xl font-bold text-white">{channels.length.toLocaleString()}</div>
                <div className="text-xs text-slate-400 mt-1">Channels</div>
              </div>
              <div className="rounded-2xl border border-white/[0.07] bg-black/40 p-4 text-center backdrop-blur-md">
                <div className="text-2xl font-bold text-white">{countriesCount}</div>
                <div className="text-xs text-slate-400 mt-1">Countries</div>
              </div>
              <div className="rounded-2xl border border-white/[0.07] bg-black/40 p-4 text-center backdrop-blur-md">
                <div className="text-2xl font-bold text-white">{categoriesCount}</div>
                <div className="text-xs text-slate-400 mt-1">Categories</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6">
        <div className="mx-auto max-w-[1460px]">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-cyan-400 mb-2">Why Choose Us</h2>
            <h3 className="text-3xl font-bold text-white mb-4">A Next-Generation Viewing Experience</h3>
            <p className="text-slate-400">Everything you need to discover and enjoy global television without the clutter or intrusive ads.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 mb-24">
            <div className="rounded-3xl border border-white/[0.07] bg-white/[0.02] p-8 hover:bg-white/[0.04] transition-colors">
              <div className="h-12 w-12 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center mb-6">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              </div>
              <h4 className="text-xl font-bold text-white mb-3">Lightning Fast Player</h4>
              <p className="text-slate-400 text-sm leading-relaxed">Built with an optimized HLS.js engine, our video player ensures the lowest latency and highest quality streaming possible for web environments.</p>
            </div>
            <div className="rounded-3xl border border-white/[0.07] bg-white/[0.02] p-8 hover:bg-white/[0.04] transition-colors">
              <div className="h-12 w-12 rounded-2xl bg-violet-500/20 text-violet-400 flex items-center justify-center mb-6">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
              </div>
              <h4 className="text-xl font-bold text-white mb-3">Smart Organization</h4>
              <p className="text-slate-400 text-sm leading-relaxed">Thousands of channels automatically categorized by country, language, and genre. Easily filter, search, and navigate massive IPTV playlists.</p>
            </div>
            <div className="rounded-3xl border border-white/[0.07] bg-white/[0.02] p-8 hover:bg-white/[0.04] transition-colors">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-6">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </div>
              <h4 className="text-xl font-bold text-white mb-3">Cloud Sync & History</h4>
              <p className="text-slate-400 text-sm leading-relaxed">Create a free account to securely sync your favorite channels, custom settings, and watch history across all your devices instantaneously.</p>
            </div>
          </div>

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

          {/* Call to Action */}
          <div className="mt-24 rounded-[40px] relative overflow-hidden border border-cyan-500/20 bg-slate-900 px-6 py-16 sm:p-20 text-center shadow-2xl">
            <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl mix-blend-screen" />
            <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-sky-500/20 blur-3xl mix-blend-screen" />
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">Ready to upgrade your TV experience?</h2>
              <p className="text-slate-300 max-w-2xl mx-auto mb-10 text-lg">Join thousands of users already watching global live TV without boundaries. No credit card required. Free forever.</p>
              <Link href="/account/signup" className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-sky-500 px-8 py-4 text-sm font-bold text-slate-950 hover:scale-105 transition-transform shadow-lg shadow-cyan-500/25">
                Create your free account
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
