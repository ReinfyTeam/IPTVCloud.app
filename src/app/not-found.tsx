import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 pt-16">
      <div className="w-full max-w-md animate-fade-up text-center">
        <div className="text-9xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-cyan-400 to-sky-600 opacity-80 mb-4">
          404
        </div>
        <h1 className="text-3xl font-bold text-white mb-4">Page not found</h1>
        <p className="text-slate-400 mb-8 max-w-sm mx-auto">
          The page you are looking for doesn't exist, has been removed, or is temporarily unavailable.
        </p>
        <Link 
          href="/home" 
          className="inline-flex items-center gap-2 rounded-full bg-cyan-500 px-8 py-3.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400 hover:scale-105 transition-all shadow-lg shadow-cyan-500/25"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Return Home
        </Link>
      </div>
    </div>
  );
}
