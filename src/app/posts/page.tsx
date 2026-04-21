'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { useAuthStore } from '@/store/auth-store';
import VerifiedBadge from '@/components/VerifiedBadge';
import Image from 'next/image';
import { getProxiedImageUrl } from '@/lib/image-proxy';

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 10) return 'Just now';
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo ago`;

  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type Post = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  user: { username: string; name: string | null; isVerified: boolean; role: string };
  _count: { comments: number; likes: number };
};

export default function NewsfeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('recommended');
  const { user } = useAuthStore();

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/posts?sort=${sort}`);
      const data = await res.json();
      if (Array.isArray(data)) setPosts(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [sort]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return (
    <div className="min-h-screen pt-32 pb-20 px-4 sm:px-6 bg-slate-950">
      <div className="mx-auto max-w-4xl space-y-12 animate-fade-in transform-gpu">
        <div className="flex flex-col md:flex-row items-end justify-between gap-8 p-6 sm:p-12 rounded-[32px] sm:rounded-[48px] bg-white/[0.02] border border-white/5 relative overflow-hidden shadow-2xl backdrop-blur-xl">
          <div className="absolute top-0 right-0 h-64 w-64 bg-cyan-500/5 blur-[100px] rounded-full" />
          <div className="space-y-4 relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[9px] sm:text-[10px] font-black text-cyan-400 uppercase tracking-widest">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Community Newsfeed
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tighter uppercase italic leading-none">
              Explore Activity<span className="text-cyan-500">.</span>
            </h1>
            <p className="text-slate-400 text-sm font-medium max-w-lg leading-relaxed">
              Stay updated with the latest trends, discussions, and channel reviews from the
              IPTVCloud community.
            </p>
          </div>
          <div className="relative z-10 w-full sm:w-auto">
            {user && (
              <Link
                href="/posts/create"
                className="px-8 sm:px-10 py-4 sm:py-5 rounded-2xl sm:rounded-3xl bg-cyan-500 text-slate-950 font-black text-[10px] sm:text-xs uppercase tracking-widest hover:bg-cyan-400 transition-all active:scale-95 shadow-lg shadow-cyan-900/20 flex items-center justify-center gap-3"
              >
                <span className="material-icons text-lg sm:text-xl">add_box</span>
                Create Post
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 bg-white/[0.03] border border-white/[0.08] p-1 rounded-2xl w-full sm:w-fit overflow-x-auto scrollbar-hide">
          {['recommended', 'newest', 'trending', 'likes', 'comments'].map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`rounded-xl px-4 sm:px-6 py-2.5 text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 whitespace-nowrap ${sort === s ? 'bg-white/10 text-white shadow-lg border border-white/10' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {s}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-64 rounded-[32px] sm:rounded-[40px] bg-white/[0.02] border border-white/5 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid gap-6">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
            {posts.length === 0 && (
              <div className="p-16 sm:p-32 text-center text-slate-500 border border-dashed border-white/10 rounded-[32px] sm:rounded-[40px] bg-white/[0.01]">
                No posts yet. Be the first to start a conversation!
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PostCard({ post }: { post: Post }) {
  const [liked, setLiked] = useState(false);

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLiked(!liked);
  };

  return (
    <Link
      href={`/posts/${post.id}`}
      className="group p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] transition-all transform-gpu hover:-translate-y-1 shadow-xl block relative overflow-hidden"
    >
      <div className="flex items-center gap-4 mb-6">
        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center text-slate-600 shadow-xl overflow-hidden">
          {(post.user as any).profileIconUrl ? (
            <Image
              src={getProxiedImageUrl((post.user as any).profileIconUrl)}
              alt=""
              width={48}
              height={48}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="material-icons text-xl sm:text-2xl">account_circle</span>
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm sm:text-base font-black text-white uppercase italic tracking-tighter group-hover:text-cyan-400 transition-colors truncate">
              @{post.user.username}
            </span>
            {post.user.isVerified && <VerifiedBadge className="text-xs ml-1" />}
          </div>
          <div className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
            {formatRelativeTime(post.createdAt)}
          </div>
        </div>
      </div>

      <h3 className="text-xl sm:text-2xl font-black text-white mb-4 tracking-tight leading-tight uppercase italic line-clamp-2">
        {post.title}
      </h3>
      <div className="prose prose-invert prose-slate text-slate-400 text-sm line-clamp-3 mb-8 pointer-events-none prose-headings:font-black prose-headings:uppercase prose-headings:italic prose-headings:tracking-tighter prose-headings:text-white prose-strong:text-white prose-a:text-cyan-400">
        <ReactMarkdown>{post.content}</ReactMarkdown>
      </div>

      <div className="flex items-center gap-6 pt-6 border-t border-white/[0.04]">
        <button
          onClick={handleLike}
          className={`flex items-center gap-2 transition-colors ${liked ? 'text-rose-500' : 'text-slate-500 hover:text-rose-400'}`}
        >
          <span className="material-icons text-lg">{liked ? 'favorite' : 'favorite_border'}</span>
          <span className="text-xs font-bold">{post._count.likes + (liked ? 1 : 0)}</span>
        </button>
        <div className="flex items-center gap-2 text-slate-500 hover:text-cyan-400 transition-colors">
          <span className="material-icons text-lg">chat_bubble_outline</span>
          <span className="text-xs font-bold">{post._count.comments}</span>
        </div>
        <div className="ml-auto flex items-center gap-2 group/view">
          <span className="text-[9px] font-black text-cyan-500 uppercase tracking-widest opacity-60 group-hover/view:opacity-100 transition-opacity">
            View Post
          </span>
          <span className="material-icons text-xs text-cyan-500 group-hover/view:translate-x-1 transition-transform">
            east
          </span>
        </div>
      </div>
    </Link>
  );
}
