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
  senderId: string;
  receiverId: string;
  createdAt: string;
};

type UserInfo = {
  id: string;
  username: string | null;
  name: string | null;
  profileIconUrl: string | null;
  isVerified: boolean;
};

export default function ChatDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { token, user: currentUser } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/user/messages/${id}`, {
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

  const fetchOtherUser = useCallback(async () => {
    try {
      const res = await fetch(`/api/user/profile/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOtherUser(data);
      }
    } catch {}
  }, [id, token]);

  useEffect(() => {
    if (token) {
      fetchMessages();
      fetchOtherUser();
      const interval = setInterval(fetchMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [token, fetchMessages, fetchOtherUser]);

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
      const res = await fetch('/api/user/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ receiverId: id, content: newMessage }),
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

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 bg-slate-950 flex flex-col">
      <div className="mx-auto w-full max-w-4xl flex-1 flex flex-col space-y-4 sm:space-y-6 animate-fade-in transform-gpu">
        <div className="flex items-center gap-4 sm:gap-6 p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] bg-white/[0.02] border border-white/5 relative overflow-hidden backdrop-blur-xl shrink-0">
          <Link
            href="/account/messages"
            className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all shrink-0"
          >
            <span className="material-icons text-lg sm:text-xl">west</span>
          </Link>

          <div className="relative h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-slate-900 border border-white/10 overflow-hidden shrink-0">
            {otherUser?.profileIconUrl ? (
              <Image
                src={getProxiedImageUrl(otherUser.profileIconUrl)}
                alt=""
                fill
                className="object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-slate-700">
                <span className="material-icons text-xl sm:text-2xl">person</span>
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl font-black text-white uppercase italic tracking-tighter leading-none flex items-center gap-2 truncate">
              {otherUser?.username || otherUser?.name || 'Loading...'}
              {otherUser?.isVerified && (
                <span className="material-icons text-cyan-400 text-xs sm:text-sm">verified</span>
              )}
            </h1>
            <p className="text-[8px] sm:text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">
              Private Chat
            </p>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto space-y-4 sm:space-y-6 px-4 scrollbar-hide py-4 bg-slate-950/50 rounded-[32px] sm:rounded-[40px] border border-white/[0.03]"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30">
              <span className="material-icons text-5xl sm:text-6xl">waving_hand</span>
              <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest">
                Start the conversation
              </p>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.senderId === currentUser?.id ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[80%] px-4 sm:px-6 py-3 sm:py-4 rounded-[20px] sm:rounded-[24px] text-xs sm:text-sm font-medium leading-relaxed ${
                    m.senderId === currentUser?.id
                      ? 'bg-cyan-500 text-slate-950 rounded-br-none shadow-lg shadow-cyan-900/10'
                      : 'bg-white/[0.05] text-white border border-white/[0.08] rounded-bl-none'
                  }`}
                >
                  <ReactMarkdown
                    allowedElements={['strong', 'em', 'p', 'span', 'br', 'ul', 'ol', 'li']}
                    unwrapDisallowed
                  >
                    {m.content}
                  </ReactMarkdown>
                </div>
                <span className="text-[8px] sm:text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-2 px-1">
                  {new Date(m.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))
          )}
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
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
