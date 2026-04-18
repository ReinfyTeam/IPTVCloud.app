'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { useNetworkStatus } from '@/hooks/use-network';
import type { Channel } from '@/types';
import BrandLogo from './BrandLogo';
import NavbarDropdown from './NavbarDropdown';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth, isAdmin } = useAuthStore();
  const isOnline = useNetworkStatus();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Channel[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    clearAuth();
    window.location.href = '/';
  };

  const fetchSuggestions = async (q: string) => {
    try {
      const url =
        q.length >= 2 ? `/api/search?q=${encodeURIComponent(q)}&limit=5` : `/api/channels?limit=5`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.items) setSuggestions(data.items);
      else if (data.channels) setSuggestions(data.channels);
    } catch {}
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) fetchSuggestions(searchQuery);
      else fetchSuggestions('');
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const channelDropdownItems = [
    { label: 'Electronic Program Guide', href: '/epg', icon: 'auto_awesome_motion' },
    { label: 'Trending', href: '/search?sort=viewers', icon: 'trending_up' },
    { label: 'Recommendations', href: '/search?sort=recommended', icon: 'auto_awesome' },
    { label: 'Top Rated', href: '/search?sort=favorites', icon: 'star' },
    { label: 'New Channels', href: '/search?sort=newest', icon: 'fiber_new' },
  ];

  const communityDropdownItems = [
    { label: 'Newsfeed', href: '/posts', icon: 'forum' },
    { label: 'Trending Posts', href: '/posts?sort=trending', icon: 'whatshot' },
  ];

  const statusDropdownItems = [
    { label: 'System Status', href: '/status', icon: 'bar_chart' },
    { label: 'Support ticket', href: '/support', icon: 'confirmation_number' },
    ...(isAdmin() ? [{ label: 'Admin Dashboard', href: '/account/admin', icon: 'security' }] : []),
  ];

  const aboutDropdownItems = [
    { label: 'Terms of Service', href: '/tos', icon: 'description' },
    { label: 'Privacy Policy', href: '/privacy', icon: 'privacy_tip' },
    { label: 'DMCA Disclaimer', href: '/dmca', icon: 'gavel' },
  ];

  return (
    <>
      {!isOnline && mounted && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-red-500/90 text-white text-xs font-semibold px-4 py-1.5 text-center shadow-lg backdrop-blur-md animate-fade-in flex items-center justify-center gap-2">
          <span className="material-icons text-sm">warning</span>
          You are currently offline. Check your internet connection.
        </div>
      )}
      <header
        className={`fixed left-0 right-0 z-50 transition-all duration-500 transform-gpu ${!isOnline && mounted ? 'top-[28px]' : 'top-0'} ${
          scrolled
            ? 'bg-slate-950/80 backdrop-blur-xl border-b border-white/[0.06] shadow-xl shadow-black/20'
            : 'bg-transparent'
        }`}
      >
        <div className="mx-auto max-w-[1460px] px-4 sm:px-6">
          <div className="flex h-20 items-center gap-4">
            <Link
              href="/home"
              className="flex items-center gap-3 group shrink-0 transition-transform active:scale-95"
            >
              <BrandLogo className="text-2xl" />
            </Link>

            <nav className="hidden xl:flex items-center gap-1 ml-8">
              <Link
                href="/home"
                className={`rounded-full px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-all duration-200 hover:scale-105 active:scale-95 ${
                  pathname === '/home'
                    ? 'bg-white/10 text-white shadow-lg'
                    : 'text-slate-500 hover:text-white hover:bg-white/5'
                }`}
              >
                Home
              </Link>

              <NavbarDropdown
                label="Channels"
                items={channelDropdownItems}
                active={pathname === '/search' || pathname === '/epg'}
              />
              <NavbarDropdown
                label="Community"
                items={communityDropdownItems}
                active={pathname.startsWith('/posts')}
              />
              <NavbarDropdown
                label="Status"
                items={statusDropdownItems}
                active={pathname === '/status' || pathname === '/support'}
              />
              <NavbarDropdown
                label="About Us"
                items={aboutDropdownItems}
                active={['/tos', '/privacy', '/dmca'].includes(pathname)}
              />
            </nav>

            <div
              ref={searchRef}
              className="hidden lg:flex flex-1 max-w-[320px] ml-auto relative group/search"
            >
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within/search:text-cyan-400 transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <circle cx="11" cy="11" r="8" />
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Global Discovery..."
                value={searchQuery}
                onFocus={() => setShowSuggestions(true)}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
                    setShowSuggestions(false);
                  }
                }}
                className="w-full rounded-2xl border border-white/[0.08] bg-slate-900/50 py-3 pl-11 pr-4 text-xs font-bold text-white placeholder:text-slate-500 outline-none focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 transition-all backdrop-blur-sm shadow-inner"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-3 rounded-[32px] border border-white/[0.08] bg-slate-900/95 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden animate-fade-in z-50 transform-gpu p-2">
                  <div className="px-4 py-2 text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] border-b border-white/5 mb-1">
                    Suggestions
                  </div>
                  {suggestions.map((ch) => (
                    <Link
                      key={ch.id}
                      href={`/channel/${encodeURIComponent(ch.id)}`}
                      onClick={() => setShowSuggestions(false)}
                      className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-2xl transition-all active:scale-[0.98] group/item"
                    >
                      <div className="h-10 w-10 rounded-xl bg-slate-800 overflow-hidden shrink-0 border border-white/5 p-1">
                        {ch.logo ? (
                          <Image
                            src={ch.logo}
                            alt=""
                            width={40}
                            height={40}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-xs font-black text-slate-500 uppercase italic">
                            {ch.name[0]}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-black text-white group-hover/item:text-cyan-400 transition-colors uppercase italic tracking-tighter">
                          {ch.name}
                        </div>
                        <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mt-0.5">
                          {ch.category}
                        </div>
                      </div>
                    </Link>
                  ))}
                  <div className="mt-2 pt-2 border-t border-white/5 grid grid-cols-2 gap-1">
                    <Link
                      href={`/search/profiles?q=${encodeURIComponent(searchQuery)}`}
                      onClick={() => setShowSuggestions(false)}
                      className="flex items-center gap-2 p-2 rounded-xl hover:bg-white/5 text-[9px] font-black uppercase text-slate-500 hover:text-cyan-400 transition-all"
                    >
                      <span className="material-icons text-sm">person_search</span> Search Profiles
                    </Link>
                    <Link
                      href={`/search/posts?q=${encodeURIComponent(searchQuery)}`}
                      onClick={() => setShowSuggestions(false)}
                      className="flex items-center gap-2 p-2 rounded-xl hover:bg-white/5 text-[9px] font-black uppercase text-slate-500 hover:text-cyan-400 transition-all"
                    >
                      <span className="material-icons text-sm">article</span> Search Posts
                    </Link>
                    <Link
                      href={`/search/epg?q=${encodeURIComponent(searchQuery)}`}
                      onClick={() => setShowSuggestions(false)}
                      className="flex items-center gap-2 p-2 rounded-xl hover:bg-white/5 text-[9px] font-black uppercase text-slate-500 hover:text-cyan-400 transition-all"
                    >
                      <span className="material-icons text-sm">event_note</span> Search EPG
                    </Link>
                    <Link
                      href={`/search?q=${encodeURIComponent(searchQuery)}`}
                      onClick={() => setShowSuggestions(false)}
                      className="flex items-center gap-2 p-2 rounded-xl hover:bg-white/5 text-[9px] font-black uppercase text-slate-500 hover:text-cyan-400 transition-all"
                    >
                      <span className="material-icons text-sm">tv</span> Search Channels
                    </Link>
                  </div>
                  <button
                    onClick={() => {
                      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
                      setShowSuggestions(false);
                    }}
                    className="w-full mt-2 p-3 text-center text-[10px] font-black text-cyan-500 hover:bg-cyan-500/10 rounded-2xl transition-all uppercase tracking-widest"
                  >
                    View All Signal Matches
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 ml-auto lg:ml-0">
              {mounted &&
                (user ? (
                  <div className="flex items-center gap-3">
                    <Link
                      href="/account"
                      className={`flex items-center gap-3 rounded-2xl px-4 py-2 transition-all duration-200 hover:scale-105 active:scale-95 border ${
                        pathname === '/account'
                          ? 'bg-white/10 text-white border-white/20 shadow-lg'
                          : 'text-slate-400 hover:text-white hover:bg-white/5 border-transparent'
                      }`}
                    >
                      <div className="h-8 w-8 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center text-slate-400 shadow-inner">
                        <span className="material-icons text-xl">account_circle</span>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">
                        {user.username || user.email.split('@')[0]}
                      </span>
                    </Link>
                    <button
                      onClick={() => void handleLogout()}
                      className="hidden sm:flex rounded-2xl px-6 py-3 text-[10px] font-black text-slate-500 hover:text-red-400 hover:bg-red-500/5 transition-all duration-200 active:scale-95 uppercase tracking-widest"
                    >
                      Exit
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Link
                      href="/account/signin"
                      className="rounded-2xl px-6 py-3 text-[10px] font-black text-slate-400 hover:text-white transition-all duration-200 hover:scale-105 active:scale-95 uppercase tracking-widest"
                    >
                      Login
                    </Link>
                    <Link
                      href="/account/signup"
                      className="rounded-2xl bg-cyan-500 px-8 py-3.5 text-[10px] font-black text-slate-950 hover:bg-cyan-400 transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-cyan-900/30 uppercase tracking-widest"
                    >
                      Register
                    </Link>
                  </div>
                ))}

              <button
                className="xl:hidden rounded-2xl p-3 text-slate-400 hover:text-white hover:bg-white/5 transition-all active:scale-90 bg-white/5 border border-white/10"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                <span className="material-icons">{menuOpen ? 'close' : 'menu'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu logic... */}
      </header>
    </>
  );
}
