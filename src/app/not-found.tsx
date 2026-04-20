import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 pt-32 pb-20 bg-slate-950">
      <div className="w-full max-w-md animate-fade-up text-center space-y-8">
        <div className="relative inline-block">
          <div className="text-9xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-cyan-400 to-sky-600 opacity-20 italic">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="material-icons text-6xl text-cyan-400">explore_off</span>
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-3xl sm:text-4xl font-black text-white uppercase italic tracking-tighter">
            Signal Lost<span className="text-cyan-500">.</span>
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-xs mx-auto leading-relaxed font-medium">
            The page you are looking for has drifted out of range or no longer exists.
          </p>
        </div>

        <Link
          href="/home"
          className="inline-flex items-center gap-3 rounded-2xl bg-cyan-500 px-10 py-4 text-xs font-black uppercase tracking-widest text-slate-950 hover:bg-cyan-400 hover:scale-105 transition-all shadow-xl shadow-cyan-900/20 active:scale-95"
        >
          <span className="material-icons text-lg">home</span>
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
