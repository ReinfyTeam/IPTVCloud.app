'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
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

export default function NotificationDropdown() {
  const { token, user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/user/notifications?limit=5', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setNotifications(await res.json());
      }
    } catch {}
  }, [token]);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen(!open)}
        className={`h-10 w-10 flex items-center justify-center rounded-xl transition-all border active:scale-95 relative ${
          open
            ? 'bg-white/10 text-white border-white/20'
            : 'text-slate-400 hover:text-white hover:bg-white/5 border-transparent hover:border-white/10'
        }`}
      >
        <span className="material-icons text-xl">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-3 w-80 rounded-[32px] border border-white/[0.08] bg-slate-900/95 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden animate-fade-in z-[100] p-2">
          <div className="p-4 border-b border-white/5 mb-2 flex items-center justify-between">
            <span className="text-[10px] font-black text-white uppercase tracking-widest px-1">
              Recent Signals
            </span>
            <Link
              href="/account/notifications"
              onClick={() => setOpen(false)}
              className="text-[9px] font-black text-cyan-500 hover:text-cyan-400 uppercase tracking-widest transition-colors"
            >
              View All
            </Link>
          </div>

          <div className="grid gap-1">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                No new notifications
              </div>
            ) : (
              notifications.map((n) => (
                <Link
                  key={n.id}
                  href={n.link || `/account/notifications/${n.id}`}
                  onClick={() => setOpen(false)}
                  className={`flex items-start gap-4 p-4 rounded-2xl transition-all group/item ${
                    n.read ? 'opacity-60' : 'bg-white/[0.03] border border-white/5 shadow-inner'
                  } hover:bg-white/[0.05]`}
                >
                  <div
                    className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${
                      n.read ? 'bg-slate-800 text-slate-600' : 'bg-cyan-500/10 text-cyan-400'
                    }`}
                  >
                    <span className="material-icons text-base">
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
                    <div className="text-[11px] font-black text-white truncate uppercase italic tracking-tight group-hover/item:text-cyan-400 transition-colors">
                      {n.title}
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                      {n.message}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>

          <Link
            href="/account/notifications"
            onClick={() => setOpen(false)}
            className="block w-full mt-2 p-3 text-center text-[10px] font-black text-slate-500 hover:text-white hover:bg-white/5 rounded-2xl transition-all uppercase tracking-widest border-t border-white/5"
          >
            Manage Notifications
          </Link>
        </div>
      )}
    </div>
  );
}
