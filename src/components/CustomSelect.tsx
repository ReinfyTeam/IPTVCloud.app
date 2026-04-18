'use client';

import React, { useState, useRef, useEffect } from 'react';

type Option = { label: string; value: string; icon?: string; image?: string };

type Props = {
  label: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export default function CustomSelect({ label, options, value, onChange, placeholder }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((o) => o.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full space-y-2">
      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-slate-900/50 p-4 text-sm text-white hover:border-white/20 transition-all outline-none focus:border-cyan-500/50 active:scale-[0.98] transform-gpu shadow-inner"
      >
        <div className="flex items-center gap-3 truncate">
          {selectedOption?.image ? (
            <img
              src={selectedOption.image}
              alt=""
              className="h-4 w-5 rounded-sm object-cover shadow-sm"
            />
          ) : selectedOption?.icon ? (
            <span className="material-icons text-lg">{selectedOption.icon}</span>
          ) : null}
          <span className={selectedOption ? 'text-white font-medium' : 'text-slate-500'}>
            {selectedOption ? selectedOption.label : placeholder || 'Select option'}
          </span>
        </div>
        <svg
          className={`h-4 w-4 text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-2 max-h-60 overflow-y-auto rounded-3xl border border-white/[0.08] bg-slate-900/95 backdrop-blur-xl shadow-2xl shadow-black/50 p-1.5 animate-fade-in scrollbar-hide">
          <div
            onClick={() => {
              onChange('');
              setIsOpen(false);
            }}
            className="flex items-center p-3 rounded-2xl hover:bg-white/5 text-sm text-slate-400 hover:text-white transition-all cursor-pointer active:scale-[0.98]"
          >
            {placeholder || 'All Options'}
          </div>
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 text-sm transition-all cursor-pointer active:scale-[0.98] ${value === opt.value ? 'bg-cyan-500/10 text-cyan-400 font-bold' : 'text-slate-300 hover:text-white'}`}
            >
              {opt.image ? (
                <img src={opt.image} alt="" className="h-4 w-5 rounded-sm object-cover shadow-sm" />
              ) : opt.icon ? (
                <span className="material-icons text-lg">{opt.icon}</span>
              ) : null}
              <span className="truncate">{opt.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
