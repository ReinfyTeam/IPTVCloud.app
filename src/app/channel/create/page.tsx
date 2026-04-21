'use client';

import React, { useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useRouter } from 'next/navigation';
import { COUNTRY_NAMES } from '@/lib/countries';
import { LANGUAGE_NAMES } from '@/lib/languages';

export default function CreateChannelPage() {
  const { user, token } = useAuthStore();
  const router = useRouter();

  const [formData, setForm] = useState({
    name: '',
    streamUrl: '',
    logo: '',
    country: '',
    language: '',
    region: '',
    category: 'general',
    description: '',
    resolution: '1080p',
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/custom-channels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...formData, isSubmitted }),
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => router.push('/channel/custom_channels'), 3000);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
        <div className="max-w-md w-full p-12 rounded-[48px] bg-white/[0.02] border border-cyan-500/30 text-center space-y-6 backdrop-blur-xl animate-fade-in">
          <div className="h-20 w-20 rounded-full bg-cyan-500/10 flex items-center justify-center mx-auto text-cyan-400">
            <span className="material-icons text-4xl">check_circle</span>
          </div>
          <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter">
            {isSubmitted ? 'Submission Received' : 'Channel Saved'}
          </h1>
          <p className="text-slate-400 text-sm font-medium">
            {isSubmitted
              ? 'Your channel has been submitted for approval. You can track the status in your support tickets.'
              : 'Your channel has been saved to your private collection. You can view it on your custom channels page.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-20 px-4 sm:px-6 bg-slate-950">
      <div className="mx-auto max-w-2xl space-y-12 animate-fade-in transform-gpu">
        <div className="space-y-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-black text-cyan-400 uppercase tracking-widest">
            Broadcaster Studio
          </div>
          <h1 className="text-5xl font-black text-white uppercase italic tracking-tighter leading-none">
            Create Channel<span className="text-cyan-500">.</span>
          </h1>
          <p className="text-slate-400 text-sm font-medium max-w-lg mx-auto leading-relaxed">
            Create a private channel for your own use, or submit it to the global directory for
            everyone to enjoy.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-10 rounded-[48px] bg-white/[0.02] border border-white/5 backdrop-blur-xl shadow-2xl space-y-8"
        >
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
                Channel Name
              </label>
              <input
                required
                type="text"
                value={formData.name}
                onChange={(e) => setForm({ ...formData, name: e.target.value })}
                placeholder="e.g. Cinema Premium HD"
                className="w-full rounded-2xl border border-white/10 bg-slate-900/50 p-4 text-sm text-white outline-none focus:border-cyan-500 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
                Stream URL (M3U8/MP4)
              </label>
              <input
                required
                type="url"
                value={formData.streamUrl}
                onChange={(e) => setForm({ ...formData, streamUrl: e.target.value })}
                placeholder="https://example.com/live.m3u8"
                className="w-full rounded-2xl border border-white/10 bg-slate-900/50 p-4 text-sm text-white outline-none focus:border-cyan-500 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
                Logo URL
              </label>
              <input
                type="url"
                value={formData.logo}
                onChange={(e) => setForm({ ...formData, logo: e.target.value })}
                placeholder="https://example.com/logo.png"
                className="w-full rounded-2xl border border-white/10 bg-slate-900/50 p-4 text-sm text-white outline-none focus:border-cyan-500 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setForm({ ...formData, category: e.target.value })}
                className="w-full rounded-2xl border border-white/10 bg-slate-900/50 p-4 text-sm text-white outline-none focus:border-cyan-500 transition-all appearance-none"
              >
                <option value="general">General</option>
                <option value="news">News</option>
                <option value="sports">Sports</option>
                <option value="movies">Movies</option>
                <option value="music">Music</option>
                <option value="kids">Kids</option>
                <option value="documentary">Documentary</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
                Country
              </label>
              <select
                required
                value={formData.country}
                onChange={(e) => setForm({ ...formData, country: e.target.value })}
                className="w-full rounded-2xl border border-white/10 bg-slate-900/50 p-4 text-sm text-white outline-none focus:border-cyan-500 transition-all appearance-none"
              >
                <option value="">Select Country</option>
                {Object.entries(COUNTRY_NAMES).map(([code, name]) => (
                  <option key={code} value={name as string}>
                    {name as string}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
                Language
              </label>
              <select
                required
                value={formData.language}
                onChange={(e) => setForm({ ...formData, language: e.target.value })}
                className="w-full rounded-2xl border border-white/10 bg-slate-900/50 p-4 text-sm text-white outline-none focus:border-cyan-500 transition-all appearance-none"
              >
                <option value="">Select Language</option>
                {Object.entries(LANGUAGE_NAMES).map(([code, name]) => (
                  <option key={code} value={name as string}>
                    {name as string}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
                Region
              </label>
              <select
                value={formData.region}
                onChange={(e) => setForm({ ...formData, region: e.target.value })}
                className="w-full rounded-2xl border border-white/10 bg-slate-900/50 p-4 text-sm text-white outline-none focus:border-cyan-500 transition-all appearance-none"
              >
                <option value="">Select Region (Optional)</option>
                <option value="Americas">Americas</option>
                <option value="Europe">Europe</option>
                <option value="Asia">Asia</option>
                <option value="Oceania">Oceania</option>
                <option value="Africa">Africa</option>
                <option value="Middle East">Middle East</option>
                <option value="Antarctica">Antarctica</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
              Channel Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setForm({ ...formData, description: e.target.value })}
              placeholder="Tell us more about this channel..."
              className="w-full rounded-2xl border border-white/10 bg-slate-900/50 p-4 text-sm text-white outline-none focus:border-cyan-500 transition-all h-32"
            />
          </div>

          <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-900/50 border border-white/10">
            <input
              type="checkbox"
              id="is-submitted"
              checked={isSubmitted}
              onChange={(e) => setIsSubmitted(e.target.checked)}
              className="h-5 w-5 rounded-md bg-slate-800 border-slate-700 text-cyan-500 focus:ring-cyan-500"
            />
            <label htmlFor="is-submitted" className="flex-1 text-sm text-slate-300 font-medium">
              Submit for Community Review
              <p className="text-xs text-slate-500">
                If checked, your channel will be submitted for public listing after staff review.
              </p>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 rounded-2xl bg-cyan-500 text-slate-950 font-black text-xs uppercase tracking-widest hover:bg-cyan-400 active:scale-95 transition-all shadow-xl shadow-cyan-900/20 disabled:opacity-50"
          >
            {loading
              ? isSubmitted
                ? 'Submitting...'
                : 'Saving...'
              : isSubmitted
                ? 'Submit for Review'
                : 'Save Channel'}
          </button>
        </form>
      </div>
    </div>
  );
}
