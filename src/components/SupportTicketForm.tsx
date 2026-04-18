'use client';

import React, { useState } from 'react';
import { useAuthStore } from '@/store/auth-store';

export default function SupportTicketForm() {
  const { token, user } = useAuthStore();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('SUPPORT');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !user) return;

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subject, message, type }),
      });
      if (res.ok) {
        setSent(true);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to send ticket');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="p-8 rounded-[32px] border border-amber-500/20 bg-amber-500/5 text-center">
        <p className="text-amber-400 font-bold">Please log in to submit a support ticket.</p>
      </div>
    );
  }

  if (sent) {
    return (
      <div className="p-8 rounded-[32px] border border-emerald-500/20 bg-emerald-500/5 text-center animate-fade-in">
        <div className="h-16 w-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
          <svg
            className="h-8 w-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Ticket Received</h3>
        <p className="text-slate-400 text-sm">
          Our staff will review your request and get back to you via email shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-1 animate-fade-in transform-gpu">
      <div>
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">
          Subject
        </label>
        <input
          type="text"
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="How can we help?"
          className="w-full rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm text-white outline-none focus:border-cyan-500 transition-all shadow-inner"
        />
      </div>
      <div>
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">
          Issue Type
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm text-white outline-none focus:border-cyan-500 transition-all shadow-inner"
        >
          <option value="SUPPORT">Support Request</option>
          <option value="APPEAL">Account Appeal</option>
          <option value="BUG">Bug Report</option>
          <option value="FEATURE">Feature Request</option>
        </select>
      </div>

      <div>
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">
          Detailed Message
        </label>
        <textarea
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Please provide as much detail as possible..."
          className="w-full rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm text-white outline-none focus:border-cyan-500 h-32 transition-all shadow-inner"
        />
      </div>
      {error && <div className="text-xs font-bold text-red-400 px-1">{error}</div>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-2xl bg-cyan-500 py-4 text-sm font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-50 transition-all active:scale-95 shadow-lg shadow-cyan-500/20"
      >
        {loading ? 'SENDING...' : 'SUBMIT TICKET'}
      </button>
    </form>
  );
}
