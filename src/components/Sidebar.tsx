import React from 'react';

type SidebarProps = {
  search: string;
  setSearch: (v: string) => void;
  country: string;
  setCountry: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  language: string;
  setLanguage: (v: string) => void;
  favoritesOnly: boolean;
  setFavoritesOnly: (v: boolean | ((prev: boolean) => boolean)) => void;
  filterOptions: { countries: string[]; categories: string[]; languages: string[] };
  isMobileOpen: boolean;
  setIsMobileOpen: (v: boolean) => void;
};

export default function Sidebar({
  search,
  setSearch,
  country,
  setCountry,
  category,
  setCategory,
  language,
  setLanguage,
  favoritesOnly,
  setFavoritesOnly,
  filterOptions,
  isMobileOpen,
  setIsMobileOpen,
}: SidebarProps) {
  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-16 bottom-0 left-0 z-[70] w-64 transform border-r border-white/[0.06] bg-slate-950/80 backdrop-blur-xl transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col p-4 space-y-6">
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Search</h3>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8"/>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35"/>
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search channels..."
                className="w-full rounded-xl border border-white/[0.07] bg-slate-950/80 py-2.5 pl-9 pr-4 text-sm text-white placeholder:text-slate-500 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/25 transition-all"
              />
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Filters</h3>
            <button
              onClick={() => setFavoritesOnly((v) => !v)}
              className={`w-full rounded-xl border px-3 py-2 text-sm text-left transition-all ${
                favoritesOnly
                  ? 'border-amber-400/50 bg-amber-400/10 text-amber-300'
                  : 'border-white/[0.07] bg-white/[0.03] text-slate-400 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              {favoritesOnly ? '★ Favorites Only' : '☆ All Channels'}
            </button>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2.5 text-sm text-slate-300 outline-none hover:border-white/15 focus:border-cyan-500/50 transition-colors cursor-pointer appearance-none"
            >
              <option value="">All Categories</option>
              {filterOptions.categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>

            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2.5 text-sm text-slate-300 outline-none hover:border-white/15 focus:border-cyan-500/50 transition-colors cursor-pointer appearance-none"
            >
              <option value="">All Countries</option>
              {filterOptions.countries.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>

            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full rounded-xl border border-white/[0.07] bg-slate-950 px-3 py-2.5 text-sm text-slate-300 outline-none hover:border-white/15 focus:border-cyan-500/50 transition-colors cursor-pointer appearance-none"
            >
              <option value="">All Languages</option>
              {filterOptions.languages.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          {(search || country || category || language || favoritesOnly) && (
            <button
              onClick={() => { setSearch(''); setCountry(''); setCategory(''); setLanguage(''); setFavoritesOnly(false); }}
              className="mt-4 w-full rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-400 hover:bg-red-500/20 transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
