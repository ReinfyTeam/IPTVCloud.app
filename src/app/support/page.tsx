'use client';

import { BRAND_NAME } from '@/components/Brand';
import Link from 'next/link';
import SupportTicketForm from '@/components/SupportTicketForm';
import UserTicketList from '@/components/UserTicketList';
import { useAuthStore } from '@/store/auth-store';

export default function SupportPage() {
  const { user } = useAuthStore();

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-32 sm:py-24">
      <div className="w-full max-w-lg animate-fade-up text-center space-y-8">
        <div className="space-y-4">
          <div className="mx-auto mb-6 flex h-16 w-16 sm:h-24 sm:w-24 items-center justify-center rounded-2xl sm:rounded-[32px] bg-cyan-500/10 border border-cyan-500/20 shadow-2xl shadow-cyan-950/20">
            <span className="material-icons text-3xl sm:text-4xl text-cyan-400">
              confirmation_number
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tighter uppercase italic leading-none">
            Technical Support.
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-sm mx-auto leading-relaxed font-medium opacity-80">
            Need help with your account, reporting a bug, or requesting a feature? Our team is here
            to ensure your {BRAND_NAME} experience is flawless.
          </p>
        </div>

        {user ? (
          <div className="space-y-8 sm:space-y-12">
            <div className="bg-white/[0.02] border border-white/[0.08] p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] backdrop-blur-xl shadow-2xl text-left">
              <h2 className="text-[9px] sm:text-[10px] font-black text-white uppercase tracking-[0.3em] mb-6 px-1 opacity-60">
                Submit a Ticket
              </h2>
              <SupportTicketForm initialType="SUPPORT" />
            </div>

            <UserTicketList />
          </div>
        ) : (
          <div className="bg-white/[0.02] border border-white/[0.08] p-8 sm:p-12 rounded-[32px] sm:rounded-[40px] backdrop-blur-xl shadow-2xl text-center space-y-6">
            <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto text-amber-400 border border-amber-500/20">
              <span className="material-icons">lock</span>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg sm:text-xl font-bold text-white">Registered Users Only</h3>
              <p className="text-slate-500 text-xs sm:text-sm font-medium">
                To prevent spam and provide better tracking of your requests, support tickets are
                exclusive to registered community members.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Link
                href="/account/signin"
                className="w-full py-3.5 sm:py-4 rounded-xl sm:rounded-2xl bg-cyan-500 text-slate-950 font-black text-[10px] sm:text-xs uppercase tracking-widest hover:bg-cyan-400 transition-all active:scale-95"
              >
                Sign In to access
              </Link>
              <Link
                href="/account/signup"
                className="w-full py-3.5 sm:py-4 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 text-white font-black text-[10px] sm:text-xs uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95"
              >
                Create an Account
              </Link>
            </div>
          </div>
        )}

        <Link
          href="/home"
          className="inline-flex items-center gap-2 text-[9px] sm:text-[10px] font-black text-slate-500 hover:text-white transition-all uppercase tracking-[0.2em] pt-4"
        >
          <span className="material-icons text-sm">west</span>
          Return to safety
        </Link>
      </div>
    </div>
  );
}
