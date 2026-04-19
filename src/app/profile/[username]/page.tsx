import React from 'react';
import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import VerifiedBadge from '@/components/VerifiedBadge';

export default async function ProfilePage({ params }: { params: { username: string } }) {
  const { username } = params;

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ username: username }, { id: username }],
    },
    select: {
      id: true,
      username: true,
      name: true,
      role: true,
      isVerified: true,
      createdAt: true,
      posts: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, title: true, createdAt: true },
      },
    },
  });

  if (!user) {
    notFound();
  }

  return (
    <div className="min-h-screen pt-32 pb-20 px-4 sm:px-6 bg-slate-950">
      <div className="mx-auto max-w-[1000px] space-y-12 animate-fade-in transform-gpu">
        {/* Header Profile Card */}
        <div className="rounded-[48px] bg-white/[0.02] border border-white/[0.08] p-10 backdrop-blur-xl relative overflow-hidden shadow-2xl text-center">
          <div className="absolute top-0 right-0 h-96 w-96 bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center gap-6">
            <div className="relative group inline-block">
              <div className="absolute -inset-1 bg-gradient-to-tr from-cyan-500 to-indigo-600 rounded-[40px] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
              <div className="relative h-32 w-32 rounded-[40px] bg-slate-900 border border-white/10 flex items-center justify-center text-slate-500 shadow-2xl overflow-hidden mx-auto">
                <span className="material-icons text-6xl">account_circle</span>
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter leading-none flex items-center justify-center gap-2">
                {user.username || user.name || 'User'}
                {user.isVerified && <VerifiedBadge className="text-[20px]" />}
              </h1>
              <div className="flex justify-center gap-2 mt-2">
                <span className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-black tracking-widest uppercase">
                  {user.role}
                </span>
                <span className="px-3 py-1 rounded-full bg-white/5 text-slate-400 border border-white/10 text-[10px] font-black tracking-widest uppercase">
                  Joined {new Date(user.createdAt).getFullYear()}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-black text-white uppercase tracking-widest px-4">
            Recent Posts
          </h2>
          {user.posts.length === 0 ? (
            <div className="rounded-[32px] border border-white/5 bg-white/[0.02] p-10 text-center text-slate-500 text-xs font-bold uppercase tracking-widest">
              No posts yet
            </div>
          ) : (
            <div className="grid gap-4">
              {user.posts.map((post) => (
                <a
                  key={post.id}
                  href={`/posts/${post.id}`}
                  className="block p-6 rounded-[24px] bg-white/[0.02] border border-white/5 hover:border-cyan-500/30 hover:bg-white/[0.04] transition-all"
                >
                  <h3 className="font-bold text-white mb-2">{post.title}</h3>
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
