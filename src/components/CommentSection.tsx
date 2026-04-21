'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/store/auth-store';
import dynamic from 'next/dynamic';
import UserHoverCard from './UserHoverCard';
import ReactMarkdown from 'react-markdown';
import { getProxiedImageUrl } from '@/lib/image-proxy';

const EmojiPicker = dynamic(() => import('./EmojiPicker'), { ssr: false });

type CommentUser = {
  id: string;
  name: string | null;
  username: string | null;
  email: string;
  role: string;
  profileIconUrl: string | null;
  profileIcon: string | null;
};

type Attachment = { id: string; url: string; filename: string; type: string };

type Comment = {
  id: string;
  userId: string;
  text: string;
  isPinned: boolean;
  createdAt: string;
  user: CommentUser;
  attachments: Attachment[];
};

type Props = {
  channelId: string;
  ownerId?: string; // ID of the channel owner or OP
};

export default function CommentSection({ channelId, ownerId }: Props) {
  const { user, token, isAdmin, isStaff } = useAuthStore();
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<{ url: string; filename: string; type: string }[]>(
    [],
  );
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/comments?channelId=${encodeURIComponent(channelId)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) setComments(await res.json());
    } catch {
      // ignore
    }
  }, [channelId, token]);

  useEffect(() => {
    fetchComments();
    const interval = setInterval(fetchComments, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [fetchComments]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/attachments/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) setAttachments([...attachments, await res.json()]);
    } catch {
    } finally {
      setUploading(false);
    }
  };

  const insertMarkdown = (prefix: string, suffix = prefix) => {
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    if (!input) return;
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const val = input.value;
    const before = val.substring(0, start);
    const selection = val.substring(start, end);
    const after = val.substring(end);
    setText(before + prefix + selection + suffix + after);
    input.focus();
  };

  const postComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!text.trim() && attachments.length === 0) || !user || !token) return;

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ channelId, text, attachments }),
      });
      const data = await res.json();
      if (res.ok) {
        setText('');
        setAttachments([]);
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

  const handleEdit = async (id: string) => {
    if (!editText.trim() || !token) return;
    try {
      const res = await fetch('/api/comments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, text: editText }),
      });
      if (res.ok) {
        const updated = await res.json();
        setComments(comments.map((c) => (c.id === id ? updated : c)));
        setEditingId(null);
      }
    } catch {}
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
            <div className="h-8 w-8 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden relative">
              {c.user.profileIconUrl ? (
                <Image
                  src={getProxiedImageUrl(c.user.profileIconUrl)}
                  alt=""
                  fill
                  className="object-cover"
                />
              ) : c.user.profileIcon ? (
                <span className="material-icons text-lg text-slate-500">{c.user.profileIcon}</span>
              ) : (
                <span className="material-icons text-lg text-slate-600">account_circle</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <UserHoverCard username={c.user.username || c.user.id}>
                  <span
                    className={`text-[11px] font-black uppercase italic tracking-tighter truncate ${c.user.role === 'ADMIN' ? 'text-red-400' : c.user.role === 'STAFF' ? 'text-violet-400' : 'text-slate-300'}`}
                  >
                    {c.user.username || c.user.name || c.user.email.split('@')[0]}
                  </span>
                </UserHoverCard>
                {c.userId === ownerId && (
                  <span className="bg-cyan-500 text-slate-950 text-[8px] font-black px-1 rounded-sm uppercase tracking-tighter">
                    OP
                  </span>
                )}
                {c.isPinned && (
                  <span className="text-[10px] text-cyan-400 flex items-center gap-1">
                    <span className="material-icons text-[10px]">push_pin</span>
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-100 break-words leading-relaxed prose prose-invert prose-xs max-w-none">
                {editingId === c.id ? (
                  <div className="flex flex-col gap-2 mt-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full rounded-xl bg-slate-950 border border-white/10 p-3 text-xs outline-none focus:border-cyan-500"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(c.id)}
                        className="text-[9px] font-black uppercase text-cyan-400"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-[9px] font-black uppercase text-slate-500"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <ReactMarkdown
                    allowedElements={['strong', 'em', 'p', 'span', 'ul', 'ol', 'li']}
                    unwrapDisallowed
                  >
                    {c.text}
                  </ReactMarkdown>
                )}
              </div>
              {c.attachments && c.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {c.attachments.map((a) => (
                    <a
                      key={a.id}
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group relative h-12 w-12 rounded-lg bg-slate-900 border border-white/5 overflow-hidden flex items-center justify-center"
                    >
                      {a.type === 'IMAGE' ? (
                        <Image
                          src={getProxiedImageUrl(a.url)}
                          alt=""
                          fill
                          className="object-cover group-hover:scale-110 transition-transform"
                        />
                      ) : (
                        <span className="material-icons text-slate-600 text-xs">attach_file</span>
                      )}
                    </a>
                  ))}
                </div>
              )}
            </div>

            {(isAdmin() || isStaff() || c.userId === user?.id) && (
              <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                {c.userId === user?.id && (
                  <button
                    onClick={() => {
                      setEditingId(c.id);
                      setEditText(c.text);
                    }}
                    className="p-1.5 text-slate-500 hover:text-cyan-400 transition-colors"
                  >
                    <span className="material-icons text-sm">edit</span>
                  </button>
                )}
                {(isAdmin() || isStaff()) && (
                  <button
                    onClick={() => togglePin(c.id, !c.isPinned)}
                    className="p-1.5 text-slate-500 hover:text-cyan-400 transition-colors"
                  >
                    <span className="material-icons text-sm">push_pin</span>
                  </button>
                )}
                <button
                  onClick={() => deleteComment(c.id)}
                  className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                >
                  <span className="material-icons text-sm">delete</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="p-4 bg-white/[0.02] border-t border-white/[0.05]">
        {user ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-1 px-1">
              <div className="flex items-center gap-2">
                <EmojiPicker onSelect={(emoji) => setText((prev) => prev + emoji)} />
                <div className="flex gap-2 opacity-50">
                  <button
                    type="button"
                    onClick={() => insertMarkdown('**')}
                    className="text-[10px] font-bold text-white hover:opacity-100 transition-opacity"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown('_')}
                    className="text-[10px] italic font-bold text-white hover:opacity-100 transition-opacity"
                  >
                    I
                  </button>
                </div>
              </div>
              <label
                className={`cursor-pointer p-2 rounded-xl transition-all ${uploading ? 'opacity-30' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
              >
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
                <span className="material-icons text-sm">{uploading ? 'sync' : 'attach_file'}</span>
              </label>
            </div>

            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 px-1 mb-2">
                {attachments.map((a, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-bold text-slate-400"
                  >
                    <span className="material-icons text-xs">attachment</span>
                    <span className="truncate max-w-[80px]">{a.filename}</span>
                    <button
                      type="button"
                      onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))}
                      className="text-red-400 hover:text-red-300"
                    >
                      <span className="material-icons text-xs">close</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={postComment} className="relative">
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={
                  user.isMuted ? 'You are currently muted from chat' : 'Write a message...'
                }
                disabled={loading || user.isMuted}
                className={`w-full rounded-2xl border bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-all pr-12 ${
                  user.isMuted
                    ? 'border-red-500/20 opacity-50'
                    : 'border-white/10 focus:border-cyan-500/50'
                }`}
              />
              <button
                type="submit"
                disabled={loading || (!text.trim() && attachments.length === 0) || user.isMuted}
                className={`absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-xl flex items-center justify-center transition-all active:scale-90 ${
                  user.isMuted
                    ? 'bg-slate-800 text-slate-600'
                    : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
                }`}
              >
                <span className="material-icons text-sm">{user.isMuted ? 'block' : 'send'}</span>
              </button>
            </form>
            {error && <div className="text-[10px] text-red-400 font-medium px-2">{error}</div>}
          </div>
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
