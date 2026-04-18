'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

type Props = {
  label: string;
  items: { label: string; href: string; icon?: string; badge?: string }[];
  active?: boolean;
};

export default function NavbarDropdown({ label, items, active }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative group/nav">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
          active || isOpen
            ? 'bg-white/10 text-white shadow-lg shadow-white/5'
            : 'text-slate-400 hover:text-white hover:bg-white/5'
        }`}
      >
        {label}
        <svg
          className={`h-4 w-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 min-w-[200px] rounded-2xl border border-white/[0.08] bg-slate-900/95 backdrop-blur-xl shadow-2xl shadow-black/50 overflow-hidden animate-fade-in z-50 transform-gpu p-1.5">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-white/5 text-sm text-slate-300 hover:text-white transition-all group/item active:scale-[0.98]"
            >
              <div className="flex items-center gap-2.5">
                {item.icon && <span className="text-lg opacity-70 group-hover/item:opacity-100 transition-opacity">{item.icon}</span>}
                <span className="font-medium">{item.label}</span>
              </div>
              {item.badge && (
                <span className="px-1.5 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 text-[9px] font-bold uppercase tracking-tighter">
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
