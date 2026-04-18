import Link from 'next/link';

export default function Forbidden() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 pt-16">
      <div className="w-full max-w-md animate-fade-up text-center">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
          <svg className="h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-white mb-4">Access Restricted</h1>
        <p className="text-slate-400 mb-8 max-w-sm mx-auto">
          You do not have permission to access this page. This area is restricted to administrators only.
        </p>
        <Link 
          href="/home" 
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-md px-8 py-3.5 text-sm font-medium text-white hover:bg-white/[0.08] transition-all"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
