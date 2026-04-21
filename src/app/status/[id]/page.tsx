'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';

type Update = {
  id: string;
  message: string;
  status: string;
  createdAt: string;
};

type Incident = {
  id: string;
  title: string;
  description: string;
  status: string;
  severity: string;
  tags: string[];
  createdAt: string;
  resolvedAt: string | null;
  updates: Update[];
};

export default function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/status/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) setIncident(data);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return null;
  if (!incident)
    return (
      <div className="min-h-screen pt-32 text-center text-white">Incident report not found.</div>
    );

  const severityColors: any = {
    LOW: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    MEDIUM: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    HIGH: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
    CRITICAL: 'text-red-400 bg-red-400/10 border-red-400/20 animate-pulse',
  };

  return (
    <div className="min-h-screen pt-32 pb-20 px-4 sm:px-6 bg-slate-950">
      <div className="mx-auto max-w-3xl space-y-8 sm:space-y-12 animate-fade-in transform-gpu">
        <div className="flex items-center gap-4 sm:gap-6">
          <Link
            href="/status"
            className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all active:scale-90"
          >
            <span className="material-icons text-lg sm:text-xl">west</span>
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1 sm:mb-2">
              <span
                className={`px-3 py-1 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest border ${severityColors[incident.severity]}`}
              >
                {incident.severity}
              </span>
              <span
                className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest ${incident.status === 'RESOLVED' ? 'text-emerald-400' : 'text-cyan-400'}`}
              >
                {incident.status}
              </span>
            </div>
            <h1 className="text-xl sm:text-3xl font-black text-white uppercase italic tracking-tighter leading-none truncate">
              {incident.title}
            </h1>
          </div>
        </div>

        <div className="p-6 sm:p-10 rounded-[32px] sm:rounded-[48px] bg-white/[0.02] border border-white/[0.08] shadow-2xl backdrop-blur-xl space-y-6 sm:space-y-8">
          <div className="space-y-4">
            <h2 className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
              Initial Report
            </h2>
            <p className="text-base sm:text-lg text-slate-300 font-medium leading-relaxed italic">
              &quot;{incident.description}&quot;
            </p>
          </div>

          <div className="pt-6 sm:pt-8 border-t border-white/[0.06] flex flex-wrap gap-2">
            {incident.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 rounded-lg bg-white/5 border border-white/5 text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <section className="space-y-6 sm:space-y-8 relative">
          <h2 className="text-xl sm:text-2xl font-black text-white uppercase italic tracking-tighter px-2">
            Timeline<span className="text-cyan-500">.</span>
          </h2>

          <div className="space-y-8 sm:space-y-12 pl-8 sm:pl-10 relative">
            <div className="absolute left-[15px] sm:left-[19px] top-4 bottom-4 w-px bg-white/[0.06]" />

            {incident.updates.map((update, idx) => (
              <div key={update.id} className="relative animate-fade-up">
                <div
                  className={`absolute -left-[27px] sm:-left-[31px] top-1 h-5 w-5 sm:h-6 sm:w-6 rounded-full border-4 border-slate-950 flex items-center justify-center z-10 ${idx === 0 ? 'bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)]' : 'bg-slate-800'}`}
                />

                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                    <span className="text-[9px] sm:text-[10px] font-black text-white uppercase tracking-widest">
                      {update.status}
                    </span>
                    <span className="text-[8px] sm:text-[9px] font-bold text-slate-600 uppercase tracking-tighter">
                      {new Date(update.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[13px] sm:text-sm text-slate-400 font-medium leading-relaxed">
                    {update.message}
                  </p>
                </div>
              </div>
            ))}

            <div className="relative">
              <div className="absolute -left-[27px] sm:-left-[31px] top-1 h-5 w-5 sm:h-6 sm:w-6 rounded-full border-4 border-slate-950 bg-slate-900 z-10" />
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                  <span className="text-[9px] sm:text-[10px] font-black text-slate-600 uppercase tracking-widest">
                    REPORTED
                  </span>
                  <span className="text-[8px] sm:text-[9px] font-bold text-slate-600 uppercase tracking-tighter">
                    {new Date(incident.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-[13px] sm:text-sm text-slate-600 font-medium italic">
                  Incident identified and logged by monitoring nodes.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
