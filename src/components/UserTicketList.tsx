'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';

type Ticket = {
  id: string;
  subject: string;
  status: string;
  type: string;
  createdAt: string;
  handledBy?: { username: string | null };
};

export default function UserTicketList() {
  const { token } = useAuthStore();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetch('/api/user/tickets', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setTickets(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [token]);

  if (loading) return null;
  if (tickets.length === 0) return null;

  return (
    <div className="space-y-6 text-left">
      <h2 className="text-[10px] font-black text-white uppercase tracking-[0.3em] px-1 opacity-60">
        Active Support Cases
      </h2>
      <div className="grid gap-3">
        {tickets.map((t) => (
          <Link
            key={t.id}
            href={`/support/tickets/${t.id}`}
            className="group block p-6 rounded-[28px] bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-cyan-500/30 transition-all"
          >
            <div className="flex items-center justify-between gap-4 mb-2">
              <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[9px] font-black uppercase text-cyan-400 tracking-widest">
                {t.type}
              </span>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                {new Date(t.createdAt).toLocaleDateString()}
              </span>
            </div>
            <h3 className="font-bold text-white uppercase italic tracking-tight group-hover:text-cyan-400 transition-colors truncate">
              {t.subject}
            </h3>
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2">
                <div
                  className={`h-1.5 w-1.5 rounded-full ${t.status === 'OPEN' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`}
                />
                <span
                  className={`text-[10px] font-black uppercase tracking-widest ${t.status === 'OPEN' ? 'text-emerald-400' : 'text-slate-500'}`}
                >
                  {t.status}
                </span>
              </div>
              <span className="material-icons text-slate-700 group-hover:text-cyan-400 transition-colors">
                east
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
