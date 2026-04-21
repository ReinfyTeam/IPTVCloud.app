'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

type Option = { label: string; value: string; icon?: string; image?: string };

type Props = {
  label: string;
  options: Option[];
  value: string;
  onChange: (_value: string) => void;
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
        className="w-full flex items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-slate-900/50 p-4 text-sm text-white hover:border-white/20 transition-all outline-none focus:border-accent active:scale-[0.98] transform-gpu shadow-inner"
      >
        <div className="flex items-center gap-3 truncate">
          {selectedOption?.image ? (
            <Image
              src={selectedOption.image}
              alt=""
              width={20}
              height={16}
              className="h-4 w-5 rounded-sm object-cover shadow-sm"
            />
          ) : selectedOption?.icon ? (
            <span className="material-icons text-base">{selectedOption.icon}</span>
          ) : null}
          <span className="truncate">{selectedOption?.label || placeholder || 'Select...'}</span>
        </div>
        <span className="material-icons text-slate-500">
          {isOpen ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-2 rounded-2xl border border-white/[0.08] bg-slate-900 shadow-2xl backdrop-blur-xl p-2 z-50">
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 text-sm transition-all cursor-pointer active:scale-[0.98] ${value === opt.value ? 'bg-accent/10 text-accent font-bold' : 'text-slate-300 hover:text-white'}`}
            >
              {opt.image ? (
                <Image
                  src={opt.image}
                  alt=""
                  width={20}
                  height={16}
                  className="h-4 w-5 rounded-sm object-cover shadow-sm"
                />
              ) : opt.icon ? (
                <span className="material-icons text-base">{opt.icon}</span>
              ) : null}
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
