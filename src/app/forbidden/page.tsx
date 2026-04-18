import { BRAND_NAME } from '@/components/Brand';
import Link from 'next/link';
import SupportTicketForm from '@/components/SupportTicketForm';

export default function Forbidden() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-24">
      <div className="w-full max-w-lg animate-fade-up text-center">
        <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-[32px] bg-red-500/10 border border-red-500/20 shadow-2xl shadow-red-950/20">
          <svg
            className="h-12 w-12 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">Access Restricted</h1>
        <p className="text-slate-400 mb-12 max-w-sm mx-auto leading-relaxed">
          You do not have permission to access this page. If you believe this is an error or wish to
          appeal a restriction, please use the form below.
        </p>

        <div className="bg-white/[0.02] border border-white/[0.08] p-8 rounded-[40px] backdrop-blur-xl shadow-2xl text-left mb-8">
          <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-6 px-1">
            Submit an Appeal
          </h2>
          <SupportTicketForm initialType="APPEAL" />
        </div>

        <Link
          href="/home"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-white transition-all uppercase tracking-widest"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Return to Safety
        </Link>
      </div>
    </div>
  );
}
