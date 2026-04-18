'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSettingsStore } from '@/store/settings-store';
import { useAuthStore } from '@/store/auth-store';
import { useShortcutStore, ShortcutAction } from '@/store/shortcut-store';
import { ACCENT_COLORS } from '@/types';

export default function SettingsPage() {
  const router = useRouter();
  const { settings, updateSetting, resetSettings } = useSettingsStore();
  const { shortcuts, setShortcut, loadShortcuts } = useShortcutStore();
  const { user, token, isLoggedIn } = useAuthStore();
  const [msg, setMsg] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isLoggedIn()) {
      router.push('/account/signin');
      return;
    }

    // Load shortcuts from server
    fetch('/api/user/shortcuts', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) loadShortcuts(data);
      });
  }, [isLoggedIn, router, token, loadShortcuts]);

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
    const updated = { ...settings, [key]: value };
    updateSetting(key, value);
    void saveToServer(updated);
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
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6">
      <div className="mx-auto max-w-2xl space-y-8 animate-fade-in transform-gpu">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Settings</h1>
            <p className="text-slate-500 text-sm mt-1">
              Personalize your player and dashboard experience.
            </p>
          </div>
          <button
            onClick={() => {
              resetSettings();
              void saveToServer();
            }}
            className="rounded-xl border border-white/10 px-4 py-2 text-[10px] font-bold text-slate-500 hover:text-white uppercase tracking-widest transition-all active:scale-95"
          >
            Reset All
          </button>
        </div>

        <SettingsSection title="Appearance" icon="palette">
          <div className="space-y-8">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-4">
                Theme Accent Color
              </label>
              <div className="flex flex-wrap gap-3">
                {ACCENT_COLORS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => updateAndSync('accentColor', c.id)}
                    className={`group flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition-all active:scale-95 ${
                      settings.accentColor === c.id
                        ? 'border-white bg-white/[0.08] shadow-lg'
                        : 'border-white/[0.05] bg-white/[0.02] hover:border-white/20'
                    }`}
                  >
                    <span className="h-4 w-4 rounded-full" style={{ backgroundColor: c.hex }} />
                    <span
                      className={
                        settings.accentColor === c.id ? 'text-white font-bold' : 'text-slate-400'
                      }
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
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-4">
                Default Volume ({Math.round(settings.defaultVolume * 100)}%)
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.defaultVolume}
                onChange={(e) => updateAndSync('defaultVolume', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>
          </div>
        </SettingsSection>

        <SettingsSection title="Keyboard Shortcuts" icon="keyboard">
          <div className="space-y-6">
            <p className="text-sm text-slate-500 px-1">
              Customize how you control the player. Click a field and press a key to rebind.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {shortcuts.map((s) => (
                <div
                  key={s.action}
                  className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/[0.07] hover:bg-white/[0.05] transition-colors"
                >
                  <span className="text-xs font-bold text-slate-300 capitalize">
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
                    className="w-24 text-center rounded-xl bg-slate-950 border border-white/10 py-2 text-[10px] font-bold text-cyan-400 cursor-pointer focus:border-cyan-500 outline-none transition-all shadow-inner"
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
    <section className="rounded-[40px] border border-white/[0.08] bg-white/[0.03] p-8 shadow-xl backdrop-blur-xl">
      <div className="flex items-center gap-4 mb-8">
        <div className="h-10 w-10 rounded-2xl bg-accent/10 flex items-center justify-center text-xl text-accent">
          <span className="material-icons">{icon}</span>
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
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
        <div className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">
          {label}
        </div>
        {description && (
          <div className="text-xs text-slate-500 mt-1 leading-relaxed">{description}</div>
        )}
      </div>
      <button
        onClick={onChange}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-all transform-gpu active:scale-95 ${checked ? 'bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'bg-slate-800'}`}
      >
        <span
          className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow-xl transition-all duration-300 ${checked ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </button>
    </div>
  );
}
