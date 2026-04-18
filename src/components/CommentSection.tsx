'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';
import type { AuthUser } from '@/types';

type CommentUser = { id: string; name: string | null; email: string; role: string };

type Comment = {
  id: string;
  userId: string;
  text: string;
  isPinned: boolean;
  createdAt: string;
  user: CommentUser;
};

type Props = {
  channelId: string;
};

export default function CommentSection({ channelId }: Props) {
  const { user, token, isAdmin, isStaff } = useAuthStore();
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/comments?channelId=${encodeURIComponent(channelId)}`);
      if (res.ok) setComments(await res.json());
    } catch {
      // ignore
    }
  }, [channelId]);

  useEffect(() => {
    fetchComments();
    const interval = setInterval(fetchComments, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [fetchComments]);

  const postComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !user || !token) return;

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ channelId, text }),
      });
      const data = await res.json();
      if (res.ok) {
        setText('');
        setComments([data, ...comments]);
      } else {
        setError(data.error || 'Failed to post');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const deleteComment = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch('/api/comments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id }),
      });
      if (res.ok) setComments(comments.filter((c) => c.id !== id));
    } catch {
      // ignore
    }
  };

  const togglePin = async (id: string, isPinned: boolean) => {
    if (!token) return;
    try {
      const res = await fetch('/api/comments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, isPinned }),
      });
      if (res.ok) fetchComments();
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/50 backdrop-blur-xl border border-white/[0.08] rounded-3xl overflow-hidden">
      <div className="p-4 border-b border-white/[0.05] bg-white/[0.02]">
        <h3 className="font-bold text-white flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Live Chat
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
        {comments.map((c) => (
          <div
            key={c.id}
            className={`group relative flex gap-3 animate-fade-in ${c.isPinned ? 'bg-cyan-500/5 -mx-2 px-2 py-3 rounded-2xl border border-cyan-500/10' : ''}`}
          >
            <div className="h-8 w-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center shrink-0">
              <svg className="h-4 w-4 text-slate-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  className={`text-xs font-bold truncate ${c.user.role === 'ADMIN' ? 'text-red-400' : c.user.role === 'STAFF' ? 'text-violet-400' : 'text-slate-300'}`}
                >
                  {c.user.name || c.user.email.split('@')[0]}
                </span>
                {c.isPinned && (
                  <span className="text-[10px] text-cyan-400 flex items-center gap-1">
                    <span className="material-icons text-[10px]">push_pin</span> Pinned
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-100 break-words leading-relaxed">{c.text}</p>
            </div>

            {(isAdmin() || isStaff() || c.userId === user?.id) && (
              <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                {(isAdmin() || isStaff()) && (
                  <button
                    onClick={() => togglePin(c.id, !c.isPinned)}
                    className="p-1.5 text-slate-500 hover:text-cyan-400 transition-colors"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                      />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => deleteComment(c.id)}
                  className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="p-4 bg-white/[0.02] border-t border-white/[0.05]">
        {user ? (
          <form onSubmit={postComment} className="space-y-2">
            <div className="relative">
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={user.isMuted ? 'You are muted' : 'Write a message...'}
                disabled={loading || user.isMuted}
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-cyan-500/50 transition-all"
              />
              <button
                type="submit"
                disabled={loading || !text.trim() || user.isMuted}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-xl bg-cyan-500 text-slate-950 flex items-center justify-center hover:bg-cyan-400 disabled:opacity-50 transition-all active:scale-90"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 10l7-7m0 0l7 7m-7-7v18"
                  />
                </svg>
              </button>
            </div>
            {error && <div className="text-[10px] text-red-400 font-medium px-2">{error}</div>}
          </form>
        ) : (
          <div className="text-center py-2">
            <Link
              href="/account/signin"
              className="text-xs font-bold text-cyan-400 hover:underline"
            >
              Sign in to chat
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
