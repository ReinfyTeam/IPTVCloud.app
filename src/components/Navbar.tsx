'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { useNetworkStatus } from '@/hooks/use-network';
import type { Channel } from '@/types';
import dynamic from 'next/dynamic';
import BrandLogo from './BrandLogo';
import NavbarDropdown from './NavbarDropdown';
import VerifiedBadge from './VerifiedBadge';
const NotificationDropdown = dynamic(() => import('./NotificationDropdown'), { ssr: false });
import { encodeBase64Url } from '@/lib/base64';
import { getProxiedImageUrl } from '@/lib/image-proxy';

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
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

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
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setProfileOpen(false);
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
    { label: 'Browse Channels', href: '/search/channels', icon: 'explore' },
    ...(user
      ? [{ label: 'Create your own channel', href: '/channel/create', icon: 'add_circle' }]
      : []),
    { label: 'Trending Channels', href: '/search/channels?sort=viewers', icon: 'trending_up' },
    ...(user
      ? [{ label: 'Favorited Channels', href: '/search/channels?favorites=true', icon: 'star' }]
      : []),
    { label: 'Top Rated Channels', href: '/search/channels?sort=favorites', icon: 'grade' },
    { label: 'New Channels', href: '/search/channels?sort=newest', icon: 'fiber_new' },
    {
      label: 'Recommended Channels',
      href: '/search/channels?sort=recommended',
      icon: 'auto_awesome',
    },
    { label: 'Electronic Program Guide', href: '/epg', icon: 'event_note' },
  ];

  const communityDropdownItems = [
    { label: 'Browse Newsfeed', href: '/posts', icon: 'forum' },
    { label: 'Trending Posts', href: '/posts?sort=trending', icon: 'whatshot' },
    { label: 'New Posts', href: '/posts?sort=newest', icon: 'fiber_new' },
    { label: 'Recommended Posts', href: '/posts?sort=recommended', icon: 'auto_awesome' },
  ];

  const statusDropdownItems = [
    { label: 'System Status', href: '/status', icon: 'bar_chart' },
    { label: 'Support ticket', href: '/support', icon: 'confirmation_number' },
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
          scrolled ? 'glass h-14' : 'h-16 bg-transparent border-transparent'
        }`}
      >
        <div className="mx-auto max-w-[1460px] px-4 sm:px-6">
          <div className="flex h-14 items-center gap-4">
            <Link
              href="/home"
              className="flex items-center gap-3 group shrink-0 transition-transform active:scale-95"
            >
              <BrandLogo className="text-xl" />
            </Link>

            <nav className="hidden xl:flex items-center gap-1 ml-8">
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
              className={`hidden lg:flex flex-1 max-w-[480px] ml-auto relative group/search ${
                pathname === '/home' && !scrolled ? 'hidden' : ''
              }`}
            >
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                <span className="material-icons text-xl text-slate-500 group-focus-within/search:text-cyan-400 transition-colors">
                  search
                </span>
              </div>
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
                className="w-full rounded-2xl border border-white/[0.05] bg-slate-900/50 py-3 pl-12 pr-4 text-[11px] font-bold text-white placeholder:text-slate-600 outline-none focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 transition-all backdrop-blur-sm shadow-inner"
              />
              {false && (
                <button className="lg:hidden p-2 text-foreground-muted">
                  <span className="material-icons">close</span>
                </button>
              )}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-3 rounded-[32px] border border-white/[0.08] bg-slate-900/95 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden animate-fade-in z-50 transform-gpu p-2">
                  <div className="px-4 py-2 text-[9px] font-black text-foreground-muted uppercase tracking-[0.3em] border-b border-white/[0.05] mb-1">
                    Suggestions
                  </div>
                  {suggestions.map((ch) => (
                    <Link
                      key={ch.id}
                      href={`/channel/${encodeBase64Url(ch.id)}`}
                      onClick={() => {
                        setShowSuggestions(false);
                      }}
                      className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-2xl transition-all active:scale-[0.98] group/item"
                    >
                      <div className="h-10 w-10 rounded-xl bg-slate-800 overflow-hidden shrink-0 border border-white/5 p-1">
                        {ch.logo ? (
                          <Image
                            src={getProxiedImageUrl(ch.logo)}
                            alt=""
                            width={40}
                            height={40}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-foreground-muted">
                            <span className="material-icons text-xl">tv</span>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-black text-foreground group-hover/item:text-cyan-400 transition-colors uppercase italic tracking-tighter">
                          {ch.name}
                        </div>
                        <div className="text-[9px] text-foreground-muted uppercase tracking-widest font-bold mt-0.5">
                          {ch.category}
                        </div>
                      </div>
                    </Link>
                  ))}
                  <div className="mt-2 pt-2 border-t border-white/[0.05] grid grid-cols-2 gap-1">
                    <Link
                      href={`/search/profiles?q=${encodeURIComponent(searchQuery)}`}
                      onClick={() => {
                        setShowSuggestions(false);
                      }}
                      className="flex items-center gap-2 p-2 rounded-xl hover:bg-white/5 text-[9px] font-black uppercase text-foreground-muted hover:text-cyan-400 transition-all"
                    >
                      <span className="material-icons text-sm">person_search</span> Search Profiles
                    </Link>
                    <Link
                      href={`/search/posts?q=${encodeURIComponent(searchQuery)}`}
                      onClick={() => {
                        setShowSuggestions(false);
                      }}
                      className="flex items-center gap-2 p-2 rounded-xl hover:bg-white/5 text-[9px] font-black uppercase text-foreground-muted hover:text-cyan-400 transition-all"
                    >
                      <span className="material-icons text-sm">article</span> Search Posts
                    </Link>
                    <Link
                      href={`/search/epg?q=${encodeURIComponent(searchQuery)}`}
                      onClick={() => {
                        setShowSuggestions(false);
                      }}
                      className="flex items-center gap-2 p-2 rounded-xl hover:bg-white/5 text-[9px] font-black uppercase text-foreground-muted hover:text-cyan-400 transition-all"
                    >
                      <span className="material-icons text-sm">event_note</span> Search EPG
                    </Link>
                    <Link
                      href={`/search?q=${encodeURIComponent(searchQuery)}`}
                      onClick={() => {
                        setShowSuggestions(false);
                      }}
                      className="flex items-center gap-2 p-2 rounded-xl hover:bg-white/5 text-[9px] font-black uppercase text-foreground-muted hover:text-cyan-400 transition-all"
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
                    View Search
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 ml-auto lg:ml-0">
              {!user && mounted && (
                <div className="hidden xl:flex items-center gap-2 mr-2">
                  <Link
                    href="/account/signin"
                    className="rounded-xl px-4 py-2 text-[10px] font-black text-foreground-muted hover:text-white transition-all uppercase tracking-widest"
                  >
                    Login
                  </Link>
                  <Link
                    href="/account/signup"
                    className="rounded-xl bg-cyan-500 px-5 py-2 text-[10px] font-black text-slate-950 hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-900/30 uppercase tracking-widest"
                  >
                    Register
                  </Link>
                </div>
              )}

              {mounted && user && (
                <div className="hidden sm:block">
                  <NotificationDropdown />
                </div>
              )}

              {mounted && user && (
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className={`flex items-center gap-2 rounded-xl px-2 py-1 transition-all duration-200 hover:scale-105 active:scale-95 border ${
                      profileOpen ||
                      pathname.startsWith('/profile') ||
                      pathname.startsWith('/account')
                        ? 'bg-white/10 text-white border-white/20 shadow-lg'
                        : 'text-foreground-muted hover:text-white hover:bg-white/5 border-transparent'
                    }`}
                  >
                    <div className="h-7 w-7 rounded-lg bg-slate-900 border border-white/10 overflow-hidden flex items-center justify-center text-foreground-muted shadow-inner shrink-0">
                      {user.profileIconUrl ? (
                        <Image
                          src={getProxiedImageUrl(user.profileIconUrl)}
                          alt=""
                          width={28}
                          height={28}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="material-icons text-lg">account_circle</span>
                      )}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline mr-1">
                      {user.username || user.email.split('@')[0]}
                    </span>
                  </button>

                  {profileOpen && (
                    <div className="absolute top-full right-0 mt-3 w-64 rounded-[24px] border border-white/[0.08] bg-slate-900/95 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-fade-in z-50 p-2">
                      <div className="p-4 border-b border-white/[0.05] mb-2 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-slate-800 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                          {user.profileIconUrl ? (
                            <Image
                              src={getProxiedImageUrl(user.profileIconUrl)}
                              alt=""
                              width={40}
                              height={40}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="material-icons text-xl text-slate-500">
                              account_circle
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-black text-foreground truncate flex items-center gap-1">
                            {user.username || user.email.split('@')[0]}
                            {user.isVerified && <VerifiedBadge className="text-[12px] ml-1" />}
                          </div>
                          <div className="text-[10px] text-foreground-muted truncate">
                            {user.email}
                          </div>
                        </div>
                      </div>
                      <div className="grid gap-1">
                        <DropdownLink
                          href={`/profile/${user.username || user.id}`}
                          icon="person"
                          label="Show profile"
                          setOpen={setProfileOpen}
                        />
                        <DropdownLink
                          href="/account/posts"
                          icon="article"
                          label="Manage Posts"
                          setOpen={setProfileOpen}
                        />
                        <DropdownLink
                          href="/account/messages"
                          icon="forum"
                          label="My Messages"
                          setOpen={setProfileOpen}
                        />
                        {isAdmin() && (
                          <DropdownLink
                            href="/account/admin"
                            icon="security"
                            label="Admin Dashboard"
                            setOpen={setProfileOpen}
                          />
                        )}
                        <DropdownLink
                          href="/account/settings"
                          icon="settings"
                          label="Personal Settings"
                          setOpen={setProfileOpen}
                        />
                        <DropdownLink
                          href="/account/settings/credentials"
                          icon="lock"
                          label="Privacy & Security"
                          setOpen={setProfileOpen}
                        />
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-4 p-4 hover:bg-red-500/10 rounded-2xl transition-all group/item text-left text-red-400 mt-1"
                        >
                          <div className="h-9 w-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center group-hover/item:bg-red-500 group-hover/item:text-slate-900 transition-all">
                            <span className="material-icons text-lg">logout</span>
                          </div>
                          <span className="text-[11px] font-black uppercase tracking-widest group-hover/item:text-red-300">
                            Logout
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {mounted && user && (
                <Link
                  href="/account/notifications"
                  className="h-10 w-10 sm:hidden flex items-center justify-center rounded-xl text-foreground-muted hover:text-white hover:bg-white/5 transition-all border border-transparent hover:border-white/10 active:scale-95 relative"
                >
                  <span className="material-icons text-xl">notifications</span>
                  <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
                </Link>
              )}

              <button
                className={`xl:hidden h-10 w-11 flex items-center justify-center rounded-xl text-foreground-muted hover:text-white hover:bg-white/5 transition-all active:scale-90 bg-white/5 border ${menuOpen ? 'border-cyan-500/50' : 'border-white/10'} ml-1`}
                onClick={() => setMenuOpen(!menuOpen)}
              >
                <span className="material-icons text-2xl">{menuOpen ? 'close' : 'menu'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu logic */}
        <div
          className={`xl:hidden fixed top-[56px] inset-0 z-[70] bg-slate-950/98 backdrop-blur-2xl border-t border-white/[0.08] transition-transform duration-500 ease-out transform-gpu flex flex-col shadow-2xl ${menuOpen ? 'translate-x-0' : 'translate-x-full'}`}
          style={{ top: '56px' }}
        >
          <div className="px-6 py-8 flex-1 overflow-y-auto space-y-8">
            {mounted && user && (
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="h-12 w-12 rounded-xl bg-slate-900 border border-white/10 overflow-hidden flex items-center justify-center">
                  {user.profileIconUrl ? (
                    <Image
                      src={getProxiedImageUrl(user.profileIconUrl)}
                      alt=""
                      width={48}
                      height={48}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="material-icons text-2xl text-slate-600">account_circle</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-black text-white truncate flex items-center gap-1">
                    {user.username || user.email.split('@')[0]}
                    {user.isVerified && <VerifiedBadge className="text-sm" />}
                  </div>
                  <div className="text-xs text-slate-500 truncate">{user.email}</div>
                </div>
              </div>
            )}

            {/* Search Bar for Mobile */}
            <div className="relative group/search-mobile">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                <span className="material-icons text-xl text-slate-500 group-focus-within/search-mobile:text-cyan-400 transition-colors">
                  search
                </span>
              </div>
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
                    setMenuOpen(false);
                  }
                }}
                className="w-full rounded-2xl border border-white/10 bg-slate-900/50 py-4 pl-12 pr-4 text-sm font-bold text-white placeholder:text-slate-600 outline-none focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 transition-all backdrop-blur-sm shadow-inner"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-3 rounded-[32px] border border-white/[0.08] bg-slate-900 shadow-2xl overflow-hidden z-50 p-2">
                  {suggestions.slice(0, 5).map((ch) => (
                    <Link
                      key={ch.id}
                      href={`/channel/${encodeBase64Url(ch.id)}`}
                      onClick={() => {
                        setShowSuggestions(false);
                        setMenuOpen(false);
                      }}
                      className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-2xl transition-all"
                    >
                      <div className="h-10 w-10 rounded-xl bg-slate-800 overflow-hidden shrink-0 border border-white/10 p-1">
                        {ch.logo ? (
                          <Image
                            src={getProxiedImageUrl(ch.logo)}
                            alt=""
                            width={40}
                            height={40}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-foreground-muted">
                            <span className="material-icons text-xl">tv</span>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-black text-foreground uppercase truncate">
                          {ch.name}
                        </div>
                      </div>
                    </Link>
                  ))}
                  <button
                    onClick={() => {
                      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
                      setShowSuggestions(false);
                      setMenuOpen(false);
                    }}
                    className="w-full mt-2 p-3 text-center text-[10px] font-black text-cyan-500 hover:bg-cyan-500/10 rounded-2xl transition-all uppercase tracking-widest"
                  >
                    View All Results
                  </button>
                </div>
              )}
            </div>

            {!user && (
              <div className="grid grid-cols-2 gap-4">
                <Link
                  href="/account/signin"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 px-4 py-4 text-xs font-black text-foreground hover:bg-white/10 transition-all uppercase tracking-widest"
                >
                  Login
                </Link>
                <Link
                  href="/account/signup"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-center rounded-2xl bg-cyan-500 px-4 py-4 text-xs font-black text-slate-950 hover:bg-cyan-400 transition-all shadow-lg shadow-cyan-900/30 uppercase tracking-widest"
                >
                  Register
                </Link>
              </div>
            )}
            <nav className="grid gap-3">
              <MobileSection label="Channels" items={channelDropdownItems} setOpen={setMenuOpen} />
              <MobileSection
                label="Community"
                items={communityDropdownItems}
                setOpen={setMenuOpen}
              />
              <MobileSection label="Status" items={statusDropdownItems} setOpen={setMenuOpen} />
              <MobileSection label="About Us" items={aboutDropdownItems} setOpen={setMenuOpen} />
            </nav>
          </div>
        </div>
      </header>
    </>
  );
}

function DropdownLink({
  href,
  icon,
  label,
  setOpen,
}: {
  href: string;
  icon: string;
  label: string;
  setOpen: (v: boolean) => void;
}) {
  return (
    <Link
      href={href}
      onClick={() => setOpen(false)}
      className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-2xl transition-all active:scale-[0.98] group/item"
    >
      <div className="h-9 w-9 rounded-xl bg-slate-800 border border-white/5 flex items-center justify-center text-slate-500 group-hover/item:text-cyan-400 group-hover/item:border-cyan-500/20 transition-all">
        <span className="material-icons text-lg">{icon}</span>
      </div>
      <span className="text-[11px] font-black text-slate-400 group-hover/item:text-white transition-colors uppercase tracking-widest">
        {label}
      </span>
    </Link>
  );
}

function MobileSection({
  label,
  items,
  setOpen,
}: {
  label: string;
  items: any[];
  setOpen: (v: boolean) => void;
}) {
  const [open, setOpenSection] = useState(false);
  return (
    <div className="border border-white/[0.08] rounded-2xl bg-white/[0.03] overflow-hidden transition-all">
      <button
        onClick={() => setOpenSection(!open)}
        className="w-full flex items-center justify-between p-5 text-slate-400 hover:bg-white/5 transition-all"
      >
        <span className="text-xs font-black uppercase tracking-widest">{label}</span>
        <span
          className={`material-icons text-sm transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        >
          expand_more
        </span>
      </button>
      {open && (
        <div className="px-2 pb-2 grid gap-1 border-t border-white/[0.05] pt-2 animate-fade-in">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-all"
            >
              <div className="h-9 w-9 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center text-slate-500 group-hover:text-cyan-400 transition-all">
                {item.icon && <span className="material-icons text-lg">{item.icon}</span>}
              </div>
              <span className="text-[11px] font-black uppercase tracking-widest">{item.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
