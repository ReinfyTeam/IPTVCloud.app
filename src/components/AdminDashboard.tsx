'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type AdminUser = {
  id: string;
  email: string;
  name?: string | null;
  role: string;
  suspendedAt?: string | null;
  suspensionReason?: string | null;
  createdAt: string;
  updatedAt: string;
  favoritesCount: number;
};

type ProbeSummary = {
  total: number;
  ok: number;
  slow: number;
  dead: number;
  unknown: number;
  durationMs: number;
  checkedAt: number;
};

type LoginState = {
  email: string;
  password: string;
};

const TOKEN_KEY = 'iptvcloud:admin-token';
const USER_KEY = 'iptvcloud:admin-user';

async function parseJson<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Request failed');
  }
  return data as T;
}

export default function AdminDashboard() {
  const [token, setToken] = useState('');
  const [adminUser, setAdminUser] = useState<{ email: string; role: string } | null>(null);
  const [loginState, setLoginState] = useState<LoginState>({ email: '', password: '' });
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [probeSummary, setProbeSummary] = useState<ProbeSummary | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submittingLogin, setSubmittingLogin] = useState(false);
  const [runningProbe, setRunningProbe] = useState(false);
  const [refreshingChannels, setRefreshingChannels] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = window.localStorage.getItem(TOKEN_KEY) || '';
    const storedUser = window.localStorage.getItem(USER_KEY);
    setToken(storedToken);

    if (storedUser) {
      try {
        setAdminUser(JSON.parse(storedUser));
      } catch {
        window.localStorage.removeItem(USER_KEY);
      }
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    void loadUsers(token);
  }, [token]);

  const stats = useMemo(() => {
    const suspended = users.filter((user) => Boolean(user.suspendedAt)).length;
    const admins = users.filter((user) => user.role === 'ADMIN').length;
    return {
      total: users.length,
      suspended,
      active: Math.max(0, users.length - suspended),
      admins,
    };
  }, [users]);

  function getAuthHeaders(currentToken = token) {
    return {
      Authorization: `Bearer ${currentToken}`,
      'Content-Type': 'application/json',
    };
  }

  async function loadUsers(currentToken = token) {
    if (!currentToken) return;

    setLoadingUsers(true);
    setErrorMessage(null);

    try {
      const data = await parseJson<{ ok: true; users: AdminUser[] }>(
        await fetch('/api/admin/users', {
          headers: {
            Authorization: `Bearer ${currentToken}`,
          },
          cache: 'no-store',
        }),
      );
      setUsers(data.users);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setLoadingUsers(false);
    }
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittingLogin(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const data = await parseJson<{
        ok: true;
        token: string;
        user: { email: string; role: string };
      }>(
        await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(loginState),
        }),
      );

      if (data.user.role !== 'ADMIN') {
        throw new Error('This account is not an admin');
      }

      window.localStorage.setItem(TOKEN_KEY, data.token);
      window.localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setToken(data.token);
      setAdminUser(data.user);
      setStatusMessage(`Signed in as ${data.user.email}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSubmittingLogin(false);
    }
  }

  function handleLogout() {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
    setToken('');
    setAdminUser(null);
    setUsers([]);
    setProbeSummary(null);
    setStatusMessage('Signed out');
    setErrorMessage(null);
  }

  async function handleSuspend(user: AdminUser, suspended: boolean) {
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      await parseJson(
        await fetch('/api/admin/suspend', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            userId: user.id,
            suspended,
            reason: suspended ? 'Suspended from admin dashboard' : null,
          }),
        }),
      );
      setStatusMessage(`${suspended ? 'Suspended' : 'Reactivated'} ${user.email}`);
      await loadUsers();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function handleRefreshChannels() {
    setRefreshingChannels(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const data = await parseJson<{ ok: true; total: number }>(
        await fetch('/api/admin/refresh-channels', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      );
      setStatusMessage(`Channel cache refreshed. ${data.total} channels loaded.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setRefreshingChannels(false);
    }
  }

  async function handleProbeChannels() {
    setRunningProbe(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const data = await parseJson<ProbeSummary & { ok: true }>(
        await fetch('/api/admin/probe-channels?limit=50&concurrency=10', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      );
      setProbeSummary(data);
      setStatusMessage('Probe completed for 50 channels.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setRunningProbe(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">IPTVCloud</p>
            <h1 className="mt-2 text-4xl font-semibold text-white">Admin Console</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Manage accounts, suspend access, refresh the IPTV dataset, and inspect channel health from one dashboard.
            </p>
          </div>
          <Link
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:border-white/20 hover:bg-white/10"
            href="/"
          >
            Back to app
          </Link>
        </div>

        {!token ? (
          <section className="max-w-xl rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
            <h2 className="text-xl font-semibold text-white">Admin sign in</h2>
            <p className="mt-2 text-sm text-slate-400">
              Use an admin account. Admin access is assigned through `ADMIN_EMAILS`.
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleLogin}>
              <label className="block">
                <span className="mb-2 block text-sm text-slate-300">Email</span>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white"
                  onChange={(event) => setLoginState((state) => ({ ...state, email: event.target.value }))}
                  type="email"
                  value={loginState.email}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm text-slate-300">Password</span>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white"
                  onChange={(event) => setLoginState((state) => ({ ...state, password: event.target.value }))}
                  type="password"
                  value={loginState.password}
                />
              </label>
              <button
                className="rounded-full bg-cyan-400 px-5 py-3 text-sm font-medium text-slate-950"
                disabled={submittingLogin}
                type="submit"
              >
                {submittingLogin ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          </section>
        ) : (
          <div className="space-y-6">
            <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-white">Session</h2>
                    <p className="mt-2 text-sm text-slate-400">
                      Signed in as <span className="text-slate-200">{adminUser?.email}</span> with role{' '}
                      <span className="text-cyan-300">{adminUser?.role}</span>.
                    </p>
                  </div>
                  <button
                    className="rounded-full border border-white/10 bg-slate-950/70 px-4 py-2 text-sm text-slate-200"
                    onClick={handleLogout}
                    type="button"
                  >
                    Logout
                  </button>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                    <div className="text-slate-400">Users</div>
                    <div className="mt-1 text-2xl font-semibold text-white">{stats.total}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                    <div className="text-slate-400">Active</div>
                    <div className="mt-1 text-2xl font-semibold text-white">{stats.active}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                    <div className="text-slate-400">Suspended</div>
                    <div className="mt-1 text-2xl font-semibold text-amber-300">{stats.suspended}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                    <div className="text-slate-400">Admins</div>
                    <div className="mt-1 text-2xl font-semibold text-cyan-300">{stats.admins}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-white">Operations</h2>
                    <p className="mt-2 text-sm text-slate-400">
                      Trigger cache refreshes and probe live stream health directly from the admin console.
                    </p>
                  </div>
                  <button
                    className="rounded-full border border-white/10 bg-slate-950/70 px-4 py-2 text-sm text-slate-200"
                    onClick={() => void loadUsers()}
                    type="button"
                  >
                    Reload users
                  </button>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    className="rounded-full bg-cyan-400 px-5 py-3 text-sm font-medium text-slate-950"
                    disabled={refreshingChannels}
                    onClick={handleRefreshChannels}
                    type="button"
                  >
                    {refreshingChannels ? 'Refreshing...' : 'Refresh channel cache'}
                  </button>
                  <button
                    className="rounded-full border border-white/10 bg-slate-950/70 px-5 py-3 text-sm text-slate-200"
                    disabled={runningProbe}
                    onClick={handleProbeChannels}
                    type="button"
                  >
                    {runningProbe ? 'Probing...' : 'Probe channel health'}
                  </button>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3 text-sm lg:grid-cols-5">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                    <div className="text-slate-400">Checked</div>
                    <div className="mt-1 text-xl font-semibold text-white">{probeSummary?.total ?? '--'}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                    <div className="text-slate-400">Healthy</div>
                    <div className="mt-1 text-xl font-semibold text-emerald-300">{probeSummary?.ok ?? '--'}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                    <div className="text-slate-400">Slow</div>
                    <div className="mt-1 text-xl font-semibold text-amber-300">{probeSummary?.slow ?? '--'}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                    <div className="text-slate-400">Dead</div>
                    <div className="mt-1 text-xl font-semibold text-rose-300">{probeSummary?.dead ?? '--'}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                    <div className="text-slate-400">Duration</div>
                    <div className="mt-1 text-xl font-semibold text-white">
                      {typeof probeSummary?.durationMs === 'number' ? `${Math.round(probeSummary.durationMs / 1000)}s` : '--'}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {(statusMessage || errorMessage) && (
              <section
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  errorMessage
                    ? 'border-rose-500/30 bg-rose-500/10 text-rose-200'
                    : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                }`}
              >
                {errorMessage || statusMessage}
              </section>
            )}

            <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-white">User accounts</h2>
                  <p className="mt-2 text-sm text-slate-400">
                    Suspend or reactivate non-admin accounts. Admin accounts are listed but protected from suspension here.
                  </p>
                </div>
                <div className="text-sm text-slate-400">{loadingUsers ? 'Loading...' : `${users.length} users`}</div>
              </div>

              <div className="overflow-hidden rounded-3xl border border-white/10">
                <div className="grid grid-cols-[1.1fr_0.9fr_0.6fr_0.6fr_0.8fr] gap-3 bg-slate-950/90 px-4 py-3 text-xs uppercase tracking-[0.2em] text-slate-500">
                  <div>User</div>
                  <div>Status</div>
                  <div>Role</div>
                  <div>Favorites</div>
                  <div>Action</div>
                </div>
                <div className="divide-y divide-white/10">
                  {users.map((user) => {
                    const suspended = Boolean(user.suspendedAt);
                    const isAdmin = user.role === 'ADMIN';

                    return (
                      <div
                        className="grid grid-cols-[1.1fr_0.9fr_0.6fr_0.6fr_0.8fr] gap-3 bg-slate-950/50 px-4 py-4 text-sm"
                        key={user.id}
                      >
                        <div className="min-w-0">
                          <div className="truncate font-medium text-white">{user.name || user.email}</div>
                          <div className="truncate text-xs text-slate-400">{user.email}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            Joined {new Date(user.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className={suspended ? 'text-amber-300' : 'text-emerald-300'}>
                            {suspended ? 'Suspended' : 'Active'}
                          </div>
                          <div className="truncate text-xs text-slate-400">
                            {user.suspensionReason || 'No suspension reason'}
                          </div>
                        </div>
                        <div className="text-slate-200">{user.role}</div>
                        <div className="text-slate-200">{user.favoritesCount}</div>
                        <div>
                          {isAdmin ? (
                            <span className="text-xs text-slate-500">Protected</span>
                          ) : (
                            <button
                              className={`rounded-full px-4 py-2 text-xs font-medium ${
                                suspended
                                  ? 'bg-emerald-400 text-slate-950'
                                  : 'bg-amber-400 text-slate-950'
                              }`}
                              onClick={() => void handleSuspend(user, !suspended)}
                              type="button"
                            >
                              {suspended ? 'Unsuspend' : 'Suspend'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
