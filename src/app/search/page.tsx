'use client';

import React, { useEffect, useState, useCallback } from 'react';
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
  const [results, setResults] = useState<SearchResult>({
    channels: [],
    epg: [],
    profiles: [],
    posts: [],
  });
  const [loading, setLoading] = useState(false);

  const fetchResults = useCallback(async () => {
    if (!q) return;
    setLoading(true);
    try {
      const [chRes, epgRes, profRes, postRes] = await Promise.all([
        fetch(`/api/search?q=${encodeURIComponent(q)}&limit=4`),
        fetch(`/api/epg/search?q=${encodeURIComponent(q)}&limit=4`),
        fetch(`/api/user/search?q=${encodeURIComponent(q)}&limit=4`),
        fetch(`/api/posts/search?q=${encodeURIComponent(q)}&limit=4`),
      ]);

      const [channels, epg, profiles, posts] = await Promise.all([
        chRes.ok ? chRes.json() : [],
        epgRes.ok ? epgRes.json() : [],
        profRes.ok ? profRes.json() : [],
        postRes.ok ? postRes.json() : [],
      ]);

      setResults({ channels, epg, profiles, posts });
    } catch (e) {
      console.error('Search failed:', e);
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  return (
    <div className="min-h-screen pt-32 pb-20 px-4 sm:px-6 bg-slate-950">
      <div className="mx-auto max-w-6xl space-y-12 animate-fade-in transform-gpu">
        <div className="space-y-4 px-2">
          <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
            Global Hub
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white uppercase italic tracking-tighter leading-none">
            Universal Search<span className="text-cyan-500">.</span>
          </h1>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const val = (e.currentTarget.elements.namedItem('q') as HTMLInputElement).value;
              router.push(`/search?q=${encodeURIComponent(val)}`);
            }}
            className="relative max-w-2xl mt-8"
          >
            <span className="material-icons absolute left-5 top-1/2 -translate-y-1/2 text-slate-500">
              search
            </span>
            <input
              name="q"
              type="text"
              defaultValue={q}
              placeholder="Search across signals, guides, members, and posts..."
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-[24px] sm:rounded-[32px] py-4 sm:py-5 pl-14 pr-6 text-sm sm:text-base text-white outline-none focus:border-cyan-500 transition-all shadow-inner"
            />
          </form>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-6 opacity-20">
            <div className="h-12 w-12 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin" />
            <div className="text-[10px] font-black uppercase tracking-widest text-white">
              Scanning Network...
            </div>
          </div>
        ) : !q ? (
          <div className="py-32 text-center space-y-6">
            <span className="material-icons text-7xl text-slate-800">manage_search</span>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">
              Enter a keyword to start scanning
            </p>
          </div>
        ) : (
          <div className="grid gap-12 sm:grid-cols-2">
            {/* CHANNELS */}
            <Section
              title="Broadcast Signals"
              link={`/search/channels?q=${q}`}
              count={results.channels.length}
            >
              {results.channels.map((ch) => (
                <Link
                  key={ch.id}
                  href={`/channel/${ch.id}`}
                  className="group flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all"
                >
                  <div className="h-10 w-10 rounded-lg bg-slate-900 flex items-center justify-center shrink-0 p-1">
                    {ch.logo ? (
                      <Image
                        src={getProxiedImageUrl(ch.logo)}
                        alt={ch.name}
                        width={40}
                        height={40}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <span className="text-xs font-black text-slate-700">{ch.name[0]}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-white truncate uppercase italic tracking-tighter group-hover:text-cyan-400 transition-colors">
                      {ch.name}
                    </div>
                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                      {ch.category}
                    </div>
                  </div>
                </Link>
              ))}
            </Section>

            {/* PROFILES */}
            <Section
              title="Community Members"
              link={`/search/profiles?q=${q}`}
              count={results.profiles.length}
            >
              {results.profiles.map((p) => (
                <Link
                  key={p.id}
                  href={`/profile/${p.username}`}
                  className="group flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all"
                >
                  <div className="h-10 w-10 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center text-slate-700 shrink-0">
                    <span className="material-icons text-xl">account_circle</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-white truncate flex items-center gap-2">
                      @{p.username}
                      {p.isVerified && <VerifiedBadge className="text-xs" />}
                    </div>
                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                      {p.role} ACCOUNT
                    </div>
                  </div>
                </Link>
              ))}
            </Section>

            {/* EPG */}
            <Section title="Program Guides" link={`/search/epg?q=${q}`} count={results.epg.length}>
              {results.epg.map((e) => (
                <Link
                  key={e.id}
                  href={`/epg/${e.id}`}
                  className="group flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all"
                >
                  <div className="h-10 w-10 rounded-lg bg-slate-900 flex items-center justify-center text-slate-700 shrink-0">
                    <span className="material-icons text-xl">event_note</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-white truncate group-hover:text-cyan-400 transition-colors uppercase italic tracking-tighter">
                      {e.name} Guide
                    </div>
                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                      SCHEDULE SYNC ACTIVE
                    </div>
                  </div>
                </Link>
              ))}
            </Section>

            {/* POSTS */}
            <Section
              title="Social Signals"
              link={`/search/posts?q=${q}`}
              count={results.posts.length}
            >
              {results.posts.map((p) => (
                <Link
                  key={p.id}
                  href={`/posts/${p.id}`}
                  className="group block p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all"
                >
                  <div className="text-sm font-bold text-white truncate group-hover:text-cyan-400 transition-colors mb-1 uppercase italic tracking-tighter">
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
