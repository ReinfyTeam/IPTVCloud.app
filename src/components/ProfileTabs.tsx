'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import VerifiedBadge from './VerifiedBadge';

type Post = {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  user: { id: string; username: string | null; isVerified: boolean };
};

type PostComment = {
  id: string;
  content: string;
  createdAt: Date;
  post: { id: string; title: string; userId: string };
  userId: string;
};

type WatchHistory = {
  id: string;
  channelName: string;
  channelLogo: string | null;
  watchedAt: Date;
};

type Props = {
  posts: Post[];
  comments: PostComment[];
  watchHistory: WatchHistory[];
  isOwnProfile: boolean;
  privacy: { showPosts: boolean; showComments: boolean; showWatchHistory: boolean };
};

export default function ProfileTabs({
  posts,
  comments,
  watchHistory,
  isOwnProfile,
  privacy,
}: Props) {
  const [activeTab, setActiveTab] = useState<'posts' | 'comments' | 'history'>('posts');

  const tabs = [
    {
      id: 'posts',
      label: 'Posts',
      count: posts.length,
      visible: privacy.showPosts || isOwnProfile,
    },
    {
      id: 'comments',
      label: 'Comments',
      count: comments.length,
      visible: privacy.showComments || isOwnProfile,
    },
    {
      id: 'history',
      label: 'Recently Watched',
      count: watchHistory.length,
      visible: privacy.showWatchHistory || isOwnProfile,
    },
  ].filter((t) => t.visible);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-white/5 pb-4 overflow-x-auto scrollbar-hide -mx-1 px-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`whitespace-nowrap px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 ${
              activeTab === tab.id
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                : 'text-slate-500 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.label} <span className="ml-1 sm:ml-2 opacity-50 italic">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px] animate-fade-up">
        {activeTab === 'posts' && (
          <div className="grid gap-4">
            {posts.length === 0 ? (
              <EmptyState message="No posts to display" />
            ) : (
              posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/posts/${post.id}`}
                  className="group block p-6 sm:p-8 rounded-[24px] sm:rounded-[32px] bg-white/[0.02] border border-white/5 hover:border-cyan-500/30 hover:bg-white/[0.04] transition-all shadow-xl"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                    <h3 className="text-lg sm:text-xl font-black text-white uppercase italic tracking-tighter group-hover:text-cyan-400 transition-colors leading-tight">
                      {post.title}
                    </h3>
                    <span className="text-[9px] sm:text-[10px] text-slate-600 font-bold uppercase tracking-widest shrink-0 mt-0.5 sm:mt-1">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm line-clamp-3 leading-relaxed font-medium">
                    {post.content}
                  </p>
                </Link>
              ))
            )}
          </div>
        )}

        {activeTab === 'comments' && (
          <div className="grid gap-4">
            {comments.length === 0 ? (
              <EmptyState message="No comments to display" />
            ) : (
              comments.map((comment) => (
                <div
                  key={comment.id}
                  className="p-6 sm:p-8 rounded-[24px] sm:rounded-[32px] bg-white/[0.02] border border-white/5 space-y-4 shadow-xl"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                      Commented on
                    </span>
                    <Link
                      href={`/posts/${comment.post.id}`}
                      className="text-[11px] sm:text-xs font-black text-white hover:text-cyan-400 transition-colors uppercase italic truncate max-w-[200px]"
                    >
                      {comment.post.title}
                    </Link>
                    {comment.userId === comment.post.userId && (
                      <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 text-[8px] font-black uppercase tracking-widest border border-cyan-500/20">
                        OP
                      </span>
                    )}
                    <span className="h-1 w-1 rounded-full bg-white/10 hidden sm:block" />
                    <span className="text-[9px] sm:text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed font-medium italic border-l-2 border-white/10 pl-4">
                    "{comment.content}"
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {watchHistory.length === 0 ? (
              <div className="col-span-full">
                <EmptyState message="No watch history found" />
              </div>
            ) : (
              watchHistory.map((item) => (
                <div
                  key={item.id}
                  className="p-4 sm:p-6 rounded-[24px] sm:rounded-[32px] bg-white/[0.02] border border-white/5 flex items-center gap-4 group hover:bg-white/[0.04] transition-all shadow-xl"
                >
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                    {item.channelLogo ? (
                      <Image
                        src={item.channelLogo}
                        alt={item.channelName}
                        width={48}
                        height={48}
                        className="h-full w-full object-contain p-2"
                      />
                    ) : (
                      <span className="material-icons text-slate-600 text-xl sm:text-2xl">tv</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-white text-xs sm:text-sm truncate uppercase tracking-tight">
                      {item.channelName}
                    </div>
                    <div className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                      {new Date(item.watchedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-[40px] border border-dashed border-white/10 p-20 text-center">
      <div className="material-icons text-4xl text-slate-700 mb-4">folder_open</div>
      <p className="text-slate-500 text-xs font-black uppercase tracking-[0.3em]">{message}</p>
    </div>
  );
}
