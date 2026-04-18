'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { useNetworkStatus } from '@/hooks/use-network';
import type { Channel } from '@/types';

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

  useEffect(() => { setMounted(true); }, []);

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
    if (q.length < 2) { setSuggestions([]); return; }
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=5`);
      const data = await res.json();
      if (data.items) setSuggestions(data.items);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) fetchSuggestions(searchQuery);
      else setSuggestions([]);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const channelDropdownItems = [
    { label: 'Browse All', href: '/search', icon: '📺' },
    { label: 'By Category', href: '/search?tab=categories', icon: '🏷️' },
    { label: 'By Country', href: '/search?tab=countries', icon: '🌍' },
    { label: 'Top Rated', href: '/search?sort=rating', icon: '⭐', badge: 'New' },
  ];

  const communityDropdownItems = [
    { label: 'System Status', href: '/status', icon: '📊' },
    { label: 'Support tickets', href: '/forbidden', icon: '🎫' },
    ...(isAdmin() ? [{ label: 'Admin Panel', href: '/account/admin', icon: '🛡️' }] : []),
  ];

  return (
    <>
      {!isOnline && mounted && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-red-500/90 text-white text-xs font-semibold px-4 py-1.5 text-center shadow-lg backdrop-blur-md animate-fade-in">
          ⚠️ You are currently offline. Check your internet connection.
        </div>
      )}
      <header
        className={`fixed left-0 right-0 z-50 transition-all duration-500 transform-gpu ${!isOnline && mounted ? 'top-[28px]' : 'top-0'} ${
          scrolled ? 'bg-slate-950/80 backdrop-blur-xl border-b border-white/[0.06] shadow-xl shadow-black/20' : 'bg-transparent'
        }`}
      >
      <div className="mx-auto max-w-[1460px] px-4 sm:px-6">
        <div className="flex h-16 items-center gap-4">
          <Link href="/home" className="flex items-center gap-3 group shrink-0 transition-transform active:scale-95">
            <div className="text-xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-sky-400">
              IPTVCloud<span className="text-cyan-500">.</span>app
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1 ml-4">
            <Link
              href="/home"
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 ${
                pathname === '/home' ? 'bg-white/10 text-white shadow-lg shadow-white/5' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Home
            </Link>
            
            <NavbarDropdown 
              label="Channels" 
              items={channelDropdownItems} 
              active={pathname === '/search'} 
            />

            <Link
              href="/search?favorites=true"
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 ${
                pathname === '/search' && new URLSearchParams(window.location.search).get('favorites') ? 'bg-white/10 text-white shadow-lg shadow-white/5' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              EPG
            </Link>

            <NavbarDropdown 
              label="Community" 
              items={communityDropdownItems} 
              active={pathname === '/status'} 
            />
          </nav>

          <div ref={searchRef} className="hidden lg:flex flex-1 max-w-[300px] ml-auto relative group/search">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 group-focus-within/search:text-cyan-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35"/></svg>
            <input 
              type="text" 
              placeholder="Quick search..." 
              value={searchQuery}
              onFocus={() => setShowSuggestions(true)}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                   router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
                   setShowSuggestions(false);
                }
              }}
              className="w-full rounded-full border border-white/[0.08] bg-slate-900/50 py-2 pl-9 pr-4 text-xs text-white placeholder:text-slate-500 outline-none focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 transition-all backdrop-blur-sm"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl border border-white/[0.08] bg-slate-900/95 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden animate-fade-in z-50 transform-gpu p-1">
                {suggestions.map((ch) => (
                  <Link
                    key={ch.id}
                    href={`/channel/${encodeURIComponent(ch.id)}`}
                    onClick={() => setShowSuggestions(false)}
                    className="flex items-center gap-3 p-2.5 hover:bg-white/5 rounded-xl transition-all border-b border-white/[0.04] last:border-0 active:scale-[0.98]"
                  >
                    <div className="h-8 w-8 rounded-lg bg-slate-800 overflow-hidden shrink-0 border border-white/5">
                      {ch.logo ? <img src={ch.logo} alt="" className="h-full w-full object-contain" /> : <div className="h-full w-full flex items-center justify-center text-[10px] font-bold text-slate-500 uppercase">{ch.name[0]}</div>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate">{ch.name}</div>
                      <div className="text-[9px] text-slate-500 uppercase tracking-widest font-medium mt-0.5">{ch.category}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto lg:ml-0">
            {mounted && (user ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/profile"
                  className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-all duration-200 hover:scale-105 active:scale-95 ${
                    pathname === '/profile' ? 'bg-white/10 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="h-7 w-7 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-slate-400 shadow-inner">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                  </div>
                  <span className="font-bold hidden sm:inline">{user.name || user.email.split('@')[0]}</span>
                </Link>
                <button
                  onClick={() => void handleLogout()}
                  className="hidden sm:flex rounded-full px-4 py-2 text-sm font-bold text-slate-500 hover:text-white hover:bg-white/5 transition-all duration-200 active:scale-95 uppercase tracking-widest text-[10px]"
                >
                  Exit
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/account/signin"
                  className="rounded-full px-4 py-2 text-sm font-bold text-slate-400 hover:text-white transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  Login
                </Link>
                <Link
                  href="/account/signup"
                  className="rounded-full bg-cyan-500 px-5 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-400 transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-cyan-500/30"
                >
                  Register
                </Link>
              </div>
            ))}

            <button
              className="md:hidden rounded-lg p-2 text-slate-400 hover:text-white hover:bg-white/5 transition-all active:scale-90"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-white/[0.06] py-4 space-y-1 animate-fade-in transform-gpu">
             <Link href="/home" onClick={() => setMenuOpen(false)} className="block rounded-xl px-4 py-3 text-sm font-bold text-white hover:bg-white/5">Home</Link>
             <Link href="/search" onClick={() => setMenuOpen(false)} className="block rounded-xl px-4 py-3 text-sm font-bold text-white hover:bg-white/5">Channels</Link>
             <Link href="/search?favorites=true" onClick={() => setMenuOpen(false)} className="block rounded-xl px-4 py-3 text-sm font-bold text-white hover:bg-white/5">EPG Guide</Link>
             <Link href="/status" onClick={() => setMenuOpen(false)} className="block rounded-xl px-4 py-3 text-sm font-bold text-white hover:bg-white/5">Status</Link>
             
            <div className="pt-3 border-t border-white/[0.06]">
              {mounted && (user ? (
                <>
                  <Link href="/profile" onClick={() => setMenuOpen(false)} className="block rounded-xl px-4 py-3 text-sm text-slate-300 hover:text-white hover:bg-white/5">
                    Profile — {user.name || user.email.split('@')[0]}
                  </Link>
                  <Link href="/account/settings" onClick={() => setMenuOpen(false)} className="block rounded-xl px-4 py-3 text-sm text-slate-400 hover:text-white hover:bg-white/5">
                    Settings
                  </Link>
                  {isAdmin() && <Link href="/account/admin" onClick={() => setMenuOpen(false)} className="block rounded-xl px-4 py-3 text-sm text-violet-300 hover:text-white hover:bg-white/5">Admin Panel</Link>}
                  <button onClick={() => { setMenuOpen(false); void handleLogout(); }} className="w-full text-left rounded-xl px-4 py-3 text-sm text-red-400 hover:text-white hover:bg-white/5 font-bold uppercase tracking-widest text-[10px]">
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/account/signin" onClick={() => setMenuOpen(false)} className="block rounded-xl px-4 py-3 text-sm text-slate-300 hover:text-white hover:bg-white/5">Sign in</Link>
                  <Link href="/account/signup" onClick={() => setMenuOpen(false)} className="block rounded-xl px-4 py-3 text-sm font-medium text-cyan-400 hover:text-cyan-300">Get started</Link>
                </>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
    </>
  );
}
