'use client';

import React, { useEffect, useState, Suspense, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface ChallengeData {
  type: 'IMAGE' | 'TEXT' | 'MATH' | 'CLICK';
  question: string;
  options?: string[];
  token: string;
}

function SecurityCheckContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rayId] = useState(() => Math.random().toString(36).substring(2, 10).toUpperCase());
  const [challenge, setChallenge] = useState<ChallengeData | null>(null);
  const [status, setStatus] = useState('Checking your browser...');
  const [solution, setSolution] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isViolation = searchParams.get('violation') === '1';

  // Click challenge state
  const clickStartTime = useRef<number | null>(null);
  const [isHolding, setIsHolding] = useState(false);

  const fetchChallenge = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSolution('');
    try {
      const res = await fetch('/api/security/challenge');
      const data = await res.json();
      setChallenge(data);
      setLoading(false);
      setStatus(isViolation ? 'Security Policy Violation Detected' : 'Please verify you are human');
    } catch (err) {
      setError('Failed to load challenge. Please refresh.');
    }
  }, [isViolation]);

  useEffect(() => {
    fetchChallenge();
  }, [fetchChallenge]);

  const handleVerify = async (providedSolution?: string) => {
    const finalSolution = providedSolution || solution;
    if (!finalSolution || !challenge) return;

    setLoading(true);
    setStatus('Verifying...');

    const fingerprint = {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screen: `${window.screen.width}x${window.screen.height}`,
      language: navigator.language,
    };

    try {
      const response = await fetch('/api/security/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...fingerprint,
          token: challenge.token,
          solution: finalSolution,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(true);
        setStatus('Verified! Redirecting...');
        const from = searchParams.get('from') || '/';
        setTimeout(() => router.replace(decodeURIComponent(from)), 1000);
      } else {
        setError(result.error || 'Verification failed. Try again.');
        setLoading(false);
        setSolution('');
        // Refresh challenge on failure
        setTimeout(fetchChallenge, 1500);
      }
    } catch (error) {
      setError('Connection error. Please try again.');
      setLoading(false);
    }
  };

  // --- Click Challenge Logic ---
  const startHold = () => {
    clickStartTime.current = Date.now();
    setIsHolding(true);
  };

  const endHold = () => {
    if (!clickStartTime.current) return;
    const duration = Date.now() - clickStartTime.current;
    if (duration >= 3000) {
      handleVerify('HOLD_SUCCESS');
    } else {
      setError('Hold for at least 3 seconds');
    }
    setIsHolding(false);
    clickStartTime.current = null;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#020617] text-white p-6 font-sans selection:bg-cyan-500/30">
      <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in duration-500">
        {/* Header */}
        <div className="flex flex-col items-center space-y-6 text-center">
          <div className="relative h-20 w-20">
            <div
              className={`absolute inset-0 rounded-full border-4 border-white/5 ${loading ? 'border-t-cyan-500 animate-spin' : 'border-t-slate-700'}`}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className={`material-icons ${success ? 'text-emerald-500' : 'text-cyan-500'} text-4xl transition-colors duration-300`}
              >
                {success ? 'verified' : 'shield'}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tighter uppercase italic">
              IPTV<span className="text-cyan-500">Cloud</span> Shield
            </h1>
            <p className={`text-lg font-bold ${error ? 'text-red-400' : 'text-slate-300'}`}>
              {status}
            </p>
          </div>
        </div>

        {/* Challenge Card */}
        <div className="glass rounded-[40px] border border-white/5 bg-white/5 p-8 shadow-2xl backdrop-blur-3xl relative overflow-hidden">
          {success && (
            <div className="absolute inset-0 bg-emerald-500/10 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
              <div className="flex flex-col items-center space-y-2">
                <span className="material-icons text-emerald-500 text-6xl">check_circle</span>
                <span className="font-black uppercase tracking-widest text-emerald-400">
                  Success
                </span>
              </div>
            </div>
          )}

          {loading && !challenge && (
            <div className="flex flex-col items-center py-12 space-y-4">
              <div className="h-10 w-10 border-2 border-white/5 border-t-cyan-500 rounded-full animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Preparing Challenge...
              </p>
            </div>
          )}

          {challenge && !success && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 text-center leading-relaxed">
                {challenge.question}
              </h2>

              {/* IMAGE Challenge */}
              {challenge.type === 'IMAGE' && (
                <div className="grid grid-cols-3 gap-2">
                  {challenge.options?.map((img, i) => (
                    <button
                      key={i}
                      disabled={loading}
                      onClick={() => {
                        const current = solution.split(',').filter((x) => x !== '');
                        const idx = i.toString();
                        let next;
                        if (current.includes(idx)) {
                          next = current.filter((x) => x !== idx);
                        } else {
                          next = [...current, idx];
                        }
                        setSolution(next.join(','));
                      }}
                      className={`aspect-square bg-slate-800 rounded-xl overflow-hidden border-2 transition-all active:scale-95 ${solution.split(',').includes(i.toString()) ? 'border-cyan-500 ring-4 ring-cyan-500/20' : 'border-transparent hover:border-white/20'}`}
                    >
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-600 uppercase font-bold text-center p-2">
                        {img}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* TEXT/MATH Challenge */}
              {(challenge.type === 'TEXT' || challenge.type === 'MATH') && (
                <div className="space-y-4">
                  {challenge.type === 'TEXT' && (
                    <div className="bg-white/10 rounded-2xl p-6 text-center">
                      <span className="text-3xl font-black tracking-[0.3em] italic select-none blur-[0.5px]">
                        {challenge.options?.[0]}
                      </span>
                    </div>
                  )}
                  <input
                    autoFocus
                    type="text"
                    disabled={loading}
                    value={solution}
                    onChange={(e) => setSolution(e.target.value)}
                    placeholder="Type here..."
                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-center text-xl font-bold tracking-widest outline-none focus:border-cyan-500 transition-all placeholder:text-slate-700"
                  />
                </div>
              )}

              {/* CLICK Challenge */}
              {challenge.type === 'CLICK' && (
                <div className="flex flex-col items-center py-4 space-y-4">
                  <button
                    onMouseDown={startHold}
                    onMouseUp={endHold}
                    onMouseLeave={endHold}
                    onTouchStart={startHold}
                    onTouchEnd={endHold}
                    className={`h-24 w-24 rounded-full border-4 transition-all duration-300 flex items-center justify-center relative select-none ${isHolding ? 'border-cyan-500 bg-cyan-500/10 scale-90' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                  >
                    {isHolding && (
                      <div className="absolute inset-0 rounded-full border-4 border-t-cyan-500 animate-spin" />
                    )}
                    <span className="material-icons text-3xl">touch_app</span>
                  </button>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                    Hold to verify
                  </p>
                </div>
              )}

              {/* Submit Button */}
              {challenge.type !== 'CLICK' && (
                <button
                  disabled={loading || !solution}
                  onClick={() => handleVerify()}
                  className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-black uppercase py-4 rounded-2xl transition-all active:scale-95 shadow-lg shadow-cyan-500/20"
                >
                  Verify Human
                </button>
              )}
            </div>
          )}

          {error && !loading && (
            <p className="mt-4 text-xs text-red-400 text-center font-bold animate-pulse">{error}</p>
          )}

          <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                Ray ID
              </span>
              <span className="text-xs font-mono text-slate-500">{rayId}</span>
            </div>
            <button
              disabled={loading}
              onClick={fetchChallenge}
              className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-cyan-500 transition-colors disabled:opacity-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center space-y-4">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">
            Powered by IPTVCloud Enterprise Security
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SecurityCheckPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#020617] flex items-center justify-center">
          <div className="h-12 w-12 rounded-full border-2 border-white/5 border-t-cyan-500 animate-spin" />
        </div>
      }
    >
      <SecurityCheckContent />
    </Suspense>
  );
}
