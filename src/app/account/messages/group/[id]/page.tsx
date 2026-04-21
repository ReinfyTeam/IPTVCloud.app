'use client';

import React, { use, useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/store/auth-store';
import { getProxiedImageUrl } from '@/lib/image-proxy';
import EmojiPicker from '@/components/EmojiPicker';
import ReactMarkdown from 'react-markdown';

type Message = {
  id: string;
  content: string;
  userId: string;
  isPinned: boolean;
  createdAt: string;
};

type GroupInfo = {
  id: string;
  name: string | null;
  themeColor: string;
  members: {
    isAdmin: boolean;
    user: { id: string; username: string | null; profileIconUrl: string | null };
  }[];
};

export default function GroupChatDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { token, user: currentUser } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/user/groupchats/${id}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  const fetchGroup = useCallback(async () => {
    try {
      const res = await fetch(`/api/user/groupchats/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setGroup(data.group);
      }
    } catch {}
  }, [id, token]);

  useEffect(() => {
    if (token) {
      fetchMessages();
      fetchGroup();
      const interval = setInterval(fetchMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [token, fetchMessages, fetchGroup]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/user/groupchats/${id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newMessage }),
      });
      if (res.ok) {
        const msg = await res.json();
        setMessages((prev) => [...prev, msg]);
        setNewMessage('');
      }
    } catch {
    } finally {
      setSending(false);
    }
  };

  const kickUser = async (targetUserId: string) => {
    if (!confirm('Kick user from group?')) return;
    try {
      await fetch(`/api/user/groupchats/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'kick', targetUserId }),
      });
      fetchGroup();
    } catch {}
  };

  const insertMarkdown = (prefix: string, suffix = prefix) => {
    const textarea = document.querySelector('input');
    if (!textarea) return;
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const text = textarea.value;
    const before = text.substring(0, start);
    const selection = text.substring(start, end);
    const after = text.substring(end);
    setNewMessage(before + prefix + selection + suffix + after);
    textarea.focus();
  };

  if (loading) return null;

  const amAdmin = group?.members.find((m) => m.user.id === currentUser?.id)?.isAdmin;

  return (
    <div
      className="min-h-screen pt-24 pb-20 px-4 sm:px-6 bg-slate-950 flex flex-col"
      style={{ ['--group-theme' as any]: group?.themeColor || '#06b6d4' }}
    >
      <div className="mx-auto w-full max-w-4xl flex-1 flex flex-col space-y-4 sm:space-y-6 animate-fade-in transform-gpu">
        <div
          className="flex items-center gap-4 sm:gap-6 p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] bg-white/[0.02] border border-white/5 relative overflow-hidden backdrop-blur-xl shrink-0"
          style={{ borderLeftColor: 'var(--group-theme)', borderLeftWidth: '4px' }}
        >
          <Link
            href="/account/messages"
            className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all shrink-0"
          >
            <span className="material-icons text-lg sm:text-xl">west</span>
          </Link>

          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl font-black text-white uppercase italic tracking-tighter leading-none truncate">
              {group?.name || 'Group Chat'}
            </h1>
            <p className="text-[8px] sm:text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">
              {group?.members.length} Members
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex -space-x-2 shrink-0 hidden sm:flex">
              {group?.members.slice(0, 3).map((m, i) => (
                <div
                  key={i}
                  className="h-6 w-6 sm:h-8 sm:w-8 rounded-full border-2 border-slate-950 bg-slate-800 flex items-center justify-center text-[8px] sm:text-[10px] text-white font-black overflow-hidden relative shadow-lg"
                >
                  {m.user.profileIconUrl ? (
                    <Image
                      src={getProxiedImageUrl(m.user.profileIconUrl)}
                      alt=""
                      fill
                      className="object-cover"
                    />
                  ) : (
                    m.user.username?.[0]
                  )}
                </div>
              ))}
            </div>

            <Link
              href={`/account/messages/group/${id}/info`}
              className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all shrink-0"
              title="Group Info & Settings"
            >
              <span className="material-icons text-lg sm:text-xl">info</span>
            </Link>
          </div>
        </div>

        {/* Pinned Messages Area */}
        {messages.some((m) => m.isPinned) && (
          <div className="px-4 py-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center gap-3">
            <span className="material-icons text-cyan-400 text-sm">push_pin</span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-cyan-300 truncate">
                {messages.find((m) => m.isPinned)?.content}
              </p>
            </div>
          </div>
        )}

        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto space-y-4 sm:space-y-6 px-4 scrollbar-hide py-4 bg-slate-950/50 rounded-[32px] sm:rounded-[40px] border border-white/[0.03]"
        >
          {messages.map((m) => {
            const sender = group?.members.find((mem) => mem.user.id === m.userId)?.user;
            const isMe = m.userId === currentUser?.id;
            return (
              <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                {!isMe && sender && (
                  <span className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 px-4">
                    @{sender.username}
                  </span>
                )}
                <div
                  className={`max-w-[85%] sm:max-w-[80%] px-4 sm:px-6 py-3 sm:py-4 rounded-[20px] sm:rounded-[24px] text-xs sm:text-sm font-medium leading-relaxed relative ${
                    isMe
                      ? 'bg-cyan-500 text-slate-950 rounded-br-none shadow-lg shadow-cyan-900/10'
                      : 'bg-white/[0.05] text-white border border-white/[0.08] rounded-bl-none'
                  }`}
                  style={isMe ? { backgroundColor: 'var(--group-theme)' } : {}}
                >
                  {m.isPinned && (
                    <span className="absolute -top-2 -right-2 h-5 w-5 bg-cyan-500 text-slate-950 rounded-full flex items-center justify-center border-2 border-slate-950 scale-75 shadow-lg">
                      <span className="material-icons text-[10px]">push_pin</span>
                    </span>
                  )}
                  <ReactMarkdown
                    allowedElements={['strong', 'em', 'p', 'span', 'br', 'ul', 'ol', 'li']}
                    unwrapDisallowed
                  >
                    {m.content}
                  </ReactMarkdown>
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-3 shrink-0">
          <div className="flex items-center gap-1 px-4 py-2 rounded-2xl bg-white/[0.02] border border-white/5 w-fit">
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
              onClick={() => insertMarkdown('- ')}
              className="p-1.5 text-slate-500 hover:text-white transition-colors"
              title="List"
            >
              <span className="material-icons text-sm">format_list_bulleted</span>
            </button>
            <div className="h-4 w-px bg-white/10 mx-2 shrink-0" />
            <EmojiPicker onSelect={(emoji) => setNewMessage((prev) => prev + emoji)} />
          </div>

          <form onSubmit={handleSend} className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="w-full rounded-2xl sm:rounded-[24px] border border-white/10 bg-slate-900/50 py-4 sm:py-5 pl-5 sm:pl-6 pr-12 text-xs sm:text-sm text-white placeholder:text-slate-500 outline-none focus:border-cyan-500 transition-all shadow-inner"
              />
            </div>
            <button
              type="submit"
              disabled={sending || !newMessage}
              className="px-6 sm:px-8 py-4 sm:py-5 rounded-2xl sm:rounded-[24px] bg-cyan-500 text-slate-950 font-black text-[9px] sm:text-[10px] uppercase tracking-widest hover:bg-cyan-400 active:scale-95 transition-all shadow-lg shadow-cyan-900/20 shrink-0"
              style={{ backgroundColor: 'var(--group-theme)' }}
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
