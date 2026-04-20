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

export default function NotificationPopup() {
  const { token } = useAuthStore();
  const [notification, setNotification] = useState<Notification | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!token) return;
    // In a real app, this would use WebSockets or polling
    // For now, we'll check for unread notifications periodically
    const checkNotifications = async () => {
      try {
        const res = await fetch('/api/user/notifications?unread=true&limit=1', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.length > 0 && (!notification || data[0].id !== notification.id)) {
            setNotification(data[0]);
            setVisible(true);
            // Auto hide after 5 seconds
            setTimeout(() => setVisible(false), 5000);
          }
        }
      } catch {}
    };

    const interval = setInterval(checkNotifications, 10000);
    return () => clearInterval(interval);
  }, [notification, token]);

  if (!visible || !notification) return null;

  return (
    <div className="fixed bottom-6 left-6 z-[200] animate-fade-in-up">
      <div className="w-80 rounded-[24px] bg-slate-900/90 border border-cyan-500/30 backdrop-blur-xl p-5 shadow-2xl shadow-cyan-900/20 relative group">
        <button
          onClick={() => setVisible(false)}
          className="absolute top-3 right-3 text-slate-500 hover:text-white transition-colors"
        >
          <span className="material-icons text-sm">close</span>
        </button>

        <div className="flex gap-4">
          <div className="h-10 w-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 shrink-0">
            <span className="material-icons text-xl">
              {notification.type === 'MESSAGE'
                ? 'forum'
                : notification.type === 'TICKET'
                  ? 'support_agent'
                  : notification.type === 'POST'
                    ? 'feed'
                    : 'notifications'}
            </span>
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-black text-white uppercase tracking-tight truncate italic">
              {notification.title}
            </h4>
            <p className="text-[11px] text-slate-400 font-medium leading-relaxed line-clamp-2 mt-1">
              {notification.message}
            </p>
            {notification.link && (
              <Link
                href={notification.link}
                onClick={() => setVisible(false)}
                className="inline-block mt-3 text-[9px] font-black text-cyan-500 uppercase tracking-widest hover:text-cyan-400 transition-colors"
              >
                View Details <span className="material-icons text-[10px] align-middle">east</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
