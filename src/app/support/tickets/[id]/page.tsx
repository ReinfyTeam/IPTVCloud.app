'use client';

import React, { use, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/store/auth-store';
import ReactMarkdown from 'react-markdown';
import EmojiPicker from '@/components/EmojiPicker';
import { getProxiedImageUrl } from '@/lib/image-proxy';

type Attachment = { id: string; url: string; filename: string };

type Response = {
  id: string;
  message: string;
  userId: string;
  createdAt: string;
  attachments?: Attachment[];
};

type Ticket = {
  id: string;
  subject: string;
  message: string;
  status: string;
  type: string;
  createdAt: string;
  user: { email: string; name: string | null; username: string | null };
  responses: Response[];
  attachments: Attachment[];
};

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, token } = useAuthStore();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [attachments, setAttachments] = useState<{ url: string; filename: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);

  const fetchTicket = useCallback(async () => {
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setTicket(data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  const fetchResponses = useCallback(async () => {
    try {
      const res = await fetch(`/api/tickets/${id}/responses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setTicket((prev) => (prev ? { ...prev, responses: data } : null));
      }
    } catch {}
  }, [id, token]);

  useEffect(() => {
    if (token) {
      fetchTicket().then(() => fetchResponses());
    }
  }, [token, fetchTicket, fetchResponses]);

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
      if (res.ok) setAttachments([...attachments, await res.json()]);
    } catch {
    } finally {
      setUploading(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage && attachments.length === 0) || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/tickets/${id}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: newMessage, attachments }),
      });
      if (res.ok) {
        setNewMessage('');
        setAttachments([]);
        fetchResponses();
      }
    } catch {
    } finally {
      setSending(false);
    }
  };

  const insertMarkdown = (prefix: string, suffix = prefix) => {
    const textarea = document.querySelector('textarea');
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const selection = text.substring(start, end);
    const after = text.substring(end);
    setNewMessage(before + prefix + selection + suffix + after);
    textarea.focus();
  };

  if (loading) return null;
  if (!ticket)
    return (
      <div className="min-h-screen pt-32 text-center text-white font-bold uppercase tracking-widest">
        Case not found.
      </div>
    );

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 bg-slate-950">
      <div className="mx-auto max-w-3xl space-y-12 animate-fade-in transform-gpu">
        <div className="flex items-center gap-6">
          <Link
            href="/support"
            className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all"
          >
            <span className="material-icons">west</span>
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[9px] font-black uppercase text-cyan-400 tracking-widest">
                {ticket.type}
              </span>
              <span
                className={`text-[10px] font-black uppercase tracking-widest ${ticket.status === 'OPEN' ? 'text-emerald-400' : 'text-slate-500'}`}
              >
                {ticket.status}
              </span>
            </div>
            <h1 className="text-xl sm:text-3xl font-black text-white uppercase italic tracking-tighter leading-none truncate">
              {ticket.subject}
            </h1>
          </div>
        </div>

        <div className="p-8 rounded-[40px] bg-white/[0.02] border border-white/[0.08] shadow-2xl backdrop-blur-xl">
          <div className="text-sm text-slate-300 font-medium leading-relaxed bg-slate-950/50 p-6 sm:p-8 rounded-[32px] border border-white/5 whitespace-pre-wrap">
            {ticket.message}
          </div>

          {ticket.attachments?.length > 0 && (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 px-2">
              {ticket.attachments.map((a) => (
                <div
                  key={a.id}
                  className="group relative rounded-2xl bg-slate-900 border border-white/5 overflow-hidden"
                >
                  {a.url.match(/\.(jpg|jpeg|png|gif|webp)$/i) || a.url.includes('/api/images/') ? (
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block aspect-video relative"
                    >
                      <Image
                        src={getProxiedImageUrl(a.url)}
                        alt={a.filename || 'Attachment'}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform"
                      />
                    </a>
                  ) : a.url.match(/\.(mp4|webm|ogg)$/i) || a.url.includes('/api/videos/') ? (
                    <video controls className="w-full aspect-video bg-black">
                      <source src={a.url} type="video/mp4" />
                    </video>
                  ) : (
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 p-4 hover:bg-white/5 transition-all h-full"
                    >
                      <span className="material-icons text-slate-500">description</span>
                      <div className="min-w-0">
                        <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest truncate">
                          {a.filename}
                        </div>
                        <div className="text-[8px] font-bold text-slate-600 uppercase tracking-tighter">
                          Download Attachment
                        </div>
                      </div>
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">
            <span>Opened by @{ticket.user.username || 'anonymous'}</span>
            <span className="hidden sm:block h-1 w-1 rounded-full bg-slate-800" />
            <span>{new Date(ticket.createdAt).toLocaleString()}</span>
          </div>
        </div>

        <section className="space-y-8">
          <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter px-2">
            Timeline Updates<span className="text-cyan-500">.</span>
          </h2>

          <div className="grid gap-4">
            {ticket.responses?.map((res) => (
              <div
                key={res.id}
                className={`p-6 rounded-[32px] border ${res.userId === user?.id ? 'bg-white/[0.03] border-white/[0.06] ml-4 sm:ml-12' : 'bg-cyan-500/5 border-cyan-500/10 mr-4 sm:mr-12'}`}
              >
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-3 flex items-center justify-between">
                  <span>{res.userId === user?.id ? 'You' : 'Staff Support'}</span>
                  <span>{new Date(res.createdAt).toLocaleTimeString()}</span>
                </div>
                <div className="text-sm text-slate-300 font-medium leading-relaxed prose prose-invert max-w-none prose-sm prose-headings:font-black prose-headings:uppercase prose-headings:italic prose-headings:tracking-tighter prose-headings:text-white prose-strong:text-white prose-a:text-cyan-400">
                  <ReactMarkdown>{res.message}</ReactMarkdown>
                </div>
                {res.attachments && res.attachments.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {res.attachments.map((a) => (
                      <a
                        key={a.id}
                        href={a.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/20 border border-white/5 text-[9px] font-bold text-slate-500 hover:text-cyan-400 transition-all"
                      >
                        <span className="material-icons text-xs">attach_file</span>
                        {a.filename}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <form onSubmit={handleSend} className="space-y-4">
            <div className="flex items-center gap-1 px-4 py-2 rounded-2xl bg-white/[0.02] border border-white/5 overflow-x-auto scrollbar-hide">
              <button
                type="button"
                onClick={() => insertMarkdown('**')}
                className="p-2 text-slate-500 hover:text-white transition-colors"
                title="Bold"
              >
                <span className="material-icons text-sm">format_bold</span>
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown('_')}
                className="p-2 text-slate-500 hover:text-white transition-colors"
                title="Italic"
              >
                <span className="material-icons text-sm">format_italic</span>
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown('<u>', '</u>')}
                className="p-2 text-slate-500 hover:text-white transition-colors"
                title="Underline"
              >
                <span className="material-icons text-sm">format_underlined</span>
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown('### ')}
                className="p-2 text-slate-500 hover:text-white transition-colors"
                title="Heading"
              >
                <span className="material-icons text-sm">title</span>
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown('- ')}
                className="p-2 text-slate-500 hover:text-white transition-colors"
                title="List"
              >
                <span className="material-icons text-sm">format_list_bulleted</span>
              </button>
              <div className="h-4 w-px bg-white/10 mx-2 shrink-0" />
              <EmojiPicker onSelect={(emoji) => setNewMessage((prev) => prev + emoji)} />
              <label
                className={`ml-auto cursor-pointer p-2 rounded-xl transition-all ${uploading ? 'opacity-30' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
              >
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
                <span className="material-icons text-sm">attach_file</span>
              </label>
            </div>

            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 px-2">
                {attachments.map((a, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold text-slate-400"
                  >
                    <span className="material-icons text-xs">attachment</span>
                    {a.filename}
                    <button
                      type="button"
                      onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))}
                      className="text-red-400 hover:text-red-300"
                    >
                      <span className="material-icons text-[10px]">close</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="relative">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Post a reply or add more information..."
                className="w-full rounded-[32px] border border-white/10 bg-slate-900/50 p-6 pr-32 text-sm text-white outline-none focus:border-cyan-500 transition-all shadow-inner h-32"
              />
              <button
                type="submit"
                disabled={sending || (!newMessage && attachments.length === 0)}
                className="absolute bottom-4 right-4 px-8 py-3 rounded-2xl bg-cyan-500 text-slate-950 font-black text-[10px] uppercase tracking-widest hover:bg-cyan-400 active:scale-95 transition-all shadow-lg shadow-cyan-900/20"
              >
                Reply
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
