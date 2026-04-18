'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';

export default function Navbar() {
  const pathname = usePathname();
  const { user, clearAuth, isAdmin } = useAuthStore();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    clearAuth();
    window.location.href = '/';
  };

  const navLinks = [
    { href: '/', label: 'Watch' },
    { href: '/settings', label: 'Settings' },
    ...(isAdmin() ? [{ href: '/admin', label: 'Admin' }] : []),
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-slate-950/90 backdrop-blur-xl border-b border-white/[0.06] shadow-xl shadow-black/20' : 'bg-transparent'
      }`}
    >
      <div className="mx-auto max-w-[1460px] px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 text-xs font-bold text-slate-950 shadow-lg shadow-cyan-500/25 group-hover:shadow-cyan-500/40 transition-shadow">
              IC
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-semibold text-white">IPTVCloud.app</div>
              <div className="text-xs text-slate-500">Live TV, smarter</div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  pathname === href
                    ? 'bg-white/10 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {mounted && (user ? (
              <div className="hidden md:flex items-center gap-2">
                <Link
                  href="/profile"
                  className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-colors ${
                    pathname === '/profile' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="h-6 w-6 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center text-xs font-bold text-slate-950">
                    {(user.name || user.email).charAt(0).toUpperCase()}
                  </div>
                  <span>{user.name || user.email.split('@')[0]}</span>
                </Link>
                <button
                  onClick={() => void handleLogout()}
                  className="rounded-full px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link
                  href="/login"
                  className="rounded-full px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-cyan-400 transition-colors shadow-lg shadow-cyan-500/20"
                >
                  Get started
                </Link>
              </div>
            ))}

            <button
              className="md:hidden rounded-lg p-2 text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
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
          <div className="md:hidden border-t border-white/[0.06] py-4 space-y-1">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={`block rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                  pathname === href ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {label}
              </Link>
            ))}
            <div className="pt-3 border-t border-white/[0.06]">
              {mounted && (user ? (
                <>
                  <Link href="/profile" onClick={() => setMenuOpen(false)} className="block rounded-xl px-4 py-3 text-sm text-slate-300 hover:text-white hover:bg-white/5">
                    Profile — {user.name || user.email.split('@')[0]}
                  </Link>
                  <button onClick={() => { setMenuOpen(false); void handleLogout(); }} className="w-full text-left rounded-xl px-4 py-3 text-sm text-slate-400 hover:text-white hover:bg-white/5">
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMenuOpen(false)} className="block rounded-xl px-4 py-3 text-sm text-slate-300 hover:text-white hover:bg-white/5">Sign in</Link>
                  <Link href="/register" onClick={() => setMenuOpen(false)} className="block rounded-xl px-4 py-3 text-sm font-medium text-cyan-400 hover:text-cyan-300">Get started</Link>
                </>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
