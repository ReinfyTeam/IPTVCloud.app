'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { useAuthStore } from '@/store/auth-store';

type Post = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  _count: { comments: number; likes: number };
};

type PublicUser = {
  id: string;
  username: string;
  name: string | null;
  role: string;
  isVerified: boolean;
  createdAt: string;
  _count: { posts: number; comments: number; favorites: number };
  posts: Post[];
};

export default function PublicProfilePage({ params }: { params: { username: string } }) {
  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useAuthStore();

  useEffect(() => {
    fetch(`/api/user/profile/${params.username}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) setProfile(data);
      })
      .finally(() => setLoading(false));
  }, [params.username]);

  if (loading) return null;
  if (!profile)
    return <div className="min-h-screen pt-32 text-center text-white">User not found.</div>;

  const isOwnProfile = currentUser?.username === profile.username;

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 bg-slate-950">
      <div className="mx-auto max-w-4xl space-y-12 animate-fade-in transform-gpu">
        <div className="rounded-[48px] bg-white/[0.02] border border-white/[0.08] p-12 backdrop-blur-xl relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 h-96 w-96 bg-cyan-500/5 blur-[120px] rounded-full" />

          <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-tr from-cyan-500 to-indigo-600 rounded-[40px] blur opacity-25"></div>
              <div className="relative h-32 w-32 rounded-[40px] bg-slate-900 border border-white/10 flex items-center justify-center text-slate-500 shadow-2xl">
                <span className="material-icons text-6xl">account_circle</span>
              </div>
              {profile.isVerified && (
                <div className="absolute -bottom-2 -right-2 h-10 w-10 rounded-2xl bg-cyan-500 border-4 border-slate-950 flex items-center justify-center text-slate-950 shadow-xl">
                  <span className="material-icons text-xl">verified</span>
                </div>
              )}
            </div>

            <div className="flex-1 text-center md:text-left">
              <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter leading-none mb-3">
                @{profile.username}
              </h1>
              <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-4">
                <span className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-black tracking-widest uppercase">
                  {profile.role}
                </span>
                {profile.isVerified && (
                  <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-black tracking-widest uppercase">
                    Verified Member
                  </span>
                )}
              </div>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                Joined {new Date(profile.createdAt).toLocaleDateString()}
              </p>
            </div>

            {isOwnProfile && (
              <Link
                href="/account/settings"
                className="px-8 py-4 rounded-2xl bg-white text-slate-950 font-black text-[10px] uppercase tracking-widest hover:bg-cyan-400 transition-all active:scale-95"
              >
                Edit Profile
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <StatMini label="Contributions" value={profile._count.posts + profile._count.comments} />
          <StatMini label="Favorites" value={profile._count.favorites} />
          <StatMini label="Community Rank" value={profile.role === 'ADMIN' ? 'Elite' : 'Member'} />
        </div>

        <section className="space-y-8">
          <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter px-2">
            Recent Activity<span className="text-cyan-500">.</span>
          </h2>

          <div className="grid gap-6">
            {profile.posts.map((post) => (
              <Link
                key={post.id}
                href={`/posts/${post.id}`}
                className="p-8 rounded-[40px] border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] transition-all transform-gpu hover:-translate-y-1 shadow-xl block"
              >
                <h3 className="text-xl font-bold text-white mb-3 tracking-tight">{post.title}</h3>
                <div className="text-sm text-slate-400 line-clamp-2 font-medium mb-6">
                  {post.content}
                </div>
                <div className="flex items-center gap-6 pt-4 border-t border-white/[0.04]">
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="material-icons text-base">favorite_border</span>
                    <span className="text-xs font-bold">{post._count.likes}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="material-icons text-base">chat_bubble_outline</span>
                    <span className="text-xs font-bold">{post._count.comments}</span>
                  </div>
                  <div className="ml-auto text-[9px] font-bold text-slate-600 uppercase tracking-widest">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </Link>
            ))}
            {profile.posts.length === 0 && (
              <div className="p-20 text-center text-slate-600 font-bold uppercase tracking-widest text-xs border border-dashed border-white/5 rounded-[40px]">
                No public activity recorded.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatMini({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/[0.06] text-center shadow-xl">
      <div className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">
        {label}
      </div>
      <div className="text-2xl font-black text-white italic uppercase tracking-tighter leading-none">
        {value}
      </div>
    </div>
  );
}
