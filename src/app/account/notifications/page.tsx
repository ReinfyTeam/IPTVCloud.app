'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';

type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  link?: string | null;
  read: boolean;
  createdAt: string;
};

export default function NotificationsPage() {
  const { token } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetch('/api/user/notifications?limit=50', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setNotifications(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [token]);

  const markRead = async (id: string) => {
    try {
      await fetch('/api/user/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notificationId: id }),
      });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await fetch('/api/user/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ markAll: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {}
  };

  if (loading) return null;

  return (
    <div className="min-h-screen pt-32 pb-20 px-4 sm:px-6 bg-slate-950">
      <div className="mx-auto max-w-4xl space-y-12 animate-fade-in transform-gpu">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 sm:p-10 rounded-[32px] sm:rounded-[48px] bg-white/[0.02] border border-white/5 relative overflow-hidden shadow-2xl backdrop-blur-xl">
          <div className="absolute top-0 right-0 h-64 w-64 bg-cyan-500/5 blur-[80px] rounded-full" />
          <div className="space-y-2 relative z-10">
            <h1 className="text-3xl sm:text-4xl font-black text-white uppercase italic tracking-tighter leading-none">
              Notifications.
            </h1>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[8px] sm:text-[10px]">
              Stay updated with your community and account
            </p>
          </div>
          <button
            onClick={markAllRead}
            className="px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 text-[9px] sm:text-[10px] font-black text-white uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95 relative z-10 w-full sm:w-auto"
          >
            Mark all as read
          </button>
        </div>

        <div className="space-y-4">
          {notifications.length === 0 ? (
            <div className="rounded-[32px] border border-white/5 bg-white/[0.02] p-16 sm:p-20 text-center text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-widest">
              No notifications yet
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`group p-6 sm:p-8 rounded-[32px] sm:rounded-[36px] bg-white/[0.02] border transition-all ${
                  n.read ? 'border-white/[0.06] opacity-60' : 'border-cyan-500/30 bg-cyan-500/5'
                }`}
              >
                <div className="flex gap-4 sm:gap-6 items-start">
                  <div
                    className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 ${
                      n.read ? 'bg-slate-900 text-slate-500' : 'bg-cyan-500/10 text-cyan-400'
                    }`}
                  >
                    <span className="material-icons text-xl sm:text-2xl">
                      {n.type === 'MESSAGE'
                        ? 'forum'
                        : n.type === 'TICKET'
                          ? 'support_agent'
                          : n.type === 'POST'
                            ? 'feed'
                            : 'notifications'}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-4 mb-1 sm:mb-2">
                      <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-tight italic truncate">
                        {n.title}
                      </h4>
                      <span className="text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                        {new Date(n.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-400 font-medium leading-relaxed line-clamp-2">
                      {n.message}
                    </p>
                    <div className="flex items-center gap-4 sm:gap-6 mt-4 sm:mt-6">
                      {n.link && (
                        <Link
                          href={n.link}
                          onClick={() => !n.read && markRead(n.id)}
                          className="text-[9px] sm:text-[10px] font-black text-cyan-500 uppercase tracking-widest hover:text-cyan-400 transition-colors"
                        >
                          View Signal{' '}
                          <span className="material-icons text-xs align-middle ml-1">east</span>
                        </Link>
                      )}
                      {!n.read && (
                        <button
                          onClick={() => markRead(n.id)}
                          className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
