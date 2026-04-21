'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useSettingsStore } from '@/store/settings-store';
import { useAuthStore } from '@/store/auth-store';
import { useShortcutStore, ShortcutAction } from '@/store/shortcut-store';
import { ACCENT_COLORS } from '@/types';
import { getProxiedImageUrl } from '@/lib/image-proxy';

export default function SettingsPage() {
  const router = useRouter();
  const { settings, updateSetting, resetSettings } = useSettingsStore();
  const { shortcuts, setShortcut, loadShortcuts } = useShortcutStore();
  const { user, token, isLoggedIn, setAuth } = useAuthStore();

  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [about, setAbout] = useState('');
  const [privacySettings, setPrivacySettings] = useState<any>({
    showPostHistory: true,
    showCommentHistory: true,
    showRecentlyWatched: true,
    showFollowList: true,
  });
  const [profileIcon, setProfileIcon] = useState('account_circle');
  const [profileIconUrl, setProfileIconUrl] = useState('');
  const [uploading, setUploading] = useState(false);
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
    setBio(user?.bio || '');
    setAbout(user?.about || '');
    setProfileIcon(user?.profileIcon || 'account_circle');
    setProfileIconUrl(user?.profileIconUrl || '');
    if (user?.privacySettings) {
      try {
        setPrivacySettings(JSON.parse((user as any).privacySettings));
      } catch {}
    }

    // Load shortcuts from server
    if (token) {
      fetch('/api/user/shortcuts', { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) loadShortcuts(data);
        });
    }
  }, [isLoggedIn, router, token, loadShortcuts, user]);

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

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/attachments/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setProfileIconUrl(data.url);
        setProfileIcon(''); // Clear material icon if using custom
      }
    } catch {
      setError('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('Updating...');
    setError('');
    try {
      const res = await fetch('/api/user/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bio, about, privacySettings, profileIcon, profileIconUrl }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg('Profile updated successfully.');
        if (data.user) setAuth(data.user, token!);
      } else {
        setError(data.error || 'Update failed.');
        setMsg('');
      }
    } catch {
      setError('Network error.');
    }
  };

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
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 bg-background">
      <div className="mx-auto max-w-2xl space-y-8 sm:space-y-12 animate-fade-in transform-gpu">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground uppercase italic tracking-tighter leading-none">
              Settings<span className="text-cyan-500">.</span>
            </h1>
            <p className="text-foreground-muted text-xs sm:text-sm mt-1 font-medium">
              Personalize your player and dashboard experience.
            </p>
          </div>
          <button
            onClick={() => {
              resetSettings();
              void saveToServer();
            }}
            className="rounded-xl sm:rounded-2xl border border-border px-6 py-2.5 text-[9px] sm:text-[10px] font-black text-foreground-muted hover:text-foreground uppercase tracking-widest transition-all active:scale-95 w-full sm:w-auto text-center"
          >
            Reset All
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs sm:text-sm font-bold animate-fade-in">
            {error}
          </div>
        )}

        {/* Global Account Redirect */}
        <section className="p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] bg-gradient-to-br from-cyan-600/20 to-indigo-600/20 border border-border backdrop-blur-xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 w-full">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-white/10 dark:bg-black/10 flex items-center justify-center text-foreground shrink-0">
              <span className="material-icons text-xl sm:text-2xl">security</span>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                Security & Credentials
              </h2>
              <p className="text-[10px] sm:text-xs text-foreground-muted/80 font-medium">
                Change email, password, and setup 2FA.
              </p>
            </div>
          </div>
          <Link
            href="/account/settings/credentials"
            className="w-full sm:w-auto px-6 py-3 rounded-xl sm:rounded-2xl bg-foreground text-background text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-cyan-400 transition-all active:scale-95 text-center"
          >
            Manage
          </Link>
        </section>

        {/* Identity Section */}
        <SettingsSection title="Identity" icon="person">
          <form onSubmit={handleUpdateUsername} className="space-y-6">
            <div>
              <label className="block text-[10px] sm:text-[11px] font-bold text-foreground-muted uppercase tracking-widest mb-2 px-1">
                Global Username
              </label>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  className="flex-1 rounded-xl sm:rounded-2xl border border-border bg-background-elevated/50 p-4 text-sm text-foreground outline-none focus:border-cyan-500 transition-all shadow-inner"
                />
                <button
                  type="submit"
                  disabled={username === user?.username || !username}
                  className="px-8 py-4 sm:py-0 rounded-xl sm:rounded-2xl bg-foreground/5 border border-border text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-foreground hover:bg-foreground/10 transition-all active:scale-95 disabled:opacity-50"
                >
                  Save
                </button>
              </div>
              <p className="text-[9px] sm:text-[10px] text-foreground-muted mt-3 italic px-1 leading-relaxed">
                Note: Usernames can only be changed once every 3 months.
              </p>
            </div>
          </form>
        </SettingsSection>

        <SettingsSection title="Appearance" icon="palette">
          <div className="space-y-8">
            <div>
              <div className="flex items-center justify-between mb-4 px-1">
                <label className="block text-[10px] sm:text-[11px] font-bold text-foreground-muted uppercase tracking-widest">
                  Theme Color
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] sm:text-[10px] font-black text-foreground-muted uppercase tracking-widest">
                    Custom
                  </span>
                  <input
                    type="color"
                    value={settings.accentColor.startsWith('#') ? settings.accentColor : '#06b6d4'}
                    onChange={(e) => updateAndSync('accentColor', e.target.value)}
                    className="h-5 w-5 sm:h-6 sm:w-6 rounded-md bg-transparent border-none cursor-pointer"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {ACCENT_COLORS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => updateAndSync('accentColor', c.id)}
                    className={`group flex flex-col items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-2xl sm:rounded-3xl border transition-all active:scale-95 ${
                      settings.accentColor === c.id
                        ? 'border-accent bg-accent/10 shadow-lg shadow-black/5'
                        : 'border-border bg-background-elevated/20 hover:border-accent/30'
                    }`}
                  >
                    <span
                      className="h-5 w-5 sm:h-6 sm:w-6 rounded-full shadow-inner"
                      style={{ backgroundColor: c.hex }}
                    />
                    <span
                      className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest ${
                        settings.accentColor === c.id
                          ? 'text-accent'
                          : 'text-foreground-muted group-hover:text-foreground'
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
              isBeta
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
                <label className="block text-[10px] sm:text-[11px] font-bold text-foreground-muted uppercase tracking-widest">
                  Default Volume
                </label>
                <span className="text-xs font-black text-accent">
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
                className="w-full h-1.5 bg-background-elevated rounded-lg appearance-none cursor-pointer accent-accent"
              />
            </div>
          </div>
        </SettingsSection>

        <SettingsSection title="Keyboard Shortcuts" icon="keyboard">
          <div className="space-y-6">
            <p className="text-xs sm:text-sm text-foreground-muted px-1 font-medium leading-relaxed">
              Customize how you control the player. Click a field and press any key to rebind.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {shortcuts.map((s) => (
                <div
                  key={s.action}
                  className="flex items-center justify-between p-4 sm:p-5 rounded-[24px] sm:rounded-3xl bg-background-elevated/30 border border-border hover:bg-background-elevated/50 transition-all"
                >
                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-foreground-muted">
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
                    className="w-20 sm:w-24 text-center rounded-lg sm:rounded-xl bg-background border border-border py-2 sm:py-2.5 text-[10px] sm:text-[11px] font-black text-accent cursor-pointer focus:border-accent outline-none transition-all shadow-inner"
                  />
                </div>
              ))}
            </div>
          </div>
        </SettingsSection>

        <SettingsSection title="Profile & Privacy" icon="account_box">
          <form onSubmit={handleUpdateProfile} className="space-y-8">
            <div>
              <label className="block text-[10px] sm:text-[11px] font-bold text-foreground-muted uppercase tracking-widest mb-3 px-1">
                Profile Icon
              </label>

              <div className="flex flex-col sm:flex-row gap-6 items-center p-5 sm:p-6 rounded-[24px] sm:rounded-[32px] bg-background-elevated/30 border border-border mb-6">
                <div className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-[24px] sm:rounded-[32px] bg-background border border-border overflow-hidden shrink-0 shadow-inner flex items-center justify-center">
                  {profileIconUrl ? (
                    <Image
                      src={getProxiedImageUrl(profileIconUrl)}
                      alt="Preview"
                      fill
                      className="object-cover"
                    />
                  ) : profileIcon ? (
                    <span className="material-icons text-4xl sm:text-5xl text-foreground-muted">
                      {profileIcon}
                    </span>
                  ) : (
                    <span className="material-icons text-4xl sm:text-5xl text-foreground-muted">
                      account_circle
                    </span>
                  )}
                  {uploading && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <div className="h-6 w-6 rounded-full border-2 border-white/10 border-t-accent animate-spin" />
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-4 text-center sm:text-left w-full">
                  <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                    {[
                      'account_circle',
                      'person',
                      'face',
                      'psychology',
                      'pets',
                      'sports_esports',
                      'rocket_launch',
                      'celebration',
                    ].map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => {
                          setProfileIcon(icon);
                          setProfileIconUrl('');
                        }}
                        className={`h-9 w-9 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl flex items-center justify-center transition-all ${
                          profileIcon === icon && !profileIconUrl
                            ? 'bg-accent text-slate-900 shadow-lg shadow-accent/20 scale-110'
                            : 'bg-background/50 text-foreground-muted hover:text-foreground hover:bg-background'
                        }`}
                      >
                        <span className="material-icons text-lg">{icon}</span>
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 sm:gap-4">
                    <label
                      className={`flex-1 cursor-pointer flex items-center justify-center gap-2 py-3 rounded-xl sm:rounded-2xl border border-dashed border-border text-foreground-muted hover:text-foreground hover:border-accent/50 transition-all ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleIconUpload}
                        disabled={uploading}
                      />
                      <span className="material-icons text-sm">upload</span>
                      <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">
                        {uploading ? 'Uploading...' : 'Custom Icon'}
                      </span>
                    </label>
                    {(profileIconUrl || profileIcon !== 'account_circle') && (
                      <button
                        type="button"
                        onClick={() => {
                          setProfileIcon('account_circle');
                          setProfileIconUrl('');
                        }}
                        className="p-3 rounded-xl sm:rounded-2xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                      >
                        <span className="material-icons text-sm">delete</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] sm:text-[11px] font-bold text-foreground-muted uppercase tracking-widest mb-2 px-1">
                  Bio (Short)
                </label>
                <input
                  type="text"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  maxLength={160}
                  className="w-full rounded-xl sm:rounded-2xl border border-border bg-background-elevated/50 p-4 text-sm text-foreground outline-none focus:border-accent transition-all shadow-inner"
                />
              </div>
              <div>
                <label className="block text-[10px] sm:text-[11px] font-bold text-foreground-muted uppercase tracking-widest mb-2 px-1">
                  About Me (Detailed)
                </label>
                <textarea
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  placeholder="More about you..."
                  rows={4}
                  className="w-full rounded-xl sm:rounded-2xl border border-border bg-background-elevated/50 p-4 text-sm text-foreground outline-none focus:border-accent transition-all shadow-inner resize-none"
                />
              </div>
            </div>

            <div className="space-y-6 pt-6 border-t border-border">
              <h3 className="text-[9px] sm:text-[10px] font-black text-foreground-muted uppercase tracking-[0.2em] px-1">
                Privacy Signals
              </h3>
              <Toggle
                label="Show Post History"
                description="Allow others to see your posts on your profile."
                checked={privacySettings.showPostHistory}
                onChange={() =>
                  setPrivacySettings({
                    ...privacySettings,
                    showPostHistory: !privacySettings.showPostHistory,
                  })
                }
              />
              <Toggle
                label="Show Comment History"
                description="Allow others to see your comments on your profile."
                checked={privacySettings.showCommentHistory}
                onChange={() =>
                  setPrivacySettings({
                    ...privacySettings,
                    showCommentHistory: !privacySettings.showCommentHistory,
                  })
                }
              />
              <Toggle
                label="Show Recently Watched"
                description="Allow others to see what you've recently watched."
                checked={privacySettings.showRecentlyWatched}
                onChange={() =>
                  setPrivacySettings({
                    ...privacySettings,
                    showRecentlyWatched: !privacySettings.showRecentlyWatched,
                  })
                }
              />
              <Toggle
                label="Show Follow Lists"
                description="Allow others to see who you follow and who follows you."
                checked={privacySettings.showFollowList}
                onChange={() =>
                  setPrivacySettings({
                    ...privacySettings,
                    showFollowList: !privacySettings.showFollowList,
                  })
                }
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl sm:rounded-2xl bg-foreground text-background py-4 text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-accent transition-all active:scale-95 shadow-lg shadow-black/20"
            >
              Update Profile
            </button>
          </form>
        </SettingsSection>

        {msg && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 rounded-full bg-cyan-500 px-8 py-3 text-[10px] sm:text-xs font-bold text-slate-950 shadow-2xl animate-fade-up z-50">
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
    <section className="rounded-[32px] sm:rounded-[40px] border border-border bg-foreground/5 p-6 sm:p-8 shadow-2xl backdrop-blur-xl overflow-hidden">
      <div className="flex items-center gap-4 mb-8">
        <div className="h-10 w-10 rounded-xl sm:rounded-2xl bg-foreground/5 flex items-center justify-center text-lg sm:text-xl text-foreground-muted">
          <span className="material-icons">{icon}</span>
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight uppercase italic leading-none">
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
  isBeta,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: () => void;
  isBeta?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 group">
      <div className="min-w-0 flex-1">
        <div className="text-xs sm:text-sm font-bold text-foreground group-hover:text-cyan-400 transition-colors uppercase tracking-tight flex items-center gap-2">
          {label}
          {isBeta && (
            <span className="bg-cyan-500/10 text-cyan-500 text-[7px] sm:text-[8px] font-black px-1.5 py-0.5 rounded border border-cyan-500/20 tracking-tighter shrink-0">
              BETA
            </span>
          )}
        </div>
        {description && (
          <div className="text-[10px] sm:text-xs text-foreground-muted mt-1 leading-relaxed font-medium">
            {description}
          </div>
        )}
      </div>
      <button
        onClick={onChange}
        className={`relative h-6 w-10 sm:h-7 sm:w-12 shrink-0 rounded-full transition-all transform-gpu active:scale-95 ${checked ? 'bg-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.4)]' : 'bg-background-elevated'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 sm:top-1 sm:left-1 h-5 w-5 rounded-full bg-white shadow-xl transition-all duration-300 ${checked ? 'translate-x-4 sm:translate-x-5' : 'translate-x-0'}`}
        />
      </button>
    </div>
  );
}
