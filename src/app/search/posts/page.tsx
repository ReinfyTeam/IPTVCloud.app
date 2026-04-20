'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';

type Post = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  user: { username: string; isVerified: boolean };
  _count: { comments: number; likes: number };
};

export default function SearchPostsPage() {
  const searchParams = useSearchParams();
  const q = searchParams.get('q') || '';
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/search/posts?q=${encodeURIComponent(q)}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setPosts(data);
      })
      .finally(() => setLoading(false));
  }, [q]);

  return (
    <div className="min-h-screen pt-32 pb-20 px-4 sm:px-6 bg-slate-950">
      <div className="mx-auto max-w-4xl space-y-8 sm:space-y-12 animate-fade-in transform-gpu">
        <div className="space-y-4 px-2">
          <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
            Content Discovery
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white uppercase italic tracking-tighter leading-none">
            Post Archive<span className="text-cyan-500">.</span>
          </h1>
        </div>

        <div className="grid gap-4 sm:gap-6">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/posts/${post.id}`}
              className="p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] transition-all transform-gpu hover:-translate-y-1 shadow-xl block relative overflow-hidden"
            >
              <div className="flex items-center gap-3 mb-6 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500">
                <span className="text-cyan-400">@{post.user.username}</span>
                <span className="h-1 w-1 rounded-full bg-slate-800" />
                <span>{new Date(post.createdAt).toLocaleDateString()}</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white mb-4 uppercase italic tracking-tighter leading-tight">
                {post.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 line-clamp-2 mb-8 font-medium leading-relaxed">
                {post.content}
              </p>
              <div className="flex gap-6 pt-6 border-t border-white/[0.04] text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="material-icons text-base sm:text-lg">favorite_border</span>{' '}
                  <span className="text-xs font-bold">{post._count.likes}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-icons text-base sm:text-lg">chat_bubble_outline</span>{' '}
                  <span className="text-xs font-bold">{post._count.comments}</span>
                </div>
              </div>
            </Link>
          ))}
          {posts.length === 0 && !loading && (
            <div className="p-16 sm:p-32 text-center text-slate-600 font-bold uppercase tracking-widest text-[10px] sm:text-xs border border-dashed border-white/10 rounded-[32px] sm:rounded-[40px] bg-white/[0.01]">
              No posts found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
