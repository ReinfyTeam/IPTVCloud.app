'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/auth-store';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Post = {
  id: string;
  title: string;
  createdAt: string;
  _count: { comments: number; likes: number };
};

export default function ManagePostsPage() {
  const { user, token } = useAuthStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchMyPosts = useCallback(async () => {
    try {
      const res = await fetch(`/api/posts?userId=${user?.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || data);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [user?.id, token]);

  useEffect(() => {
    if (user) fetchMyPosts();
  }, [user, fetchMyPosts]);

  const handleDelete = async (postId: string) => {
    if (!confirm('Delete this post permanently?')) return;
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchMyPosts();
    } catch {}
  };

  if (!user) return null;

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 bg-slate-950">
      <div className="mx-auto max-w-4xl space-y-10 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">
              My Content
            </h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Manage your signals and community posts
            </p>
          </div>
          <Link
            href="/posts/create"
            className="px-6 py-3 rounded-2xl bg-cyan-500 text-slate-950 font-black text-[10px] uppercase tracking-widest hover:bg-cyan-400 transition-all active:scale-95 shadow-lg shadow-cyan-900/20"
          >
            New Post
          </Link>
        </div>

        <div className="grid gap-4">
          {loading ? (
            [...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-24 rounded-3xl bg-white/[0.02] border border-white/5 animate-pulse"
              />
            ))
          ) : posts.length === 0 ? (
            <div className="p-20 text-center rounded-[40px] border border-dashed border-white/10 bg-white/[0.01] space-y-4">
              <span className="material-icons text-4xl text-slate-800">post_add</span>
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic text-center">
                No posts found
              </p>
            </div>
          ) : (
            posts.map((p) => (
              <div
                key={p.id}
                className="group p-6 rounded-[32px] bg-white/[0.02] border border-white/[0.08] hover:bg-white/[0.04] transition-all flex items-center justify-between gap-6"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-black text-white uppercase italic tracking-tight truncate group-hover:text-cyan-400 transition-colors">
                    {p.title}
                  </h3>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </span>
                    <span className="h-1 w-1 rounded-full bg-slate-700" />
                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500">
                      <span className="material-icons text-xs">chat_bubble</span>
                      {p._count.comments}
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500">
                      <span className="material-icons text-xs">favorite</span>
                      {p._count.likes}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/posts/${p.id}`}
                    className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-all"
                  >
                    <span className="material-icons text-lg">visibility</span>
                  </Link>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-all"
                  >
                    <span className="material-icons text-lg">delete</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
