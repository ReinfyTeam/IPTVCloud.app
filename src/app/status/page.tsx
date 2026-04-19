'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

type Incident = {
  id: string;
  title: string;
  description: string;
  status: string;
  severity: string;
  tags: string[];
  createdAt: string;
  resolvedAt: string | null;
};

type UptimeRecord = {
  createdAt: string;
  status: string;
  latency: number | null;
};

type StatData = {
  time: string;
  viewers: number;
  activeStreams: number;
  downStreams: number;
  watchingUsers: number;
  latency: number;
};

export default function StatusPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [uptime, setUptime] = useState<UptimeRecord[]>([]);
  const [stats, setStats] = useState<StatData[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<'hour' | 'month' | 'year'>('hour');

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/incidents').then((r) => r.json()),
      fetch('/api/status/uptime').then((r) => r.json()),
    ]).then(([inc, upt]) => {
      if (Array.isArray(inc)) setIncidents(inc);
      if (Array.isArray(upt)) setUptime(upt);
      setLoading(false);
    });
  }, []);

  const fetchStats = () => {
    fetch(`/api/status/stats?range=${range}`)
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => {});
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000); // Realtime update every 5 seconds
    return () => clearInterval(interval);
  }, [range]);

  const activeIncidents = useMemo(
    () => incidents.filter((i) => i.status !== 'RESOLVED'),
    [incidents],
  );
  const resolvedIncidents = useMemo(
    () => incidents.filter((i) => i.status === 'RESOLVED').slice(0, 5),
    [incidents],
  );

  const uptimePercentage = useMemo(() => {
    if (uptime.length === 0) return 100;
    const up = uptime.filter((r) => r.status === 'UP').length;
    return Math.round((up / uptime.length) * 1000) / 10;
  }, [uptime]);

  const formatXAxis = (tickItem: string) => {
    const d = new Date(tickItem);
    if (range === 'hour') return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (range === 'month') return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    if (range === 'year') return d.toLocaleDateString([], { month: 'short', year: '2-digit' });
    return tickItem;
  };

  return (
    <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 bg-slate-950">
      <div className="mx-auto max-w-[1460px] space-y-12 animate-fade-in transform-gpu">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 p-12 rounded-[48px] bg-white/[0.02] border border-white/5 relative overflow-hidden shadow-2xl backdrop-blur-xl">
          <div className="absolute top-0 right-0 h-64 w-64 bg-cyan-500/5 blur-[100px] rounded-full" />
          <div className="space-y-4 relative z-10 text-center md:text-left">
            <div
              className={`inline-flex items-center gap-2 px-4 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${activeIncidents.length === 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full animate-pulse ${activeIncidents.length === 0 ? 'bg-emerald-400' : 'bg-amber-400'}`}
              />
              {activeIncidents.length === 0
                ? 'All Systems Operational'
                : 'Partial Service Disruption'}
            </div>
            <h1 className="text-5xl font-black text-white tracking-tighter uppercase italic leading-none">
              System Health<span className="text-cyan-500">.</span>
            </h1>
            <p className="text-slate-400 text-sm font-medium max-w-lg leading-relaxed">
              Real-time monitoring of our core infrastructure, streaming nodes, and community APIs.
            </p>
          </div>
          <div className="relative z-10 text-center">
            <div className="text-5xl font-black text-cyan-400 tracking-tighter">
              {uptimePercentage}%
            </div>
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">
              30-Day Uptime
            </div>
          </div>
        </div>

        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
            <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">
              Performance Metrics
            </h2>
            <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1">
              {(['hour', 'month', 'year'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    range === r
                      ? 'bg-cyan-500 text-slate-950 shadow-lg'
                      : 'text-slate-500 hover:text-white'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Latency Graph */}
            <div className="p-8 rounded-[40px] bg-white/[0.02] border border-white/[0.08] shadow-xl backdrop-blur-md">
              <div className="flex items-center gap-2 mb-6">
                <span className="h-2 w-2 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Network Latency (ms)
                </span>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats}>
                    <defs>
                      <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis
                      dataKey="time"
                      tickFormatter={formatXAxis}
                      stroke="#ffffff20"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                    />
                    <YAxis stroke="#ffffff20" tick={{ fontSize: 10, fill: '#64748b' }} width={40} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: '1px solid #ffffff10',
                        borderRadius: '16px',
                      }}
                      itemStyle={{ color: '#22d3ee', fontWeight: 'bold' }}
                      labelFormatter={(label) => formatXAxis(label as string)}
                    />
                    <Area
                      type="monotone"
                      dataKey="latency"
                      stroke="#06b6d4"
                      fillOpacity={1}
                      fill="url(#colorLatency)"
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Viewers & Watching Users Graph */}
            <div className="p-8 rounded-[40px] bg-white/[0.02] border border-white/[0.08] shadow-xl backdrop-blur-md">
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Total Viewers
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.5)]" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Watching Users
                  </span>
                </div>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats}>
                    <defs>
                      <linearGradient id="colorViewers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorWatching" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis
                      dataKey="time"
                      tickFormatter={formatXAxis}
                      stroke="#ffffff20"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                    />
                    <YAxis stroke="#ffffff20" tick={{ fontSize: 10, fill: '#64748b' }} width={40} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: '1px solid #ffffff10',
                        borderRadius: '16px',
                      }}
                      labelFormatter={(label) => formatXAxis(label as string)}
                    />
                    <Area
                      type="monotone"
                      dataKey="viewers"
                      stroke="#6366f1"
                      fillOpacity={1}
                      fill="url(#colorViewers)"
                      isAnimationActive={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="watchingUsers"
                      stroke="#ec4899"
                      fillOpacity={1}
                      fill="url(#colorWatching)"
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Streams Graph */}
            <div className="p-8 rounded-[40px] bg-white/[0.02] border border-white/[0.08] shadow-xl backdrop-blur-md lg:col-span-2">
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Active IPTV Streams
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Down Streams
                  </span>
                </div>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis
                      dataKey="time"
                      tickFormatter={formatXAxis}
                      stroke="#ffffff20"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                    />
                    <YAxis stroke="#ffffff20" tick={{ fontSize: 10, fill: '#64748b' }} width={40} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: '1px solid #ffffff10',
                        borderRadius: '16px',
                      }}
                      labelFormatter={(label) => formatXAxis(label as string)}
                      cursor={{ fill: '#ffffff05' }}
                    />
                    <Bar
                      dataKey="activeStreams"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                      isAnimationActive={false}
                    />
                    <Bar
                      dataKey="downStreams"
                      fill="#ef4444"
                      radius={[4, 4, 0, 0]}
                      isAnimationActive={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>

        {activeIncidents.length > 0 && (
          <section className="space-y-6">
            <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter px-2">
              Active Incidents
            </h2>
            <div className="grid gap-4">
              {activeIncidents.map((inc) => (
                <IncidentCard key={inc.id} incident={inc} />
              ))}
            </div>
          </section>
        )}

        <section className="space-y-6">
          <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter px-2">
            Past Reports
          </h2>
          <div className="grid gap-4">
            {resolvedIncidents.map((inc) => (
              <IncidentCard key={inc.id} incident={inc} />
            ))}
            {resolvedIncidents.length === 0 && !loading && (
              <div className="p-12 rounded-[32px] border border-dashed border-white/5 text-center text-slate-600 font-bold uppercase tracking-widest text-[10px]">
                No recent incidents reported.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function IncidentCard({ incident }: { incident: Incident }) {
  const severityColors: any = {
    LOW: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    MEDIUM: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    HIGH: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
    CRITICAL: 'text-red-400 bg-red-400/10 border-red-400/20 animate-pulse',
  };

  return (
    <Link
      href={`/status/${incident.id}`}
      className="group p-8 rounded-[40px] border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] transition-all transform-gpu hover:-translate-y-1 shadow-xl block"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${severityColors[incident.severity] || severityColors.LOW}`}
          >
            {incident.severity}
          </span>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            {new Date(incident.createdAt).toLocaleDateString()}
          </span>
        </div>
        <span
          className={`text-[10px] font-black uppercase tracking-widest ${incident.status === 'RESOLVED' ? 'text-emerald-400' : 'text-cyan-400'}`}
        >
          {incident.status}
        </span>
      </div>
      <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors uppercase italic tracking-tight">
        {incident.title}
      </h3>
      <p className="text-sm text-slate-500 leading-relaxed font-medium line-clamp-2">
        {incident.description}
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {incident.tags.map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[8px] font-black text-slate-500 uppercase tracking-widest"
          >
            {tag}
          </span>
        ))}
      </div>
    </Link>
  );
}
