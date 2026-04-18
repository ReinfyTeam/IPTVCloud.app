'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';
import ReactMarkdown from 'react-markdown';

type Response = {
  id: string;
  message: string;
  userId: string;
  createdAt: string;
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
};

export default function TicketDetailPage({ params }: { params: { id: string } }) {
  const { user, token } = useAuthStore();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  const fetchTicket = useCallback(async () => {
    try {
      const res = await fetch(`/api/tickets/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setTicket(data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [params.id, token]);

  const fetchResponses = useCallback(async () => {
    try {
      const res = await fetch(`/api/tickets/${params.id}/responses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setTicket((prev) => (prev ? { ...prev, responses: data } : null));
      }
    } catch {}
  }, [params.id, token]);

  useEffect(() => {
    if (token) {
      fetchTicket().then(() => fetchResponses());
    }
  }, [token, fetchTicket, fetchResponses]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/tickets/${params.id}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: newMessage }),
      });
      if (res.ok) {
        setNewMessage('');
        fetchResponses();
      }
    } catch {
    } finally {
      setSending(false);
    }
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
          <div className="min-w-0">
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
            <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none truncate">
              {ticket.subject}
            </h1>
          </div>
        </div>

        <div className="p-8 rounded-[40px] bg-white/[0.02] border border-white/[0.08] shadow-2xl backdrop-blur-xl">
          <div className="text-sm text-slate-300 font-medium leading-relaxed bg-slate-950/50 p-8 rounded-[32px] border border-white/5 whitespace-pre-wrap">
            {ticket.message}
          </div>
          <div className="mt-6 flex items-center gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">
            <span>Opened by @{ticket.user.username || 'anonymous'}</span>
            <span className="h-1 w-1 rounded-full bg-slate-800" />
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
                className={`p-6 rounded-[32px] border ${res.userId === user?.id ? 'bg-white/[0.03] border-white/[0.06] ml-12' : 'bg-cyan-500/5 border-cyan-500/10 mr-12'}`}
              >
                <div className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-3 flex items-center justify-between">
                  <span>{res.userId === user?.id ? 'You' : 'Staff Support'}</span>
                  <span>{new Date(res.createdAt).toLocaleTimeString()}</span>
                </div>
                <div className="text-sm text-slate-300 font-medium leading-relaxed prose prose-invert max-w-none">
                  <ReactMarkdown>{res.message}</ReactMarkdown>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSend} className="relative mt-12">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Post a reply or add more information..."
              className="w-full rounded-[32px] border border-white/10 bg-slate-900/50 p-6 pr-32 text-sm text-white outline-none focus:border-cyan-500 transition-all shadow-inner h-32"
            />
            <button
              type="submit"
              disabled={sending || !newMessage}
              className="absolute bottom-4 right-4 px-8 py-3 rounded-2xl bg-cyan-500 text-slate-950 font-black text-[10px] uppercase tracking-widest hover:bg-cyan-400 active:scale-95 transition-all shadow-lg shadow-cyan-900/20"
            >
              Reply
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
