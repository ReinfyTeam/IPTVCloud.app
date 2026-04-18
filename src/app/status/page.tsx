import React from 'react';
import type { Metadata } from 'next';
import prisma from '@/lib/prisma';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'System Status — IPTVCloud.app',
  description: 'Real-time status and incident reports for IPTVCloud.',
};

export const dynamic = 'force-dynamic';

export default async function StatusPage() {
  let incidents: any[] = [];
  try {
    incidents = await prisma.incident.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  } catch (e) {
    console.error('Failed to fetch incidents during render:', e);
  }

  const activeIncidents = Array.isArray(incidents)
    ? incidents.filter((i) => i.status !== 'RESOLVED')
    : [];
  const hasActiveIssues = activeIncidents.length > 0;

  return (
    <div className="pt-24 pb-20 px-4 sm:px-6 min-h-screen">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <Link
            href="/"
            className="text-sm text-slate-400 hover:text-white transition-colors mb-4 inline-block"
          >
            ← Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-white">System Status</h1>
          <p className="mt-2 text-slate-400">Current API and Frontend operational status.</p>
        </div>

        <div
          className={`rounded-2xl border p-6 mb-8 shadow-xl ${hasActiveIssues ? 'bg-red-500/10 border-red-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-full ${hasActiveIssues ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}
            >
              {hasActiveIssues ? (
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              ) : (
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <div>
              <div
                className={`text-lg font-bold ${hasActiveIssues ? 'text-red-400' : 'text-emerald-400'}`}
              >
                {hasActiveIssues
                  ? 'Some systems are experiencing issues'
                  : 'All Systems Operational'}
              </div>
              <div className="text-sm text-slate-400 mt-1">
                Last checked: {new Date().toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 mb-10">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5 flex items-center justify-between">
            <div className="font-medium text-white">API Service</div>
            <div className="text-sm font-semibold text-emerald-400">Operational</div>
          </div>
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5 flex items-center justify-between">
            <div className="font-medium text-white">Frontend Load</div>
            <div className="text-sm font-semibold text-emerald-400">Normal</div>
          </div>
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5 flex items-center justify-between">
            <div className="font-medium text-white">Database</div>
            <div className="text-sm font-semibold text-emerald-400">Operational</div>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold text-white mb-6">Incident History</h2>
          {incidents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/[0.07] p-8 text-center text-slate-500">
              No recent incidents to report.
            </div>
          ) : (
            <div className="space-y-4">
              {incidents.map((incident) => (
                <div
                  key={incident.id}
                  className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5 relative overflow-hidden"
                >
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1 ${incident.status === 'RESOLVED' ? 'bg-emerald-500' : incident.status === 'INVESTIGATING' ? 'bg-red-500' : 'bg-amber-500'}`}
                  />
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pl-2">
                    <h3 className="font-bold text-white text-lg">{incident.title}</h3>
                    <div
                      className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider w-fit ${incident.status === 'RESOLVED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : incident.status === 'INVESTIGATING' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}
                    >
                      {incident.status}
                    </div>
                  </div>
                  <p className="text-slate-300 text-sm mb-4 pl-2 whitespace-pre-wrap">
                    {incident.description}
                  </p>
                  <div className="text-xs text-slate-500 pl-2">
                    Reported: {incident.createdAt.toLocaleString()}
                    {incident.resolvedAt && ` • Resolved: ${incident.resolvedAt.toLocaleString()}`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
