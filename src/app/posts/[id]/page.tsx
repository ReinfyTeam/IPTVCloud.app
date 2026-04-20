'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { useAuthStore } from '@/store/auth-store';
import VerifiedBadge from '@/components/VerifiedBadge';
import UserHoverCard from '@/components/UserHoverCard';
import EmojiPicker from '@/components/EmojiPicker';
import Image from 'next/image';
import { getProxiedImageUrl } from '@/lib/image-proxy';

type Attachment = { id: string; url: string; filename: string };

type Comment = {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    isVerified: boolean;
    role: string;
    profileIconUrl: string | null;
  };
};

type Post = {
  id: string;
  title: string;
  content: string;
  userId: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    isVerified: boolean;
    role: string;
    profileIconUrl: string | null;
  };
  _count: { comments: number; likes: number };
  attachments: Attachment[];
};

export default function PostDetailPage({ params }: { params: { id: string } }) {
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [liked, setLiked] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const { user, token } = useAuthStore();

  const fetchPost = useCallback(async () => {
    try {
      const res = await fetch(`/api/posts/${params.id}`);
      const data = await res.json();
      if (res.ok) {
        setPost(data);
        setEditTitle(data.title);
        setEditContent(data.content);
      }
    } catch {}
  }, [params.id]);

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/posts/${params.id}/comments`);
      const data = await res.json();
      if (res.ok) setComments(data);
    } catch {}
  }, [params.id]);

  useEffect(() => {
    Promise.all([fetchPost(), fetchComments()]).finally(() => setLoading(false));
  }, [fetchPost, fetchComments]);

  const handleUpdate = async () => {
    if (!editTitle || !editContent || !token) return;
    setSending(true);
    try {
      const res = await fetch(`/api/posts/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: editTitle, content: editContent }),
      });
      if (res.ok) {
        setEditing(false);
        fetchPost();
      }
    } catch {
    } finally {
      setSending(false);
    }
  };

  const insertMarkdown = (prefix: string, suffix = prefix) => {
    const textarea = document.querySelector('textarea');
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const selection = text.substring(start, end);
    const after = text.substring(end);
    setNewComment(before + prefix + selection + suffix + after);
    textarea.focus();
  };

  const handleLike = async () => {
    if (!user) return alert('Sign in to like posts.');
    try {
      const res = await fetch(`/api/posts/${params.id}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLiked(data.liked);
        fetchPost();
      }
    } catch {}
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/posts/${params.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: newComment }),
      });
      if (res.ok) {
        setNewComment('');
        fetchComments();
        fetchPost();
      }
    } catch {
    } finally {
      setSending(false);
    }
  };

  if (loading) return null;
  if (!post)
    return <div className="min-h-screen pt-32 text-center text-white">Post not found.</div>;

  return (
    <div className="min-h-screen pt-32 pb-20 px-4 sm:px-6 bg-slate-950">
      <div className="mx-auto max-w-4xl space-y-8 sm:space-y-12 animate-fade-in transform-gpu">
        <div className="space-y-6 sm:space-y-8">
          <div className="flex items-center gap-4 sm:gap-6">
            <Link
              href="/posts"
              className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all"
            >
              <span className="material-icons text-lg sm:text-xl">west</span>
            </Link>
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-slate-900 border border-white/10 overflow-hidden shrink-0 relative shadow-xl">
                {post.user.profileIconUrl ? (
                  <Image
                    src={getProxiedImageUrl(post.user.profileIconUrl)}
                    alt=""
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-slate-700">
                    <span className="material-icons text-xl sm:text-2xl">account_circle</span>
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <UserHoverCard username={post.user.username}>
                    <span className="text-sm sm:text-base font-black text-white uppercase italic tracking-tighter truncate">
                      @{post.user.username}
                    </span>
                  </UserHoverCard>
                  {post.user.isVerified && <VerifiedBadge className="text-xs sm:text-sm ml-1" />}
                </div>
                <div className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                  {new Date(post.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] sm:rounded-[48px] bg-white/[0.02] border border-white/[0.08] p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between mb-6 sm:mb-8 gap-4">
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tighter uppercase italic leading-tight truncate">
                {post.title}
              </h1>
              {user?.id === post.userId && (
                <button
                  onClick={() => setEditing(!editing)}
                  className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-cyan-400 transition-all active:scale-95 shrink-0"
                >
                  <span className="material-icons text-lg sm:text-xl">
                    {editing ? 'close' : 'edit'}
                  </span>
                </button>
              )}
            </div>

            {editing ? (
              <div className="space-y-4 sm:space-y-6 mb-8 animate-fade-in">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-xl sm:rounded-2xl border border-white/10 bg-slate-950 p-4 text-sm sm:text-base text-white outline-none focus:border-cyan-500 font-bold"
                />

                <div className="flex items-center gap-1 px-4 py-2 rounded-xl sm:rounded-2xl bg-white/[0.02] border border-white/5 w-fit">
                  <button
                    type="button"
                    onClick={() => {
                      const textarea = document.querySelector('textarea');
                      if (!textarea) return;
                      const start = textarea.selectionStart;
                      const end = textarea.selectionEnd;
                      const text = textarea.value;
                      setEditContent(
                        text.substring(0, start) +
                          '**' +
                          text.substring(start, end) +
                          '**' +
                          text.substring(end),
                      );
                      textarea.focus();
                    }}
                    className="p-1.5 text-slate-500 hover:text-white transition-colors"
                    title="Bold"
                  >
                    <span className="material-icons text-sm">format_bold</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const textarea = document.querySelector('textarea');
                      if (!textarea) return;
                      const start = textarea.selectionStart;
                      const end = textarea.selectionEnd;
                      const text = textarea.value;
                      setEditContent(
                        text.substring(0, start) +
                          '_' +
                          text.substring(start, end) +
                          '_' +
                          text.substring(end),
                      );
                      textarea.focus();
                    }}
                    className="p-1.5 text-slate-500 hover:text-white transition-colors"
                    title="Italic"
                  >
                    <span className="material-icons text-sm">format_italic</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const textarea = document.querySelector('textarea');
                      if (!textarea) return;
                      const start = textarea.selectionStart;
                      const text = textarea.value;
                      setEditContent(text.substring(0, start) + '### ' + text.substring(start));
                      textarea.focus();
                    }}
                    className="p-1.5 text-slate-500 hover:text-white transition-colors"
                    title="Heading"
                  >
                    <span className="material-icons text-sm">title</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const textarea = document.querySelector('textarea');
                      if (!textarea) return;
                      const start = textarea.selectionStart;
                      const text = textarea.value;
                      setEditContent(text.substring(0, start) + '- ' + text.substring(start));
                      textarea.focus();
                    }}
                    className="p-1.5 text-slate-500 hover:text-white transition-colors"
                    title="List"
                  >
                    <span className="material-icons text-sm">format_list_bulleted</span>
                  </button>
                </div>

                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full rounded-xl sm:rounded-2xl border border-white/10 bg-slate-950 p-4 text-sm text-white outline-none focus:border-cyan-500 min-h-[200px]"
                />
                <button
                  onClick={handleUpdate}
                  disabled={sending}
                  className="w-full py-4 rounded-2xl bg-cyan-500 text-slate-950 font-black uppercase tracking-widest hover:bg-cyan-400 transition-all active:scale-95"
                >
                  {sending ? 'Saving...' : 'Update Signal'}
                </button>
              </div>
            ) : (
              <div className="prose prose-invert prose-slate prose-cyan max-w-none text-slate-300 text-sm sm:text-base font-medium leading-relaxed mb-8 prose-headings:font-black prose-headings:uppercase prose-headings:italic prose-headings:tracking-tighter prose-headings:text-white prose-strong:text-white prose-a:text-cyan-400">
                <ReactMarkdown>{post.content}</ReactMarkdown>
              </div>
            )}

            {post.attachments?.length > 0 && (
              <div className="mb-12 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {post.attachments.map((a) => (
                  <div
                    key={a.id}
                    className="group relative rounded-3xl bg-slate-900 border border-white/5 overflow-hidden shadow-2xl"
                  >
                    {a.url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ||
                    a.url.includes('/api/images/') ? (
                      <a
                        href={a.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block aspect-video relative"
                      >
                        <Image
                          src={getProxiedImageUrl(a.url)}
                          alt=""
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                      </a>
                    ) : a.url.match(/\.(mp4|webm|ogg)$/i) || a.url.includes('/api/videos/') ? (
                      <video controls className="w-full aspect-video bg-black">
                        <source src={a.url} type="video/mp4" />
                      </video>
                    ) : (
                      <a
                        href={a.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex flex-col items-center justify-center p-8 h-full space-y-3 hover:bg-white/5 transition-all"
                      >
                        <span className="material-icons text-4xl text-slate-600">
                          insert_drive_file
                        </span>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate max-w-full px-4">
                          {a.filename}
                        </div>
                        <div className="px-4 py-1.5 rounded-full bg-cyan-500/10 text-cyan-500 text-[8px] font-black uppercase tracking-widest border border-cyan-500/20">
                          Download File
                        </div>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-6 pt-10 border-t border-white/[0.06]">
              <button
                onClick={handleLike}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-full border transition-all active:scale-95 ${liked ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}
              >
                <span className="material-icons text-xl">
                  {liked ? 'favorite' : 'favorite_border'}
                </span>
                <span className="text-xs font-black uppercase tracking-widest">
                  {post._count.likes}
                </span>
              </button>
              <div className="flex items-center gap-2 text-slate-500">
                <span className="material-icons text-xl">chat_bubble_outline</span>
                <span className="text-xs font-bold uppercase tracking-widest">
                  {post._count.comments}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <section className="space-y-8">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">
              Discussion<span className="text-cyan-500">.</span>
            </h2>
          </div>

          {user ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/[0.02] border border-white/5">
                <button
                  type="button"
                  onClick={() => insertMarkdown('**')}
                  className="p-2 text-slate-500 hover:text-white"
                >
                  <span className="material-icons text-sm">format_bold</span>
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown('_')}
                  className="p-2 text-slate-500 hover:text-white"
                >
                  <span className="material-icons text-sm">format_italic</span>
                </button>
                <div className="h-4 w-px bg-white/10 mx-2" />
                <EmojiPicker onSelect={(emoji) => setNewComment((prev) => prev + emoji)} />
              </div>
              <form onSubmit={handleComment} className="relative">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Share your perspective..."
                  className="w-full rounded-[32px] border border-white/10 bg-slate-900/50 p-6 pr-32 text-sm text-white outline-none focus:border-cyan-500 transition-all shadow-inner h-32"
                />
                <button
                  type="submit"
                  disabled={sending || !newComment}
                  className="absolute bottom-4 right-4 px-6 py-2.5 rounded-2xl bg-cyan-500 text-slate-950 font-black text-[10px] uppercase tracking-widest hover:bg-cyan-400 active:scale-95 transition-all shadow-lg shadow-cyan-900/20 disabled:opacity-50"
                >
                  Post
                </button>
              </form>
            </div>
          ) : (
            <div className="p-8 rounded-[32px] border border-dashed border-white/10 text-center bg-white/[0.01]">
              <Link href="/account/signin" className="text-cyan-400 font-bold hover:underline">
                Sign in
              </Link>{' '}
              to participate in the conversation.
            </div>
          )}

          <div className="grid gap-4">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="p-6 rounded-[32px] bg-white/[0.02] border border-white/[0.06] flex gap-5 items-start animate-fade-up"
              >
                <div className="h-10 w-10 rounded-2xl bg-slate-900 border border-white/10 overflow-hidden shrink-0 mt-1 relative shadow-xl">
                  {comment.user.profileIconUrl ? (
                    <Image
                      src={getProxiedImageUrl(comment.user.profileIconUrl)}
                      alt=""
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-700">
                      <span className="material-icons text-xl">account_circle</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <UserHoverCard username={comment.user.username}>
                      <span className="font-bold text-white text-sm">@{comment.user.username}</span>
                    </UserHoverCard>
                    {comment.user.id === post.userId && (
                      <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 text-[8px] font-black uppercase tracking-widest border border-cyan-500/20">
                        OP
                      </span>
                    )}
                    <span className="text-[10px] text-slate-600 uppercase font-bold tracking-widest">
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-sm text-slate-400 leading-relaxed font-medium prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{comment.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
