'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import Image from 'next/image';
import { getProxiedImageUrl } from '@/lib/image-proxy';

type Message = {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  createdAt: string;
  sender: { id: string; username: string | null; profileIconUrl: string | null };
  receiver: { id: string; username: string | null; profileIconUrl: string | null };
};

export default function SearchMessagesPage() {
  const { token, user } = useAuthStore();
  const searchParams = useSearchParams();
  const q = searchParams.get('q') || '';
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!q || !token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/user/messages?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMessages(await res.json());
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [q, token]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  if (!user) {
    return (
      <div className="min-h-screen pt-32 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">
        Please sign in to search your signals.
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-20 px-4 sm:px-6 bg-slate-950">
      <div className="mx-auto max-w-4xl space-y-8 sm:space-y-12 animate-fade-in transform-gpu">
        <div className="space-y-4 px-2">
          <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
            Inbox Discovery
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white uppercase italic tracking-tighter leading-none">
            Message Scan<span className="text-cyan-500">.</span>
          </h1>
          {q && (
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[8px] sm:text-[9px] mt-1">
              Detected {messages.length} signals matching &quot;{q}&quot;
            </p>
          )}
        </div>

        <div className="grid gap-4">
          {messages.map((m) => {
            const isMe = m.senderId === user.id;
            const other = isMe ? m.receiver : m.sender;
            return (
              <Link
                key={m.id}
                href={`/account/messages/${other.id}`}
                className="p-5 sm:p-6 rounded-[24px] sm:rounded-[32px] border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] transition-all group shadow-xl"
              >
                <div className="flex items-start gap-4 sm:gap-6">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-slate-900 border border-white/5 overflow-hidden shrink-0 relative">
                    {other.profileIconUrl ? (
                      <Image
                        src={getProxiedImageUrl(other.profileIconUrl)}
                        alt=""
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-slate-700">
                        <span className="material-icons text-xl">person</span>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <div className="text-[10px] sm:text-xs font-black text-white uppercase italic tracking-tighter">
                        @{other.username}
                      </div>
                      <div className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">
                        {new Date(m.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-sm text-slate-400 font-medium line-clamp-2 leading-relaxed">
                      {isMe && (
                        <span className="text-cyan-500 mr-2 uppercase text-[10px] font-black italic">
                          Sent:
                        </span>
                      )}
                      {m.content}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
          {messages.length === 0 && !loading && (
            <div className="p-16 sm:p-32 text-center text-slate-600 font-bold uppercase tracking-widest text-[10px] sm:text-xs border border-dashed border-white/10 rounded-[32px] sm:rounded-[40px] bg-white/[0.01]">
              No matching messages found in your encrypted inbox.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
