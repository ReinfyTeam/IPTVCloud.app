'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { useAuthStore } from '@/store/auth-store';

type Comment = {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; username: string; isVerified: boolean; role: string };
};

type Post = {
  id: string;
  title: string;
  content: string;
  userId: string;
  createdAt: string;
  user: { id: string; username: string; isVerified: boolean; role: string };
  _count: { comments: number; likes: number };
};

export default function PostDetailPage({ params }: { params: { id: string } }) {
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const { user, token } = useAuthStore();

  const fetchPost = useCallback(async () => {
    try {
      const res = await fetch(`/api/posts/${params.id}`);
      const data = await res.json();
      if (res.ok) setPost(data);
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
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 bg-slate-950">
      <div className="mx-auto max-w-4xl space-y-12 animate-fade-in transform-gpu">
        <div className="space-y-8">
          <div className="flex items-center gap-6">
            <Link
              href="/posts"
              className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all"
            >
              <span className="material-icons">west</span>
            </Link>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center text-slate-600 shadow-xl">
                <span className="material-icons">account_circle</span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-black text-white uppercase italic tracking-tighter">
                    @{post.user.username}
                  </span>
                  {post.user.isVerified && (
                    <span className="material-icons text-cyan-500 text-sm">verified</span>
                  )}
                </div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                  {new Date(post.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[48px] bg-white/[0.02] border border-white/[0.08] p-10 shadow-2xl backdrop-blur-xl">
            <h1 className="text-4xl font-black text-white mb-8 tracking-tighter uppercase italic leading-none">
              {post.title}
            </h1>
            <div className="prose prose-invert prose-slate prose-cyan max-w-none text-slate-300 font-medium leading-relaxed mb-12">
              <ReactMarkdown>{post.content}</ReactMarkdown>
            </div>

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
          <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter px-2">
            Discussion<span className="text-cyan-500">.</span>
          </h2>

          {user ? (
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
                <div className="h-10 w-10 rounded-2xl bg-slate-900 border border-white/5 flex items-center justify-center text-slate-600 shadow-xl shrink-0 mt-1">
                  <span className="material-icons text-xl">account_circle</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-bold text-white text-sm">@{comment.user.username}</span>
                    {comment.user.id === post.userId && (
                      <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 text-[8px] font-black uppercase tracking-widest border border-cyan-500/20">
                        OP
                      </span>
                    )}
                    <span className="text-[10px] text-slate-600 uppercase font-bold tracking-widest">
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed font-medium">
                    {comment.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
