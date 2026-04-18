import React, { useMemo } from 'react';
import CustomSelect from './CustomSelect';
import { COUNTRY_NAMES } from '@/lib/countries';

type SidebarProps = {
  search: string;
  setSearch: (_v: string) => void;
  country: string;
  setCountry: (_v: string) => void;
  category: string;
  setCategory: (_v: string) => void;
  language: string;
  setLanguage: (_v: string) => void;
  resolution: string;
  setResolution: (_v: string) => void;
  favoritesOnly: boolean;
  setFavoritesOnly: (_v: boolean | ((_prev: boolean) => boolean)) => void;
  filterOptions: {
    countries: string[];
    categories: string[];
    languages: string[];
    resolutions: string[];
  };
  isMobileOpen: boolean;
  setIsMobileOpen: (_v: boolean) => void;
};

const REVERSE_COUNTRY_MAP: Record<string, string> = {};
Object.entries(COUNTRY_NAMES).forEach(([code, name]) => {
  REVERSE_COUNTRY_MAP[name.toUpperCase()] = code.toLowerCase();
});

export default function Sidebar({
  search,
  setSearch,
  country,
  setCountry,
  category,
  setCategory,
  language,
  setLanguage,
  resolution,
  setResolution,
  favoritesOnly,
  setFavoritesOnly,
  filterOptions,
  isMobileOpen,
  setIsMobileOpen,
}: SidebarProps) {
  const countryOptions = useMemo(
    () =>
      filterOptions.countries.map((c) => ({
        label: c,
        value: c,
        image: REVERSE_COUNTRY_MAP[c.toUpperCase()]
          ? `https://flagcdn.com/w40/${REVERSE_COUNTRY_MAP[c.toUpperCase()]}.png`
          : undefined,
      })),
    [filterOptions.countries],
  );

  const categoryOptions = useMemo(
    () => filterOptions.categories.map((c) => ({ label: c, value: c, icon: 'folder' })),
    [filterOptions.categories],
  );

  const languageOptions = useMemo(
    () => filterOptions.languages.map((l) => ({ label: l, value: l, icon: 'language' })),
    [filterOptions.languages],
  );

  const resolutionOptions = useMemo(
    () => filterOptions.resolutions.map((r) => ({ label: r, value: r, icon: 'high_quality' })),
    [filterOptions.resolutions],
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-16 bottom-0 left-0 z-[70] w-72 transform border-r border-white/[0.06] bg-slate-950/80 backdrop-blur-2xl transition-transform duration-500 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0 shadow-2xl shadow-black' : '-translate-x-full'
        } transform-gpu`}
      >
        <div className="flex h-full flex-col p-6 space-y-8 overflow-y-auto scrollbar-hide">
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-1">
              Navigation
            </h3>
            <div className="space-y-1">
              <button
                onClick={() => setFavoritesOnly((v) => !v)}
                className={`w-full flex items-center justify-between rounded-2xl border p-4 text-sm transition-all active:scale-95 transform-gpu ${
                  favoritesOnly
                    ? 'border-amber-400/30 bg-amber-400/10 text-amber-300 shadow-lg shadow-amber-950/20'
                    : 'border-white/[0.07] bg-white/[0.03] text-slate-400 hover:border-white/20 hover:bg-white/[0.06]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="material-icons text-xl">
                    {favoritesOnly ? 'star' : 'star_border'}
                  </span>
                  <span className="font-bold">My Favorites</span>
                </div>
                {favoritesOnly && (
                  <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-1">
              Filters & Search
            </h3>

            <div className="relative group/search">
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within/search:text-cyan-400 transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <circle cx="11" cy="11" r="8" />
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search channels..."
                className="w-full rounded-2xl border border-white/[0.08] bg-slate-900/50 py-4 pl-11 pr-4 text-sm text-white placeholder:text-slate-500 outline-none focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 transition-all shadow-inner"
              />
            </div>

            <CustomSelect
              label="Category"
              options={categoryOptions}
              value={category}
              onChange={setCategory}
              placeholder="All Categories"
            />

            <CustomSelect
              label="Country"
              options={countryOptions}
              value={country}
              onChange={setCountry}
              placeholder="All Countries"
            />

            <CustomSelect
              label="Language"
              options={languageOptions}
              value={language}
              onChange={setLanguage}
              placeholder="All Languages"
            />

            <CustomSelect
              label="Resolution"
              options={resolutionOptions}
              value={resolution}
              onChange={setResolution}
              placeholder="All Qualities"
            />
          </div>

          {(search || country || category || language || resolution || favoritesOnly) && (
            <div className="pt-4">
              <button
                onClick={() => {
                  setSearch('');
                  setCountry('');
                  setCategory('');
                  setLanguage('');
                  setResolution('');
                  setFavoritesOnly(false);
                }}
                className="w-full rounded-2xl border border-red-500/20 bg-red-500/10 py-4 text-[10px] font-bold uppercase tracking-widest text-red-400 hover:bg-red-500/20 transition-all active:scale-95 transform-gpu"
              >
                Reset All Filters
              </button>
            </div>
          )}

          <div className="mt-auto pt-8 border-t border-white/[0.05]">
            <div className="rounded-3xl bg-gradient-to-br from-indigo-500/10 to-cyan-500/10 border border-white/5 p-6">
              <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-2 text-center">
                Cloud Streaming
              </div>
              <p className="text-[11px] text-slate-500 text-center leading-relaxed">
                Your preferences are automatically synced across devices.
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
