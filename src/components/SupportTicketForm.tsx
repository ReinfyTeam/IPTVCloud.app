'use client';

import React, { useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import EmojiPicker from './EmojiPicker';

type TicketType = 'SUPPORT' | 'APPEAL' | 'BUG' | 'FEATURE' | 'CHANNEL';

type Props = {
  initialType?: TicketType;
};

export default function SupportTicketForm({ initialType = 'SUPPORT' }: Props) {
  const { token, user } = useAuthStore();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<TicketType>(initialType);
  const [attachments, setAttachments] = useState<{ url: string; filename: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
        setAttachments([...attachments, data]);
      }
    } catch {
      setError('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const insertMarkdown = (prefix: string, suffix = prefix) => {
    const textarea = document.querySelector('textarea');
    if (!textarea) return;
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const text = textarea.value;
    const before = text.substring(0, start);
    const selection = text.substring(start, end);
    const after = text.substring(end);
    setMessage(before + prefix + selection + suffix + after);
    textarea.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !user) return;

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subject, message, type, attachments }),
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
    <div className="glass rounded-[32px] sm:rounded-[40px] p-8 sm:p-12 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 p-8 opacity-10">
        <span className="material-icons text-7xl text-accent">confirmation_number</span>
      </div>
      <form
        onSubmit={handleSubmit}
        className="space-y-6 sm:space-y-8 animate-fade-in transform-gpu relative z-10"
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
              Subject
            </label>
            <input
              required
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="How can we help?"
              className="w-full rounded-xl sm:rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm text-white outline-none focus:border-cyan-500 transition-all shadow-inner"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
              Issue Type
            </label>
            <div className="relative">
              <select
                value={type}
                onChange={(e) => setType(e.target.value as TicketType)}
                className="w-full rounded-xl sm:rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm text-white outline-none focus:border-cyan-500 transition-all shadow-inner appearance-none cursor-pointer disabled:opacity-50"
                disabled={user?.isRestricted}
              >
                {!user?.isRestricted ? (
                  <>
                    <option value="SUPPORT">Support Request</option>
                    <option value="APPEAL">Account Appeal</option>
                    <option value="BUG">Bug Report</option>
                    <option value="FEATURE">Feature Request</option>
                    <option value="CHANNEL">Channel Submission</option>
                  </>
                ) : (
                  <option value="APPEAL">Account Appeal</option>
                )}
              </select>
              <span className="material-icons absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none">
                expand_more
              </span>
            </div>
          </div>
        </div>

        {user?.isRestricted && (
          <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/10 flex items-start gap-4">
            <span className="material-icons text-red-500 text-sm mt-0.5">info</span>
            <p className="text-[10px] text-slate-500 font-medium leading-relaxed uppercase tracking-wider">
              Your account is currently restricted. You may only use this form to appeal your
              status. Please provide a clear explanation for your appeal.
            </p>
          </div>
        )}

        <div className="space-y-3">
          <label className="block text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
            Detailed Message
          </label>

          <div className="flex items-center gap-1 px-4 py-2 rounded-xl sm:rounded-2xl bg-white/[0.02] border border-white/5 w-fit">
            <button
              type="button"
              onClick={() => insertMarkdown('**')}
              className="p-1.5 text-slate-500 hover:text-white transition-colors"
              title="Bold"
            >
              <span className="material-icons text-sm">format_bold</span>
            </button>
            <button
              type="button"
              onClick={() => insertMarkdown('_')}
              className="p-1.5 text-slate-500 hover:text-white transition-colors"
              title="Italic"
            >
              <span className="material-icons text-sm">format_italic</span>
            </button>
            <button
              type="button"
              onClick={() => insertMarkdown('<u>', '</u>')}
              className="p-1.5 text-slate-500 hover:text-white transition-colors"
              title="Underline"
            >
              <span className="material-icons text-sm">format_underlined</span>
            </button>
            <button
              type="button"
              onClick={() => insertMarkdown('### ')}
              className="p-1.5 text-slate-500 hover:text-white transition-colors"
              title="Heading"
            >
              <span className="material-icons text-sm">title</span>
            </button>
            <button
              type="button"
              onClick={() => insertMarkdown('- ')}
              className="p-1.5 text-slate-500 hover:text-white transition-colors"
              title="List"
            >
              <span className="material-icons text-sm">format_list_bulleted</span>
            </button>
            <div className="h-4 w-px bg-white/10 mx-2 shrink-0" />
            <EmojiPicker onSelect={(emoji) => setMessage((prev) => prev + emoji)} />
          </div>

          <textarea
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Please provide as much detail as possible..."
            className="w-full rounded-xl sm:rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm text-white outline-none focus:border-cyan-500 h-32 sm:h-40 transition-all shadow-inner resize-none"
          />
        </div>

        <div className="space-y-3">
          <label className="block text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
            Attachments (Images/Logs)
          </label>
          <div className="flex flex-wrap gap-2">
            {attachments.map((a, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[9px] font-bold text-slate-300"
              >
                <span className="material-icons text-sm">attach_file</span>
                <span className="truncate max-w-[100px]">{a.filename}</span>
                <button
                  type="button"
                  onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))}
                  className="text-red-400 hover:text-red-300"
                >
                  <span className="material-icons text-xs">close</span>
                </button>
              </div>
            ))}
            <label
              className={`cursor-pointer flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-white/20 text-slate-500 hover:text-white hover:border-cyan-500/50 transition-all ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <input
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              <span className="material-icons text-sm">{uploading ? 'sync' : 'add'}</span>
              <span className="text-[9px] font-black uppercase tracking-widest">
                {uploading ? 'Uploading...' : 'Attach File'}
              </span>
            </label>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-[10px] font-bold text-red-400 animate-fade-in uppercase tracking-widest">
            <span className="material-icons text-sm">error_outline</span>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || uploading}
          className="w-full rounded-xl sm:rounded-2xl bg-cyan-500 py-4 text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-950 hover:bg-cyan-400 disabled:opacity-50 transition-all active:scale-95 shadow-lg shadow-cyan-900/20"
        >
          {loading ? 'Transmitting…' : 'Submit Ticket'}
        </button>
      </form>
    </div>
  );
}
