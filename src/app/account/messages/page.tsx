'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/store/auth-store';
import { getProxiedImageUrl } from '@/lib/image-proxy';

type Conversation = {
  user?: {
    id: string;
    username: string | null;
    name: string | null;
    profileIconUrl: string | null;
    isVerified: boolean;
  };
  group?: {
    id: string;
    name: string | null;
    _count: { messages: number };
  };
  lastMessage: {
    content: string;
    createdAt: string;
  } | null;
  unreadCount: number;
};

export default function MessagesPage() {
  const { token, user: currentUser } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      const fetchData = async () => {
        try {
          const [msgRes, groupsRes] = await Promise.all([
            fetch('/api/user/messages', { headers: { Authorization: `Bearer ${token}` } }),
            fetch('/api/user/groupchats', { headers: { Authorization: `Bearer ${token}` } }),
          ]);

          const msgData = await msgRes.json();
          const groupsData = await groupsRes.json();

          const all: Conversation[] = [
            ...msgData.map((c: any) => ({ ...c, type: 'private' })),
            ...groupsData.map((g: any) => ({
              group: g,
              lastMessage: null, // Would need last msg for groups too in API
              unreadCount: 0,
              type: 'group',
            })),
          ];

          setConversations(all);
        } catch {
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [token]);

  if (loading) return null;

  return (
    <div className="min-h-screen pt-32 pb-20 px-4 sm:px-6 bg-slate-950">
      <div className="mx-auto max-w-4xl space-y-12 animate-fade-in transform-gpu">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 sm:p-10 rounded-[32px] sm:rounded-[48px] bg-white/[0.02] border border-white/5 relative overflow-hidden shadow-2xl backdrop-blur-xl">
          <div className="absolute top-0 right-0 h-64 w-64 bg-cyan-500/5 blur-[80px] rounded-full" />
          <div className="space-y-2 relative z-10">
            <h1 className="text-3xl sm:text-4xl font-black text-white uppercase italic tracking-tighter leading-none">
              Messages.
            </h1>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[8px] sm:text-[10px]">
              Private and group conversations
            </p>
          </div>
          <button
            onClick={() => {
              const name = prompt('Enter group name:');
              if (name) {
                fetch('/api/user/groupchats', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ name }),
                }).then(() => window.location.reload());
              }
            }}
            className="px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl bg-cyan-500 text-slate-950 text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-cyan-400 transition-all active:scale-95 relative z-10 w-full sm:w-auto text-center"
          >
            Create Group
          </button>
        </div>

        <div className="space-y-4">
          {conversations.length === 0 ? (
            <div className="rounded-[32px] border border-white/5 bg-white/[0.02] p-16 sm:p-20 text-center text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-widest">
              No messages yet.
            </div>
          ) : (
            conversations.map((c, i) => (
              <Link
                key={c.user?.id || c.group?.id || i}
                href={
                  c.user
                    ? `/account/messages/${c.user.id}`
                    : `/account/messages/group/${c.group!.id}`
                }
                className="group flex gap-4 sm:gap-6 items-center p-4 sm:p-6 rounded-[32px] sm:rounded-[36px] bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-cyan-500/30 transition-all"
              >
                <div className="relative h-12 w-12 sm:h-16 sm:w-16 rounded-[18px] sm:rounded-[24px] bg-slate-900 border border-white/10 overflow-hidden shrink-0">
                  {c.user?.profileIconUrl ? (
                    <Image
                      src={getProxiedImageUrl(c.user.profileIconUrl)}
                      alt=""
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-700">
                      <span className="material-icons text-2xl sm:text-3xl">
                        {c.user ? 'person' : 'groups'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-4 mb-1">
                    <h4 className="text-xs sm:text-sm font-black text-white uppercase tracking-tight italic flex items-center gap-2 truncate">
                      {c.user?.username || c.user?.name || c.group?.name || 'User'}
                      {c.user?.isVerified && (
                        <span className="material-icons text-cyan-400 text-[10px] sm:text-xs">
                          verified
                        </span>
                      )}
                    </h4>
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate group-hover:text-slate-300 transition-colors">
                    {c.lastMessage?.content ||
                      (c.group ? `${c.group._count.messages} messages` : 'Started a conversation')}
                  </p>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
