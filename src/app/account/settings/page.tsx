'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSettingsStore } from '@/store/settings-store';
import { useAuthStore } from '@/store/auth-store';
import { useShortcutStore, ShortcutAction } from '@/store/shortcut-store';
import { ACCENT_COLORS } from '@/types';

export default function SettingsPage() {
  const router = useRouter();
  const { settings, updateSetting, resetSettings } = useSettingsStore();
  const { shortcuts, setShortcut, loadShortcuts } = useShortcutStore();
  const { user, token, isLoggedIn, setAuth } = useAuthStore();

  const [username, setUsername] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isLoggedIn()) {
      router.push('/account/signin');
      return;
    }
    setUsername(user?.username || '');

    // Load shortcuts from server
    fetch('/api/user/shortcuts', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) loadShortcuts(data);
      });
  }, [isLoggedIn, router, token, loadShortcuts, user?.username]);

  const saveToServer = useCallback(
    async (newSettings?: any) => {
      if (!user || !token) return;
      try {
        await fetch('/api/settings/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(newSettings || settings),
        });
        setMsg('Settings synced.');
      } catch {
        setMsg('Error syncing settings.');
      } finally {
        setTimeout(() => setMsg(''), 2000);
      }
    },
    [user, token, settings],
  );

  const updateAndSync = (key: keyof typeof settings, value: any) => {
    updateSetting(key, value);
    void saveToServer({ ...settings, [key]: value });
  };

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || username === user?.username) return;
    setMsg('Updating...');
    setError('');
    try {
      const res = await fetch('/api/user/update-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg('Username updated successfully.');
        if (data.user) setAuth(data.user, token!);
      } else {
        setError(data.error || 'Update failed.');
        setMsg('');
      }
    } catch {
      setError('Network error.');
    }
  };

  const handleShortcutChange = async (action: ShortcutAction, key: string) => {
    setShortcut(action, key);
    if (token) {
      await fetch('/api/user/shortcuts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, key }),
      });
    }
  };

  if (!mounted || !isLoggedIn()) return null;

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 bg-slate-950">
      <div className="mx-auto max-w-2xl space-y-12 animate-fade-in transform-gpu">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none">
              Settings<span className="text-cyan-500">.</span>
            </h1>
            <p className="text-slate-500 text-sm mt-1 font-medium">
              Personalize your player and dashboard experience.
            </p>
          </div>
          <button
            onClick={() => {
              resetSettings();
              void saveToServer();
            }}
            className="rounded-2xl border border-white/10 px-6 py-2.5 text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest transition-all active:scale-95"
          >
            Reset All
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold animate-fade-in">
            {error}
          </div>
        )}

        {/* Global Account Redirect */}
        <section className="p-8 rounded-[40px] bg-gradient-to-br from-cyan-600/20 to-indigo-600/20 border border-white/[0.08] backdrop-blur-xl shadow-2xl flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center text-white">
              <span className="material-icons">security</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Security & Credentials
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Change email, password, and setup 2FA.
              </p>
            </div>
          </div>
          <Link
            href="/account/settings/credentials"
            className="px-6 py-3 rounded-2xl bg-white text-slate-950 text-[10px] font-black uppercase tracking-widest hover:bg-cyan-400 transition-all active:scale-95"
          >
            Manage
          </Link>
        </section>

        {/* Identity Section */}
        <SettingsSection title="Identity" icon="person">
          <form onSubmit={handleUpdateUsername} className="space-y-6">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">
                Global Username
              </label>
              <div className="flex gap-4">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  className="flex-1 rounded-2xl border border-white/10 bg-slate-900/50 p-4 text-sm text-white outline-none focus:border-cyan-500 transition-all shadow-inner"
                />
                <button
                  type="submit"
                  disabled={username === user?.username || !username}
                  className="px-8 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50"
                >
                  Save
                </button>
              </div>
              <p className="text-[10px] text-slate-600 mt-3 italic px-1">
                Note: Usernames can only be changed once every 3 months.
              </p>
            </div>
          </form>
        </SettingsSection>

        <SettingsSection title="Appearance" icon="palette">
          <div className="space-y-8">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-4">
                Theme Accent Color
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {ACCENT_COLORS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => updateAndSync('accentColor', c.id)}
                    className={`group flex flex-col items-center gap-3 p-4 rounded-3xl border transition-all active:scale-95 ${
                      settings.accentColor === c.id
                        ? 'border-white bg-white/[0.08] shadow-lg shadow-black/20'
                        : 'border-white/[0.05] bg-white/[0.02] hover:border-white/20'
                    }`}
                  >
                    <span
                      className="h-6 w-6 rounded-full shadow-inner"
                      style={{ backgroundColor: c.hex }}
                    />
                    <span
                      className={`text-[10px] font-black uppercase tracking-widest ${
                        settings.accentColor === c.id
                          ? 'text-white'
                          : 'text-slate-500 group-hover:text-slate-300'
                      }`}
                    >
                      {c.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <Toggle
              label="Dark Mode"
              description="Switch between light and dark visual themes."
              checked={settings.darkMode}
              onChange={() => updateAndSync('darkMode', !settings.darkMode)}
            />
          </div>
        </SettingsSection>

        <SettingsSection title="Player Preferences" icon="live_tv">
          <div className="space-y-8">
            <Toggle
              label="Autoplay"
              description="Start playing streams automatically when selected."
              checked={settings.autoplay}
              onChange={() => updateAndSync('autoplay', !settings.autoplay)}
            />
            <Toggle
              label="Show EPG Strip"
              description="Display the program guide strip inside the player overlay."
              checked={settings.showEpg}
              onChange={() => updateAndSync('showEpg', !settings.showEpg)}
            />
            <Toggle
              label="Performance Mode"
              description="Optimize animations for smoother performance on low-end devices."
              checked={settings.performanceMode}
              onChange={() => updateAndSync('performanceMode', !settings.performanceMode)}
            />
            <div>
              <div className="flex justify-between items-center mb-4 px-1">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                  Default Volume
                </label>
                <span className="text-xs font-black text-cyan-400">
                  {Math.round(settings.defaultVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.defaultVolume}
                onChange={(e) => updateAndSync('defaultVolume', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-white"
              />
            </div>
          </div>
        </SettingsSection>

        <SettingsSection title="Keyboard Shortcuts" icon="keyboard">
          <div className="space-y-6">
            <p className="text-sm text-slate-500 px-1 font-medium leading-relaxed">
              Customize how you control the player. Click a field and press any key to rebind.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {shortcuts.map((s) => (
                <div
                  key={s.action}
                  className="flex items-center justify-between p-5 rounded-3xl bg-white/[0.03] border border-white/[0.07] hover:bg-white/[0.05] transition-all"
                >
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {s.action.replace(/_/g, ' ')}
                  </span>
                  <input
                    type="text"
                    readOnly
                    value={s.key === ' ' ? 'Space' : s.key}
                    onKeyDown={(e) => {
                      e.preventDefault();
                      void handleShortcutChange(s.action, e.key);
                    }}
                    className="w-24 text-center rounded-xl bg-slate-950 border border-white/10 py-2.5 text-[11px] font-black text-cyan-400 cursor-pointer focus:border-cyan-500 outline-none transition-all shadow-inner"
                  />
                </div>
              ))}
            </div>
          </div>
        </SettingsSection>

        {msg && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 rounded-full bg-cyan-500 px-8 py-3 text-xs font-bold text-slate-950 shadow-2xl animate-fade-up z-50">
            {msg}
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[40px] border border-white/[0.08] bg-white/[0.03] p-8 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center gap-4 mb-8">
        <div className="h-10 w-10 rounded-2xl bg-white/5 flex items-center justify-center text-xl text-slate-400">
          <span className="material-icons">{icon}</span>
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight uppercase italic leading-none">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 group">
      <div className="min-w-0">
        <div className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors uppercase tracking-tight">
          {label}
        </div>
        {description && (
          <div className="text-xs text-slate-500 mt-1 leading-relaxed font-medium">
            {description}
          </div>
        )}
      </div>
      <button
        onClick={onChange}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-all transform-gpu active:scale-95 ${checked ? 'bg-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.4)]' : 'bg-slate-800'}`}
      >
        <span
          className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow-xl transition-all duration-300 ${checked ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </button>
    </div>
  );
}
