import React from 'react';
import { notFound } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import Image from 'next/image';
import jwt from 'jsonwebtoken';
import db from '@/lib/db';
import { User, Post, PostComment, WatchHistory } from '@/types/db';
import VerifiedBadge from '@/components/VerifiedBadge';
import FollowButton from '@/components/FollowButton';
import ProfileTabs from '@/components/ProfileTabs';
import { getProxiedImageUrl } from '@/lib/image-proxy';
import Link from 'next/link';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme-set-JWT_SECRET-env';

async function getCurrentUserId() {
  const cookieStore = await cookies();
  const token = cookieStore.get('iptv_token')?.value;
  if (!token) return null;

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
    return payload.sub;
  } catch {
    return null;
  }
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const currentUserId = await getCurrentUserId();

  // 1. Fetch user
  const userResult = await db.query(
    'SELECT id, username, name, "firstName", "lastName", "middleInitial", suffix, bio, about, "profileIconUrl", role, "isVerified", "privacySettings", "createdAt" FROM "User" WHERE username = $1 OR id = $1 LIMIT 1',
    [username],
  );

  const user = userResult.rows[0];

  if (!user) {
    notFound();
  }

  // 2. Fetch counts
  const countsResult = await db.query(
    `SELECT 
      (SELECT COUNT(*) FROM "Follower" WHERE "followingId" = $1) as followers,
      (SELECT COUNT(*) FROM "Follower" WHERE "followerId" = $1) as following`,
    [user.id],
  );

  user._count = {
    followers: parseInt(countsResult.rows[0].followers),
    following: parseInt(countsResult.rows[0].following),
  };

  // 3. Fetch posts
  const postsResult = await db.query(
    `SELECT p.id, p.title, p.content, p."createdAt", 
            json_build_object(\'id\', u.id, \'username\', u.username, \'isVerified\', u."isVerified") as user
     FROM "Post" p
     JOIN "User" u ON p."userId" = u.id
     WHERE p."userId" = $1
     ORDER BY p."createdAt" DESC
     LIMIT 10`,
    [user.id],
  );
  user.posts = postsResult.rows;

  // 4. Fetch comments
  const commentsResult = await db.query(
    `SELECT pc.id, pc.content, pc."createdAt", pc."postId",
            json_build_object(\'id\', p.id, \'title\', p.title, \'userId\', p."userId") as post
     FROM "PostComment" pc
     JOIN "Post" p ON pc."postId" = p.id
     WHERE pc."userId" = $1
     ORDER BY pc."createdAt" DESC
     LIMIT 10`,
    [user.id],
  );
  user.postComments = commentsResult.rows;

  // 5. Fetch watch history
  const historyResult = await db.query(
    'SELECT * FROM "WatchHistory" WHERE "userId" = $1 ORDER BY "watchedAt" DESC LIMIT 10',
    [user.id],
  );
  user.watchHistory = historyResult.rows;

  // 6. Check if following
  let isFollowing = false;
  if (currentUserId) {
    const followResult = await db.query(
      'SELECT 1 FROM "Follower" WHERE "followerId" = $1 AND "followingId" = $2 LIMIT 1',
      [currentUserId, user.id],
    );
    isFollowing = (followResult.rowCount ?? 0) > 0;
  }

  const isOwnProfile = currentUserId === user.id;

  // Parse privacy settings
  let privacy = {
    showPosts: true,
    showComments: true,
    showWatchHistory: true,
    showFollowList: true,
  };
  try {
    if (user.privacySettings) {
      privacy = { ...privacy, ...JSON.parse(user.privacySettings) };
    }
  } catch (e) {
    console.error('Failed to parse privacy settings:', e);
  }

  const fullName = [
    user.firstName,
    user.lastName,
    user.middleInitial ? `${user.middleInitial}.` : '',
    user.suffix,
  ]
    .filter(Boolean)
    .join(' ');

  const displayName = fullName || user.name || user.username || 'User';

  return (
    <div className="min-h-screen pt-32 pb-20 px-4 sm:px-6 bg-slate-950">
      <div className="mx-auto max-w-[1000px] space-y-12 animate-fade-in transform-gpu">
        {/* Header Profile Card */}
        <div className="rounded-[32px] sm:rounded-[48px] bg-white/[0.02] border border-white/[0.08] p-6 sm:p-12 backdrop-blur-xl relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 h-96 w-96 bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center sm:items-start sm:flex-row gap-8 sm:gap-12">
            <div className="relative group shrink-0">
              <div className="absolute -inset-1 bg-gradient-to-tr from-cyan-500 to-indigo-600 rounded-[32px] sm:rounded-[40px] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
              <div className="relative h-32 w-32 sm:h-40 sm:w-40 rounded-[32px] sm:rounded-[40px] bg-slate-900 border border-white/10 flex items-center justify-center text-slate-500 shadow-2xl overflow-hidden mx-auto sm:mx-0">
                {user.profileIconUrl ? (
                  <Image
                    src={getProxiedImageUrl(user.profileIconUrl)}
                    alt={user.username || ''}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <span className="material-icons text-6xl sm:text-7xl">account_circle</span>
                )}
              </div>
            </div>

            <div className="flex-1 text-center sm:text-left space-y-6">
              <div className="space-y-3 sm:space-y-4">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1">
                  <h1 className="text-3xl sm:text-5xl font-black text-white uppercase italic tracking-tighter leading-tight">
                    {displayName}
                  </h1>
                  {user.isVerified && <VerifiedBadge className="text-[20px] sm:text-[24px]" />}
                  <span className="text-lg sm:text-xl font-bold text-slate-500 lowercase italic tracking-tight">
                    @{user.username}
                  </span>
                </div>

                {(privacy.showFollowList || isOwnProfile) && (
                  <div className="flex flex-wrap justify-center sm:justify-start gap-4 sm:gap-6 mt-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-black text-white italic">
                        {user._count.followers}
                      </span>
                      <span className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Followers
                      </span>
                    </div>
                    <div className="flex items-center gap-2 border-l border-white/10 pl-4 sm:pl-6">
                      <span className="text-xl font-black text-white italic">
                        {user._count.following}
                      </span>
                      <span className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Following
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap justify-center sm:justify-start gap-3">
                <span className="px-4 py-1.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[9px] sm:text-[10px] font-black tracking-widest uppercase italic">
                  {user.role}
                </span>
                <span className="px-4 py-1.5 rounded-full bg-white/5 text-slate-400 border border-white/10 text-[9px] sm:text-[10px] font-black tracking-widest uppercase italic">
                  Member since {new Date(user.createdAt).getFullYear()}
                </span>
              </div>

              {user.bio && (
                <p className="text-slate-400 font-medium leading-relaxed max-w-2xl text-sm italic">
                  "{user.bio}"
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-4 justify-center sm:justify-start pt-2">
                <FollowButton targetUserId={user.id} initialIsFollowing={!!isFollowing} />
                {isOwnProfile && (
                  <Link
                    href="/account/settings"
                    className="px-8 py-3 rounded-full border border-white/10 bg-white/5 text-white font-black text-[10px] uppercase tracking-[0.2em] hover:bg-white/10 transition-all text-center"
                  >
                    Edit Profile
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* About Section */}
        {user.about && (
          <div className="rounded-[40px] bg-white/[0.01] border border-white/5 p-8 sm:p-10">
            <h2 className="text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-[0.3em] mb-6 flex items-center gap-4">
              Behind the Profile
              <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
            </h2>
            <div className="text-slate-300 font-medium leading-relaxed whitespace-pre-wrap text-sm">
              {user.about}
            </div>
          </div>
        )}

        {/* Content Tabs */}
        <ProfileTabs
          posts={privacy.showPosts || isOwnProfile ? user.posts : []}
          comments={privacy.showComments || isOwnProfile ? user.postComments : []}
          watchHistory={privacy.showWatchHistory || isOwnProfile ? (user.watchHistory as any) : []}
          isOwnProfile={isOwnProfile}
          privacy={privacy}
        />
      </div>
    </div>
  );
}
