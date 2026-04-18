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
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 bg-slate-950">
      <div className="mx-auto max-w-4xl space-y-12">
        <div className="space-y-4">
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 px-1">
            Content Discovery
          </div>
          <h1 className="text-5xl font-black text-white uppercase italic tracking-tighter leading-none">
            Post Archive<span className="text-cyan-500">.</span>
          </h1>
        </div>

        <div className="grid gap-6">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/posts/${post.id}`}
              className="p-8 rounded-[40px] border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] transition-all transform-gpu hover:-translate-y-1 shadow-xl block"
            >
              <div className="flex items-center gap-3 mb-6 text-[10px] font-black uppercase tracking-widest text-slate-500">
                <span>@{post.user.username}</span>
                <span className="h-1 w-1 rounded-full bg-slate-800" />
                <span>{new Date(post.createdAt).toLocaleDateString()}</span>
              </div>
              <h3 className="text-2xl font-black text-white mb-4 uppercase italic tracking-tighter">
                {post.title}
              </h3>
              <p className="text-sm text-slate-400 line-clamp-2 mb-8 font-medium leading-relaxed">
                {post.content}
              </p>
              <div className="flex gap-6 pt-6 border-t border-white/[0.04] text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="material-icons text-base">favorite_border</span>{' '}
                  <span className="text-xs font-bold">{post._count.likes}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-icons text-base">chat_bubble_outline</span>{' '}
                  <span className="text-xs font-bold">{post._count.comments}</span>
                </div>
              </div>
            </Link>
          ))}
          {posts.length === 0 && !loading && (
            <div className="p-32 text-center text-slate-600 font-bold uppercase tracking-widest text-xs border border-dashed border-white/10 rounded-[40px]">
              No posts found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
