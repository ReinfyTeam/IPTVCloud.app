'use client';

import React, { use, useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getProxiedImageUrl } from '@/lib/image-proxy';

type Member = {
  id: string;
  userId: string;
  isAdmin: boolean;
  isMuted: boolean;
  joinedAt: string;
  user: {
    username: string;
    profileIconUrl: string | null;
    isVerified: boolean;
  };
};

type Group = {
  id: string;
  name: string | null;
  icon: string | null;
  themeColor: string;
  creatorId: string | null;
  createdAt: string;
};

export default function GroupInfoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, token } = useAuthStore();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMyGroupAdmin, setIsMyGroupAdmin] = useState(false);
  const [editName, setEditName] = useState('');
  const [editTheme, setEditTheme] = useState('');
  const [saving, setSending] = useState(false);

  const fetchGroup = useCallback(async () => {
    try {
      const res = await fetch(`/api/user/groupchats/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setGroup(data.group);
        setMembers(data.members);
        setEditName(data.group.name || '');
        setEditTheme(data.group.themeColor || '#06b6d4');

        const me = data.members.find((m: Member) => m.userId === user?.id);
        setIsMyGroupAdmin(me?.isAdmin || false);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [id, token, user?.id]);

  useEffect(() => {
    if (token) fetchGroup();
  }, [fetchGroup, token]);

  const handleUpdateGroup = async () => {
    setSending(true);
    try {
      await fetch(`/api/user/groupchats/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: editName, themeColor: editTheme }),
      });
      fetchGroup();
    } catch {
    } finally {
      setSending(false);
    }
  };

  const handleMemberAction = async (memberId: string, action: string) => {
    try {
      await fetch(`/api/user/groupchats/${id}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action }),
      });
      fetchGroup();
    } catch {}
  };

  const handleLeave = async () => {
    if (!confirm('Are you sure you want to leave this group?')) return;
    try {
      await fetch(`/api/user/groupchats/${id}/members/me`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      router.push('/account/messages');
    } catch {}
  };

  if (loading) return null;
  if (!group) return <div className="p-20 text-center text-white">Group not found.</div>;

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 bg-slate-950">
      <div className="mx-auto max-w-3xl space-y-10 animate-fade-in">
        <div className="flex items-center gap-6">
          <Link
            href={`/account/messages/group/${id}`}
            className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all active:scale-90"
          >
            <span className="material-icons text-xl">west</span>
          </Link>
          <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">
            Group Settings<span className="text-cyan-500">.</span>
          </h1>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-1 space-y-8">
            <div className="flex flex-col items-center text-center space-y-4 p-8 rounded-[40px] bg-white/[0.02] border border-white/[0.08]">
              <div
                className="h-24 w-24 rounded-[32px] bg-slate-900 border border-white/10 flex items-center justify-center text-slate-700 shadow-2xl relative overflow-hidden"
                style={{ borderColor: group.themeColor + '40' }}
              >
                {group.icon ? (
                  <Image
                    src={getProxiedImageUrl(group.icon)}
                    alt=""
                    fill
                    className="object-cover"
                  />
                ) : (
                  <span className="material-icons text-5xl" style={{ color: group.themeColor }}>
                    groups
                  </span>
                )}
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-black text-white uppercase italic tracking-tight">
                  {group.name || 'Untitled Group'}
                </h2>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  {members.length} Members
                </p>
              </div>
            </div>

            <div className="p-6 rounded-[32px] bg-white/[0.02] border border-white/[0.08] space-y-4">
              <button
                onClick={handleLeave}
                className="w-full py-3 rounded-2xl bg-red-500/10 text-red-400 font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-slate-950 transition-all active:scale-95 border border-red-500/20"
              >
                Leave Group
              </button>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-8">
            {isMyGroupAdmin && (
              <section className="p-8 rounded-[40px] bg-white/[0.02] border border-white/[0.08] space-y-8">
                <div className="flex items-center gap-3">
                  <span className="material-icons text-cyan-500 text-lg">edit</span>
                  <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">
                    Customize Group
                  </h3>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">
                      Group Name
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950 p-4 text-sm text-white outline-none focus:border-cyan-500 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">
                      Theme Color
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="color"
                        value={editTheme}
                        onChange={(e) => setEditTheme(e.target.value)}
                        className="h-10 w-20 rounded-xl bg-slate-900 border border-white/10 cursor-pointer"
                      />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {editTheme}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleUpdateGroup}
                    disabled={saving}
                    className="px-8 py-3 rounded-xl bg-white text-slate-950 font-black text-[10px] uppercase tracking-widest hover:bg-cyan-400 transition-all active:scale-95"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </section>
            )}

            <section className="p-8 rounded-[40px] bg-white/[0.02] border border-white/[0.08] space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-icons text-cyan-500 text-lg">people</span>
                  <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">
                    Group Members
                  </h3>
                </div>
              </div>

              <div className="grid gap-3">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-xl bg-slate-900 border border-white/10 overflow-hidden relative shrink-0">
                        {m.user.profileIconUrl ? (
                          <Image
                            src={getProxiedImageUrl(m.user.profileIconUrl)}
                            alt=""
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-slate-700">
                            <span className="material-icons text-xl">person</span>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-black text-white uppercase truncate">
                            @{m.user.username}
                          </span>
                          {m.isAdmin && (
                            <span className="material-icons text-[10px] text-cyan-500">
                              security
                            </span>
                          )}
                          {m.isMuted && (
                            <span className="material-icons text-[10px] text-red-500">
                              volume_off
                            </span>
                          )}
                        </div>
                        <div className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">
                          Joined {new Date(m.joinedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    {isMyGroupAdmin && m.userId !== user?.id && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleMemberAction(m.id, m.isMuted ? 'UNMUTE' : 'MUTE')}
                          className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all ${m.isMuted ? 'bg-amber-500 text-white' : 'bg-white/5 text-slate-500 hover:text-amber-400'}`}
                          title={m.isMuted ? 'Unmute' : 'Mute'}
                        >
                          <span className="material-icons text-sm">
                            {m.isMuted ? 'volume_up' : 'volume_off'}
                          </span>
                        </button>
                        <button
                          onClick={() => handleMemberAction(m.id, m.isAdmin ? 'DEMOTE' : 'PROMOTE')}
                          className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all ${m.isAdmin ? 'bg-cyan-500 text-slate-900' : 'bg-white/5 text-slate-500 hover:text-cyan-400'}`}
                          title={m.isAdmin ? 'Remove Admin' : 'Make Admin'}
                        >
                          <span className="material-icons text-sm">
                            {m.isAdmin ? 'verified_user' : 'shield'}
                          </span>
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Kick this member?')) handleMemberAction(m.id, 'KICK');
                          }}
                          className="h-8 w-8 rounded-lg bg-white/5 text-slate-500 hover:bg-red-500 hover:text-white transition-all"
                          title="Kick"
                        >
                          <span className="material-icons text-sm">person_remove</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
