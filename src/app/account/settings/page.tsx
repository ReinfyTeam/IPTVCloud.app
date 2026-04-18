'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSettingsStore } from '@/store/settings-store';
import { useAuthStore } from '@/store/auth-store';
import { ACCENT_COLORS } from '@/types';

export default function SettingsPage() {
  const router = useRouter();
  const { settings, updateSetting, resetSettings } = useSettingsStore();
  const { user, token, isLoggedIn } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isLoggedIn()) {
      router.push('/account/signin');
    }
  }, [isLoggedIn, router]);

  async function saveToServer() {
    if (!user || !token) return;
    setSaving(true);
    try {
      await fetch('/api/settings/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(settings),
      });
      setMsg('Settings synced to your account.');
    } catch {
      setMsg('Network error. Settings saved locally.');
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(''), 3000);
    }
  }

  if (!mounted || !isLoggedIn()) return null;

  return (
    <div className="min-h-screen px-4 sm:px-6 py-24 max-w-2xl mx-auto">
      <div className="mb-8 animate-fade-up">
        <div className="text-xs font-semibold uppercase tracking-widest text-cyan-400 mb-1">Preferences</div>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 mt-1 text-sm">Customize your viewing experience.</p>
      </div>

      {msg && (
        <div className="mb-5 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.08] px-4 py-3 text-sm text-emerald-300 animate-fade-in">
          {msg}
        </div>
      )}

      <div className="space-y-5 animate-fade-up-delayed">
        <SettingsSection title="Appearance">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-3">Accent Color</label>
            <div className="flex flex-wrap gap-3">
              {ACCENT_COLORS.map((color) => (
                <button
                  key={color.id}
                  onClick={() => updateSetting('accentColor', color.id)}
                  className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 text-sm transition-all ${settings.accentColor === color.id ? 'border-white/30 bg-white/[0.08]' : 'border-white/[0.07] bg-white/[0.03] hover:border-white/15'}`}
                >
                  <span className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: color.hex }} />
                  <span className="text-slate-300">{color.label}</span>
                  {settings.accentColor === color.id && (
                    <svg className="h-3.5 w-3.5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </SettingsSection>

        <SettingsSection title="Player">
          <ToggleRow
            label="Autoplay on channel selection"
            description="Automatically start playing when you select a channel."
            checked={settings.autoplay}
            onChange={(v) => updateSetting('autoplay', v)}
          />
          <ToggleRow
            label="Performance mode"
            description="Disable animations and reduce visual effects for better performance."
            checked={settings.performanceMode}
            onChange={(v) => updateSetting('performanceMode', v)}
          />
          <ToggleRow
            label="Show EPG guide"
            description="Display current and next program info when available."
            checked={settings.showEpg}
            onChange={(v) => updateSetting('showEpg', v)}
          />
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Default Volume ({Math.round(settings.defaultVolume * 100)}%)</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.defaultVolume}
              onChange={(e) => updateSetting('defaultVolume', Number(e.target.value))}
              className="w-full accent-cyan-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Default Layout</label>
            <div className="flex gap-2">
              {(['compact', 'theater', 'fullscreen'] as const).map((layout) => (
                <button
                  key={layout}
                  onClick={() => updateSetting('playerLayout', layout)}
                  className={`rounded-xl border px-4 py-2 text-sm capitalize transition-colors ${settings.playerLayout === layout ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300' : 'border-white/[0.07] bg-white/[0.03] text-slate-400 hover:text-white hover:border-white/15'}`}
                >
                  {layout}
                </button>
              ))}
            </div>
          </div>
        </SettingsSection>

        <SettingsSection title="Keyboard Shortcuts">
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              ['Space', 'Play / Pause'],
              ['F', 'Fullscreen'],
              ['M', 'Mute / Unmute'],
              ['P', 'Picture-in-Picture'],
              ['S', 'Screenshot'],
              ['T', 'Theater mode'],
              ['L', 'Live mode'],
              ['← →', 'Previous / Next channel'],
            ].map(([key, action]) => (
              <div key={key} className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2">
                <span className="text-slate-500">{action}</span>
                <kbd className="rounded bg-slate-800 px-2 py-0.5 text-xs font-mono text-slate-300 border border-white/[0.07]">{key}</kbd>
              </div>
            ))}
          </div>
        </SettingsSection>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
          <div>
            <div className="text-sm font-medium text-white">Reset to Defaults</div>
            <div className="text-xs text-slate-500 mt-0.5">Restore all settings to their original values.</div>
          </div>
          <button
            onClick={resetSettings}
            className="rounded-xl border border-white/[0.07] px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            Reset
          </button>
        </div>

        {user && (
          <div className="flex flex-col gap-3">
             <button
            onClick={() => void saveToServer()}
            disabled={saving}
            className="w-full rounded-xl bg-cyan-500 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60 transition-colors shadow-lg shadow-cyan-500/20"
          >
            {saving ? 'Syncing…' : 'Save & Sync to Account'}
          </button>
            <button
              onClick={handleDeleteAccount}
              className="w-full rounded-xl bg-red-500/10 py-3 text-sm font-semibold text-red-400 hover:bg-red-500/20 transition-colors"
            >
              Delete Account
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

async function handleDeleteAccount() {
  if (!confirm('Are you sure you want to delete your account? This action is irreversible.')) return;
  const res = await fetch('/api/user/delete', { method: 'DELETE' });
  if (res.ok) window.location.href = '/';
  else alert('Failed to delete account.');
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5 space-y-5">
      <h2 className="text-sm font-semibold text-white border-b border-white/[0.06] pb-3">{title}</h2>
      {children}
    </div>
  );
}

function ToggleRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="text-sm font-medium text-white">{label}</div>
        <div className="text-xs text-slate-500 mt-0.5">{description}</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 h-6 w-11 rounded-full transition-colors ${checked ? 'bg-cyan-500' : 'bg-slate-700'}`}
        role="switch"
        aria-checked={checked}
      >
        <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}
