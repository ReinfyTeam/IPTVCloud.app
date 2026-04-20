'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';
import { useRouter } from 'next/navigation';

type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  link?: string | null;
  read: boolean;
  createdAt: string;
};

export default function NotificationDetailPage({ params }: { params: { id: string } }) {
  const { token } = useAuthStore();
  const router = useRouter();
  const [notification, setNotification] = useState<Notification | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetch('/api/user/notifications?limit=100', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            const n = data.find((x) => x.id === params.id);
            if (n) {
              setNotification(n);
              // Mark as read
              fetch('/api/user/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ notificationId: params.id }),
              });
            }
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [token, params.id]);

  if (loading) return null;
  if (!notification)
    return (
      <div className="min-h-screen pt-32 text-center text-white font-bold uppercase tracking-widest">
        Notification not found.
      </div>
    );

  return (
    <div className="min-h-screen pt-32 pb-20 px-4 sm:px-6 bg-slate-950">
      <div className="mx-auto max-w-2xl space-y-8 sm:space-y-12 animate-fade-in transform-gpu">
        <div className="p-6 sm:p-10 rounded-[32px] sm:rounded-[48px] bg-white/[0.02] border border-white/5 relative overflow-hidden shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-4 sm:gap-6 mb-8 relative z-10">
            <Link
              href="/account/notifications"
              className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all"
            >
              <span className="material-icons">west</span>
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white uppercase italic tracking-tighter leading-none">
                Notification Details.
              </h1>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-[8px] sm:text-[10px] mt-1">
                Received on {new Date(notification.createdAt).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-8 rounded-[24px] sm:rounded-[32px] bg-slate-900/50 border border-white/5 space-y-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                <span className="material-icons">
                  {notification.type === 'MESSAGE'
                    ? 'forum'
                    : notification.type === 'TICKET'
                      ? 'support_agent'
                      : notification.type === 'POST'
                        ? 'feed'
                        : 'notifications'}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white uppercase italic tracking-tight leading-tight">
                {notification.title}
              </h2>
            </div>
            <p className="text-slate-300 text-sm sm:text-base font-medium leading-relaxed">
              {notification.message}
            </p>
            {notification.link && (
              <Link
                href={notification.link}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl sm:rounded-2xl bg-cyan-500 text-slate-950 text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-cyan-400 transition-all active:scale-95 w-full sm:w-auto"
              >
                Jump to Resource <span className="material-icons text-sm">east</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
