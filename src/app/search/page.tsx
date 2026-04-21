'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { getProxiedImageUrl } from '@/lib/image-proxy';
import VerifiedBadge from '@/components/VerifiedBadge';

type SearchResult = {
  channels: any[];
  epg: any[];
  profiles: any[];
  posts: any[];
};

export default function OverallSearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get('q') || '';
  const initialFilter = searchParams.get('type') || 'all';

  const [query, setQuery] = useState(q);
  const [results, setResults] = useState<SearchResult>({
    channels: [],
    epg: [],
    profiles: [],
    posts: [],
  });
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState(initialFilter);

  const fetchResults = useCallback(async (searchQuery: string) => {
    if (!searchQuery) {
      setResults({ channels: [], epg: [], profiles: [], posts: [] });
      return;
    }
    setLoading(true);
    try {
      const limit = 6;
      const [chRes, epgRes, profRes, postRes] = await Promise.all([
        fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&limit=${limit}`),
        fetch(`/api/epg/search?q=${encodeURIComponent(searchQuery)}&limit=${limit}`),
        fetch(`/api/user/search?q=${encodeURIComponent(searchQuery)}&limit=${limit}`),
        fetch(`/api/posts/search?q=${encodeURIComponent(searchQuery)}&limit=${limit}`),
      ]);

      const [channelsData, epg, profiles, posts] = await Promise.all([
        chRes.ok ? chRes.json() : { items: [] },
        epgRes.ok ? epgRes.json() : [],
        profRes.ok ? profRes.json() : [],
        postRes.ok ? postRes.json() : [],
      ]);

      setResults({
        channels: channelsData.items || [],
        epg: Array.isArray(epg) ? epg : (epg as any).items || [],
        profiles: Array.isArray(profiles) ? profiles : (profiles as any).items || [],
        posts: Array.isArray(posts) ? posts : (posts as any).items || [],
      });
    } catch (e) {
      console.error('Search failed:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchResults(query);
    }, 400);
    return () => clearTimeout(timer);
  }, [query, fetchResults]);

  useEffect(() => {
    if (q) setQuery(q);
  }, [q]);

  const filters = [
    { label: 'All Results', value: 'all', icon: 'search' },
    { label: 'Signals', value: 'channels', icon: 'tv' },
    { label: 'Members', value: 'profiles', icon: 'people' },
    { label: 'Guides', value: 'epg', icon: 'event_note' },
    { label: 'Content', value: 'posts', icon: 'article' },
  ];

  const showChannels = activeFilter === 'all' || activeFilter === 'channels';
  const showProfiles = activeFilter === 'all' || activeFilter === 'profiles';
  const showEpg = activeFilter === 'all' || activeFilter === 'epg';
  const showPosts = activeFilter === 'all' || activeFilter === 'posts';

  return (
    <div className="min-h-screen pt-32 pb-20 px-4 sm:px-6 bg-slate-950">
      <div className="mx-auto max-w-6xl space-y-12 animate-fade-in transform-gpu">
        <div className="space-y-8 px-2">
          <div className="space-y-4">
            <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
              Global Hub
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-white uppercase italic tracking-tighter leading-none">
              Discovery<span className="text-cyan-500">.</span>
            </h1>
          </div>

          <div className="flex flex-col gap-6">
            <div className="relative max-w-2xl">
              <span className="material-icons absolute left-5 top-1/2 -translate-y-1/2 text-slate-500">
                search
              </span>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Deep network scan..."
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-[24px] sm:rounded-[32px] py-4 sm:py-5 pl-14 pr-6 text-sm sm:text-base text-white outline-none focus:border-cyan-500 transition-all shadow-inner"
              />
              {loading && (
                <div className="absolute right-6 top-1/2 -translate-y-1/2">
                  <div className="h-4 w-4 border-2 border-cyan-500/20 border-t-cyan-500 animate-spin rounded-full" />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2">
              {filters.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setActiveFilter(f.value)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                    activeFilter === f.value
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-lg shadow-cyan-900/20'
                      : 'bg-white/[0.03] text-slate-500 border-white/[0.08] hover:text-white hover:bg-white/[0.05]'
                  }`}
                >
                  <span className="material-icons text-sm">{f.icon}</span>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {!query ? (
          <div className="py-32 text-center space-y-6">
            <span className="material-icons text-7xl text-slate-800">manage_search</span>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">
              Enter a keyword to start scanning
            </p>
          </div>
        ) : (
          <div className="grid gap-12 sm:grid-cols-2">
            {/* CHANNELS */}
            {showChannels && (
              <Section
                title="Broadcast Signals"
                link={`/search/channels?q=${query}`}
                count={results.channels.length}
              >
                {results.channels.map((ch) => (
                  <Link
                    key={ch.id}
                    href={`/channel/${ch.id}`}
                    className="group flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all"
                  >
                    <div className="h-12 w-12 rounded-xl bg-slate-900 flex items-center justify-center shrink-0 p-1.5 border border-white/5">
                      {ch.logo ? (
                        <Image
                          src={getProxiedImageUrl(ch.logo)}
                          alt={ch.name}
                          width={48}
                          height={48}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <span className="text-sm font-black text-slate-700 uppercase">
                          {ch.name[0]}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-black text-white truncate uppercase italic tracking-tighter group-hover:text-cyan-400 transition-colors">
                        {ch.name}
                      </div>
                      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                        {ch.category}
                      </div>
                    </div>
                  </Link>
                ))}
              </Section>
            )}

            {/* PROFILES */}
            {showProfiles && (
              <Section
                title="Community Members"
                link={`/search/profiles?q=${query}`}
                count={results.profiles.length}
              >
                {results.profiles.map((p) => (
                  <Link
                    key={p.id}
                    href={`/profile/${p.username}`}
                    className="group flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all"
                  >
                    <div className="h-12 w-12 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center text-slate-700 shrink-0 relative overflow-hidden">
                      {p.profileIconUrl ? (
                        <Image
                          src={getProxiedImageUrl(p.profileIconUrl)}
                          alt=""
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <span className="material-icons text-2xl">account_circle</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-black text-white truncate flex items-center gap-2 uppercase tracking-tight">
                        @{p.username}
                        {p.isVerified && <VerifiedBadge className="text-xs" />}
                      </div>
                      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                        {p.role} ACCOUNT
                      </div>
                    </div>
                  </Link>
                ))}
              </Section>
            )}

            {/* EPG */}
            {showEpg && (
              <Section
                title="Program Guides"
                link={`/search/epg?q=${query}`}
                count={results.epg.length}
              >
                {results.epg.map((e) => (
                  <Link
                    key={e.id}
                    href={`/epg/${e.id}`}
                    className="group flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all"
                  >
                    <div className="h-12 w-12 rounded-xl bg-slate-900 flex items-center justify-center text-slate-700 shrink-0 border border-white/5">
                      <span className="material-icons text-2xl">event_note</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-black text-white truncate group-hover:text-cyan-400 transition-colors uppercase italic tracking-tighter">
                        {e.name} Guide
                      </div>
                      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                        SCHEDULE SYNC ACTIVE
                      </div>
                    </div>
                  </Link>
                ))}
              </Section>
            )}

            {/* POSTS */}
            {showPosts && (
              <Section
                title="Social Signals"
                link={`/search/posts?q=${query}`}
                count={results.posts.length}
              >
                {results.posts.map((p) => (
                  <Link
                    key={p.id}
                    href={`/posts/${p.id}`}
                    className="group block p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all"
                  >
                    <div className="text-sm font-black text-white truncate group-hover:text-cyan-400 transition-colors mb-2 uppercase italic tracking-tighter">
                      {p.title}
                    </div>
                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <span>@{p.user.username}</span>
                      <span className="h-0.5 w-0.5 rounded-full bg-slate-700" />
                      <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                    </div>
                  </Link>
                ))}
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  link,
  count,
  children,
}: {
  title: string;
  link: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-3">
          {title}
          {count > 0 && <span className="text-cyan-500 opacity-50 italic">{count}</span>}
        </h2>
        {count >= 4 && (
          <Link
            href={link}
            className="text-[9px] font-black text-cyan-400 hover:text-cyan-300 uppercase tracking-widest transition-colors"
          >
            View All →
          </Link>
        )}
      </div>
      <div className="grid gap-3">
        {count === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed border-white/5 bg-white/[0.01] text-center">
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest italic">
              No matches detected
            </p>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
