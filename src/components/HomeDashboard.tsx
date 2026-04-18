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
import { REVERSE_COUNTRY_MAP } from '@/lib/countries';

export default function HomeDashboard({ allChannels }: { allChannels: Channel[] }) {
  const { isLoggedIn, user } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted)
    return (
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
      const candidates = allChannels.filter((c) => c.streamUrl && c.logo);
      setRandomChannel(candidates[Math.floor(Math.random() * candidates.length)]);
    }
  }, [allChannels]);

  const trending = useMemo(() => allChannels.filter((c) => c.logo).slice(0, 12), [allChannels]);

  return (
    <div className="animate-fade-in transform-gpu">
      {/* SaaS Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        <div className="absolute inset-0 z-0">
          {randomChannel && (
            <HeroVideo streamUrl={randomChannel.streamUrl} channelId={randomChannel.id} />
          )}
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/60 to-slate-950" />
        </div>

        <div className="relative z-10 w-full mx-auto max-w-[1460px] px-4 sm:px-6 text-center">
          <div className="max-w-4xl mx-auto space-y-10">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-6 py-2.5 text-xs font-bold text-white backdrop-blur-xl shadow-2xl animate-fade-up">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="opacity-70">TRUSTED BY 50,000+ USERS GLOBALLY</span>
            </div>

            <h1 className="text-6xl sm:text-9xl font-black tracking-tighter text-white leading-[0.85] animate-fade-up-delayed drop-shadow-2xl">
              STREAMING
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-500">
                WITHOUT LIMITS.
              </span>
            </h1>

            <p className="text-xl sm:text-2xl text-slate-300 max-w-2xl mx-auto leading-relaxed font-medium animate-fade-up-delayed opacity-80">
              Access {allChannels.length.toLocaleString()} premium channels with zero
              advertisements. Experience the most advanced IPTV platform ever built.
            </p>

            <div className="flex flex-wrap justify-center gap-6 pt-4 animate-fade-up-delayed">
              <Link
                href="/account/signup"
                className="rounded-[24px] bg-cyan-500 px-12 py-5 text-sm font-black text-slate-950 hover:bg-cyan-400 hover:scale-105 transition-all shadow-[0_0_40px_rgba(6,182,212,0.3)] active:scale-95"
              >
                START WATCHING NOW
              </Link>
              <Link
                href="/search"
                className="rounded-[24px] border border-white/20 bg-white/5 backdrop-blur-xl px-12 py-5 text-sm font-black text-white hover:bg-white/10 transition-all active:scale-95"
              >
                EXPLORE CHANNELS
              </Link>
            </div>
          </div>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce opacity-20">
          <span className="material-icons text-3xl">keyboard_double_arrow_down</span>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-32 px-4 sm:px-6 bg-slate-950 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="mx-auto max-w-[1460px]">
          <div className="text-center max-w-3xl mx-auto mb-24 space-y-4">
            <h2 className="text-sm font-black uppercase tracking-[0.4em] text-cyan-500">
              The IPTV Standard
            </h2>
            <h3 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Everything You Need To
              <br />
              Stream Like A Pro.
            </h3>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <FeatureCard
              title="Adaptive 4K Engine"
              desc="Automatic bitrate switching ensures buffer-free 4K playback regardless of your connection speed."
              icon="bolt"
              color="text-cyan-400"
            />
            <FeatureCard
              title="Live Community"
              desc="Engage with viewers worldwide in real-time with our integrated ad-free chat system on every stream."
              icon="forum"
              color="text-violet-400"
            />
            <FeatureCard
              title="Full EPG Access"
              desc="Never miss a show with detailed Electronic Program Guides, schedule alerts, and program imagery."
              icon="event_note"
              color="text-emerald-400"
            />
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-32 px-4 sm:px-6 bg-white/[0.02] border-y border-white/5">
        <div className="mx-auto max-w-[1460px] grid lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-10">
            <div className="space-y-4">
              <h2 className="text-sm font-black uppercase tracking-[0.4em] text-indigo-400">
                Why Choose Us
              </h2>
              <h3 className="text-5xl font-black text-white tracking-tight">
                Elegance Meets
                <br />
                Performance.
              </h3>
            </div>
            <p className="text-lg text-slate-400 leading-relaxed font-medium">
              IPTVCloud is not just a player—it's a complete entertainment ecosystem designed for
              the modern viewer. We've removed the clutter and focused on what matters: the content.
            </p>
            <div className="grid gap-6 sm:grid-cols-2">
              <WhyCard
                title="No Ads"
                desc="Zero intrusive banners or pre-roll advertisements."
                icon="block"
              />
              <WhyCard
                title="Privacy"
                desc="We don't track your data or browsing habits."
                icon="security"
              />
              <WhyCard
                title="SaaS Speed"
                desc="Cloud-synced preferences for instant access."
                icon="sync_alt"
              />
              <WhyCard
                title="Modern UI"
                desc="A sluggish-free, glassy, and responsive interface."
                icon="auto_awesome"
              />
            </div>
          </div>
          <div className="relative group">
            <div className="absolute -inset-10 bg-cyan-500/10 blur-[100px] rounded-full opacity-50 group-hover:opacity-100 transition-opacity" />
            <div className="relative rounded-[48px] bg-slate-900 border border-white/10 p-4 shadow-2xl overflow-hidden aspect-video">
              <div className="w-full h-full rounded-[36px] bg-slate-950 flex items-center justify-center">
                <span className="material-icons text-7xl text-slate-800 animate-pulse">
                  play_circle
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trending */}
      <section className="py-32 px-4 sm:px-6">
        <div className="mx-auto max-w-[1460px]">
          <div className="flex items-end justify-between mb-16 px-4">
            <div className="space-y-2">
              <h2 className="text-sm font-black uppercase tracking-[0.4em] text-emerald-400">
                Discovery
              </h2>
              <h3 className="text-4xl font-black text-white tracking-tight">Trending Right Now</h3>
            </div>
            <Link
              href="/search"
              className="hidden sm:flex items-center gap-2 text-xs font-black text-slate-500 hover:text-white transition-all uppercase tracking-widest"
            >
              View All Channels <span className="material-icons text-sm">east</span>
            </Link>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {trending.map((ch) => (
              <ChannelCard
                key={ch.id}
                channel={ch}
                onSelect={(c) => (window.location.href = `/channel/${c.id}`)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-4 sm:px-6">
        <div className="mx-auto max-w-[1460px]">
          <div className="rounded-[64px] bg-gradient-to-br from-cyan-600 via-blue-600 to-indigo-700 p-12 sm:p-24 text-center relative overflow-hidden shadow-2xl shadow-cyan-900/30">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
            <div className="relative z-10 space-y-10">
              <h2 className="text-5xl sm:text-7xl font-black text-white tracking-tighter leading-none">
                Ready for the better way
                <br />
                to watch television?
              </h2>
              <p className="text-xl text-white/80 max-w-2xl mx-auto font-medium leading-relaxed">
                Join 50,000+ users and start your premium streaming journey today. No credit card,
                no subscription, no nonsense.
              </p>
              <div className="flex flex-wrap justify-center gap-6 pt-4">
                <Link
                  href="/account/signup"
                  className="rounded-[24px] bg-white px-14 py-6 text-sm font-black text-slate-950 hover:bg-cyan-50 transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-black/20"
                >
                  GET STARTED FREE
                </Link>
                <Link
                  href="/forbidden"
                  className="rounded-[24px] bg-black/20 border border-white/20 backdrop-blur-xl px-14 py-6 text-sm font-black text-white hover:bg-white/10 transition-all active:scale-95"
                >
                  CONTACT SUPPORT
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function UserHome({ allChannels, user }: { allChannels: Channel[]; user: any }) {
  const router = useRouter();
  const { ids: favoriteIds } = useFavoritesStore();
  const { history } = useHistoryStore();

  const categories = useMemo(
    () => [...new Set(allChannels.map((c) => c.category))].sort(),
    [allChannels],
  );
  const countries = useMemo(
    () => [...new Set(allChannels.map((c) => c.country))].sort(),
    [allChannels],
  );

  const favorites = useMemo(
    () => allChannels.filter((c) => favoriteIds.includes(c.id)),
    [allChannels, favoriteIds],
  );
  const recent = useMemo(() => {
    const recentIds = history.slice(0, 10).map((h) => h.channelId);
    const deduped = Array.from(new Set(recentIds));
    return deduped
      .map((id) => allChannels.find((c) => c.id === id))
      .filter((c): c is Channel => Boolean(c));
  }, [allChannels, history]);

  const trending = useMemo(() => allChannels.filter((c) => c.logo).slice(0, 12), [allChannels]);

  const recommendations = useMemo(() => {
    if (favorites.length === 0) return allChannels.slice(20, 32);
    const topCat = favorites[0].category;
    return allChannels
      .filter((c) => c.category === topCat && !favoriteIds.includes(c.id))
      .slice(0, 12);
  }, [allChannels, favorites, favoriteIds]);

  const onSelect = (ch: Channel) => router.push(`/channel/${encodeURIComponent(ch.id)}`);

  return (
    <div className="pt-28 pb-20 space-y-20 animate-fade-in transform-gpu bg-slate-950 min-h-screen">
      <div className="mx-auto max-w-[1460px] px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8 mb-16 p-10 rounded-[48px] bg-white/[0.02] border border-white/5 relative overflow-hidden shadow-2xl backdrop-blur-xl">
          <div className="absolute top-0 right-0 h-64 w-64 bg-cyan-500/5 blur-[80px] rounded-full" />
          <div className="flex items-center gap-6 relative z-10">
            <div className="h-20 w-20 rounded-[32px] bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-2xl shadow-cyan-950/40">
              <span className="material-icons text-4xl">account_circle</span>
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-black text-white tracking-tight uppercase italic">
                Dashboard.
              </h1>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                Welcome back, {user?.name || user?.email.split('@')[0]}
              </p>
            </div>
          </div>
          <div className="flex gap-4 relative z-10">
            <Link
              href="/search"
              className="px-8 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95"
            >
              Browse Library
            </Link>
            <Link
              href="/account/settings"
              className="px-8 py-3.5 rounded-2xl bg-cyan-500 text-[10px] font-black text-slate-950 uppercase tracking-widest hover:bg-cyan-400 transition-all active:scale-95 shadow-lg shadow-cyan-900/20"
            >
              Account Settings
            </Link>
          </div>
        </div>

        {recent.length > 0 && (
          <section className="mb-20">
            <SectionHeader title="Resume Watching" />
            <HorizontalScroll>
              {recent.map((ch) => (
                <ChannelCard key={ch.id} channel={ch} onSelect={onSelect} mode="grid" />
              ))}
            </HorizontalScroll>
          </section>
        )}

        {favorites.length > 0 && (
          <section className="mb-20">
            <SectionHeader title="Your Personal Favorites" href="/search?favorites=true" />
            <HorizontalScroll>
              {favorites.map((ch) => (
                <ChannelCard key={ch.id} channel={ch} onSelect={onSelect} mode="grid" />
              ))}
            </HorizontalScroll>
          </section>
        )}

        <section className="mb-20">
          <SectionHeader title="Trending Channels Globally" href="/search" />
          <HorizontalScroll>
            {trending.map((ch) => (
              <ChannelCard key={ch.id} channel={ch} onSelect={onSelect} mode="grid" />
            ))}
          </HorizontalScroll>
        </section>

        <section className="mb-20">
          <SectionHeader title="Personal Recommendations" />
          <HorizontalScroll>
            {recommendations.map((ch) => (
              <ChannelCard key={ch.id} channel={ch} onSelect={onSelect} mode="grid" />
            ))}
          </HorizontalScroll>
        </section>

        <div className="grid gap-12 lg:grid-cols-2 pt-10">
          <section>
            <SectionHeader title="Browse by Genre" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {categories.slice(0, 9).map((cat) => (
                <Link
                  key={cat}
                  href={`/search?category=${encodeURIComponent(cat || '')}`}
                  className="group p-8 rounded-[36px] bg-white/[0.02] border border-white/[0.08] hover:border-cyan-500/50 transition-all hover:bg-cyan-500/5 shadow-lg active:scale-[0.98] transform-gpu"
                >
                  <div className="text-xs font-black text-white group-hover:text-cyan-400 transition-colors capitalize truncate tracking-widest">
                    {cat}
                  </div>
                  <div className="text-[9px] text-slate-600 mt-2 uppercase tracking-[0.2em] font-black group-hover:text-slate-400 transition-colors">
                    EXPLORE
                  </div>
                </Link>
              ))}
            </div>
          </section>
          <section>
            <SectionHeader title="World Map" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {countries.slice(0, 9).map((c) => {
                const code = REVERSE_COUNTRY_MAP[String(c || '').toUpperCase()];
                return (
                  <Link
                    key={c}
                    href={`/search?country=${encodeURIComponent(c || '')}`}
                    className="group p-8 rounded-[36px] bg-white/[0.02] border border-white/[0.08] hover:border-cyan-500/50 transition-all hover:bg-cyan-500/5 shadow-lg active:scale-[0.98] transform-gpu"
                  >
                    <div className="flex items-center gap-4 mb-3">
                      <div className="h-6 w-8 rounded-md overflow-hidden bg-slate-900 border border-white/10 shrink-0">
                        {code ? (
                          <img
                            src={`https://flagcdn.com/w40/${code}.png`}
                            alt=""
                            className="h-full w-full object-cover grayscale group-hover:grayscale-0 transition-all"
                          />
                        ) : (
                          <span className="material-icons text-[16px] flex items-center justify-center h-full text-slate-700">
                            public
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-black text-white group-hover:text-cyan-400 transition-colors truncate tracking-widest uppercase">
                        {c}
                      </div>
                    </div>
                    <div className="text-[9px] text-slate-600 uppercase tracking-[0.2em] font-black group-hover:text-slate-400 transition-colors">
                      GO TO REGION
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, href }: { title: string; href?: string }) {
  return (
    <div className="flex items-end justify-between mb-10 px-2">
      <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">
        {title}
        <span className="text-cyan-500">.</span>
      </h2>
      {href && (
        <Link
          href={href}
          className="text-[10px] font-black text-cyan-400 hover:text-cyan-300 uppercase tracking-[0.25em] transition-all pb-1"
        >
          See All
        </Link>
      )}
    </div>
  );
}

function HorizontalScroll({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-8 overflow-x-auto pb-12 scrollbar-hide -mx-6 px-6 snap-x">
      {React.Children.map(children, (child) => (
        <div className="shrink-0 w-[320px] snap-start">{child}</div>
      ))}
    </div>
  );
}

function FeatureCard({
  title,
  desc,
  icon,
  color,
}: {
  title: string;
  desc: string;
  icon: string;
  color: string;
}) {
  return (
    <div className="p-12 rounded-[56px] bg-white/[0.02] border border-white/[0.07] hover:bg-white/[0.04] transition-all group hover:-translate-y-3 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
        <span className="material-icons text-9xl">{icon}</span>
      </div>
      <div className={`material-icons text-5xl mb-10 transition-all scale-110 ${color}`}>
        {icon}
      </div>
      <h3 className="text-2xl font-black text-white mb-6 tracking-tight">{title}</h3>
      <p className="text-slate-400 leading-relaxed font-medium text-base">{desc}</p>
    </div>
  );
}

function WhyCard({ title, desc, icon }: { title: string; desc: string; icon: string }) {
  return (
    <div className="flex gap-5 group">
      <div className="h-12 w-12 shrink-0 rounded-2xl bg-white/5 flex items-center justify-center text-cyan-500 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-all duration-500">
        <span className="material-icons text-xl">{icon}</span>
      </div>
      <div className="space-y-1">
        <h4 className="font-black text-white text-sm uppercase tracking-wider">{title}</h4>
        <p className="text-xs text-slate-500 leading-relaxed font-medium">{desc}</p>
      </div>
    </div>
  );
}
