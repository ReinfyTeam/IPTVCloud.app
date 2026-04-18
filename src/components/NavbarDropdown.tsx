'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

type DropdownItem = {
  label: string;
  href: string;
  icon?: string;
  badge?: string;
};

type Props = {
  label: string;
  items: DropdownItem[];
  active?: boolean;
};

export default function NavbarDropdown({ label, items, active }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hide = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    window.addEventListener('mousedown', hide);
    return () => window.removeEventListener('mousedown', hide);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`rounded-full px-5 py-2.5 text-xs font-black uppercase tracking-widest transition-all duration-200 flex items-center gap-2 active:scale-95 ${
          active || isOpen
            ? 'bg-white/10 text-white shadow-lg'
            : 'text-slate-500 hover:text-white hover:bg-white/5'
        }`}
      >
        {label}
        <span
          className={`material-icons text-sm transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        >
          expand_more
        </span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-3 w-64 rounded-[32px] border border-white/[0.08] bg-slate-900/95 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden animate-fade-in z-50 transform-gpu p-2">
          <div className="grid gap-1">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between p-4 hover:bg-white/5 rounded-2xl transition-all active:scale-[0.98] group/item"
              >
                <div className="flex items-center gap-4">
                  {item.icon && (
                    <div className="h-9 w-9 rounded-xl bg-slate-800 border border-white/5 flex items-center justify-center text-slate-500 group-hover/item:text-cyan-400 group-hover/item:border-cyan-500/20 transition-all">
                      <span className="material-icons text-lg">{item.icon}</span>
                    </div>
                  )}
                  <span className="text-[11px] font-black text-slate-400 group-hover/item:text-white transition-colors uppercase tracking-widest">
                    {item.label}
                  </span>
                </div>
                {item.badge && (
                  <span className="px-2 py-0.5 rounded-md bg-cyan-500 text-slate-950 text-[8px] font-black uppercase tracking-tighter">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
