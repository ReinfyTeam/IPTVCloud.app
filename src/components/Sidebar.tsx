import React, { useMemo } from 'react';
import CustomSelect from './CustomSelect';
import { COUNTRY_NAMES, getCountryName } from '@/lib/countries';
import { getLanguageName } from '@/lib/languages';
import { getProxiedImageUrl } from '@/lib/image-proxy';

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
  timezone: string;
  setTimezone: (_v: string) => void;
  subdivision: string;
  setSubdivision: (_v: string) => void;
  city: string;
  setCity: (_v: string) => void;
  region: string;
  setRegion: (_v: string) => void;
  status: string;
  setStatus: (_v: string) => void;
  blocklist: string;
  setBlocklist: (_v: string) => void;
  favoritesOnly: boolean;
  setFavoritesOnly: (_v: boolean | ((_prev: boolean) => boolean)) => void;
  filterOptions: {
    countries: string[];
    categories: string[];
    languages: string[];
    resolutions: string[];
    timezones: string[];
    subdivisions: string[];
    cities: string[];
    regions: string[];
    blocklist: string[];
  };
  isMobileOpen: boolean;
  setIsMobileOpen: (_v: boolean) => void;
  sortBy: string;
  setSortBy: (v: string) => void;
};

const CATEGORY_ICONS: Record<string, string> = {
  music: 'music_note',
  movies: 'movie',
  news: 'newspaper',
  sports: 'sports_soccer',
  kids: 'child_care',
  entertainment: 'theater_comedy',
  documentary: 'visibility',
  education: 'school',
  lifestyle: 'style',
  religious: 'church',
  animation: 'animation',
  general: 'widgets',
  uncategorized: 'folder_open',
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
  resolution,
  setResolution,
  timezone,
  setTimezone,
  subdivision,
  setSubdivision,
  city,
  setCity,
  region,
  setRegion,
  status,
  setStatus,
  blocklist,
  setBlocklist,
  favoritesOnly,
  setFavoritesOnly,
  filterOptions,
  isMobileOpen,
  setIsMobileOpen,
  sortBy,
  setSortBy,
}: SidebarProps) {
  const countryOptions = useMemo(
    () =>
      filterOptions.countries.map((c) => ({
        label: getCountryName(c),
        value: c,
        image:
          c !== 'International'
            ? getProxiedImageUrl(`https://flagcdn.com/w80/${c.toLowerCase()}.png`)
            : undefined,
      })),
    [filterOptions.countries],
  );

  const categoryOptions = useMemo(
    () =>
      filterOptions.categories.map((c) => {
        const label = c || 'Uncategorized';
        return {
          label: label.charAt(0).toUpperCase() + label.slice(1).toLowerCase(),
          value: c || 'Uncategorized',
          icon: CATEGORY_ICONS[(c || '').toLowerCase()] || 'folder',
        };
      }),
    [filterOptions.categories],
  );

  const resolutionOptions = useMemo(
    () => filterOptions.resolutions.map((r) => ({ label: r, value: r, icon: 'high_quality' })),
    [filterOptions.resolutions],
  );

  const languageOptions = useMemo(
    () =>
      filterOptions.languages.map((l) => {
        const name = getLanguageName(l);
        // Map some languages to common flags
        const flagMap: Record<string, string> = {
          en: 'us',
          es: 'es',
          fr: 'fr',
          de: 'de',
          it: 'it',
          pt: 'pt',
          ru: 'ru',
          zh: 'cn',
          ja: 'jp',
          ko: 'kr',
          ar: 'sa',
          hi: 'in',
          tr: 'tr',
          nl: 'nl',
          pl: 'pl',
          vi: 'vn',
          th: 'th',
          id: 'id',
        };
        const flag = flagMap[l.toLowerCase()];
        return {
          label: name,
          value: l,
          image: flag ? getProxiedImageUrl(`https://flagcdn.com/w80/${flag}.png`) : undefined,
          icon: !flag ? 'language' : undefined,
        };
      }),
    [filterOptions.languages],
  );

  const timezoneOptions = useMemo(
    () => filterOptions.timezones.map((t) => ({ label: t, value: t, icon: 'schedule' })),
    [filterOptions.timezones],
  );

  const subdivisionOptions = useMemo(
    () => filterOptions.subdivisions.map((s) => ({ label: s, value: s, icon: 'map' })),
    [filterOptions.subdivisions],
  );

  const cityOptions = useMemo(
    () => filterOptions.cities.map((c) => ({ label: c, value: c, icon: 'location_city' })),
    [filterOptions.cities],
  );

  const regionOptions = useMemo(
    () => filterOptions.regions.map((r) => ({ label: r, value: r, icon: 'public' })),
    [filterOptions.regions],
  );

  const sortOptions = [
    { label: 'Sort by Name', value: 'name', icon: 'sort_by_alpha' },
    { label: 'Most Viewed', value: 'viewers', icon: 'visibility' },
    { label: 'Recommended', value: 'recommended', icon: 'auto_awesome' },
    { label: 'Newest Added', value: 'newest', icon: 'fiber_new' },
    { label: 'Featured', value: 'featured', icon: 'grade' },
    { label: 'Top Rated', value: 'favorites', icon: 'star' },
    { label: 'By Subdivision', value: 'subdivision', icon: 'map' },
    { label: 'By City', value: 'city', icon: 'location_city' },
    { label: 'By Region', value: 'region', icon: 'public' },
    { label: 'Offline First', value: 'offline', icon: 'signal_disconnected' },
    { label: 'Geo-Blocked First', value: 'geo-blocked', icon: 'public_off' },
  ];

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
        className={`fixed top-0 bottom-0 left-0 z-[70] w-full sm:w-80 transform border-r border-white/[0.06] bg-slate-950 transition-transform duration-500 ease-in-out lg:translate-x-0 lg:top-16 ${
          isMobileOpen ? 'translate-x-0 shadow-2xl shadow-black' : '-translate-x-full'
        } transform-gpu`}
      >
        <div className="flex h-full flex-col p-6 sm:p-6 space-y-8 overflow-y-auto scrollbar-hide pt-20 lg:pt-6">
          {/* Mobile Close Button */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden absolute top-6 right-6 h-10 w-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white"
          >
            <span className="material-icons">close</span>
          </button>

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
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-1 mb-2">
              Discovery & Content Filters
            </h3>

            <div className="relative group/search mb-4">
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

            <div className="space-y-4">
              <div>
                <div className="text-[9px] uppercase tracking-widest text-slate-500 mb-1 ml-1 font-bold">
                  Sort Order
                </div>
                <CustomSelect
                  label="Sort By"
                  options={sortOptions}
                  value={sortBy}
                  onChange={setSortBy}
                  placeholder="Recommended"
                />
              </div>

              <div>
                <div className="text-[9px] uppercase tracking-widest text-slate-500 mb-1 ml-1 font-bold">
                  Content Type
                </div>
                <CustomSelect
                  label="Category"
                  options={categoryOptions}
                  value={category}
                  onChange={setCategory}
                  placeholder="All Categories"
                />
                <p className="text-[9px] text-slate-600 mt-1 ml-1">Filter by programming genre</p>
              </div>

              <div>
                <div className="text-[9px] uppercase tracking-widest text-slate-500 mb-1 ml-1 font-bold">
                  Geography
                </div>
                <CustomSelect
                  label="Country"
                  options={countryOptions}
                  value={country}
                  onChange={setCountry}
                  placeholder="All Countries"
                />
                <p className="text-[9px] text-slate-600 mt-1 ml-1">Filter by origin country</p>
              </div>

              <div>
                <CustomSelect
                  label="Language"
                  options={languageOptions}
                  value={language}
                  onChange={setLanguage}
                  placeholder="All Languages"
                />
                <p className="text-[9px] text-slate-600 mt-1 ml-1">
                  Filter by broadcast language (ISO 639)
                </p>
              </div>

              {regionOptions.length > 0 && (
                <div>
                  <CustomSelect
                    label="Region"
                    options={regionOptions}
                    value={region}
                    onChange={setRegion}
                    placeholder="All Regions"
                  />
                  <p className="text-[9px] text-slate-600 mt-1 ml-1">
                    Filter by broader world regions
                  </p>
                </div>
              )}

              {subdivisionOptions.length > 0 && (
                <div>
                  <CustomSelect
                    label="Subdivision"
                    options={subdivisionOptions}
                    value={subdivision}
                    onChange={setSubdivision}
                    placeholder="All Subdivisions"
                  />
                  <p className="text-[9px] text-slate-600 mt-1 ml-1">Filter by state or province</p>
                </div>
              )}

              {cityOptions.length > 0 && (
                <div>
                  <CustomSelect
                    label="City"
                    options={cityOptions}
                    value={city}
                    onChange={setCity}
                    placeholder="All Cities"
                  />
                </div>
              )}

              <div>
                <div className="text-[9px] uppercase tracking-widest text-slate-500 mb-1 ml-1 font-bold">
                  Technical
                </div>
                <CustomSelect
                  label="Resolution"
                  options={resolutionOptions}
                  value={resolution}
                  onChange={setResolution}
                  placeholder="All Qualities"
                />
                <p className="text-[9px] text-slate-600 mt-1 ml-1">
                  Filter by video format (e.g. 1080p, 720p)
                </p>
              </div>

              <div>
                <CustomSelect
                  label="Timezone"
                  options={timezoneOptions}
                  value={timezone}
                  onChange={setTimezone}
                  placeholder="All Timezones"
                />
                <p className="text-[9px] text-slate-600 mt-1 ml-1">
                  Filter by broadcast timezone (tz db)
                </p>
              </div>

              <div>
                <CustomSelect
                  label="Status"
                  options={[
                    { label: 'All Streams', value: '', icon: 'stream' },
                    { label: 'Online Only', value: 'online', icon: 'check_circle' },
                    { label: 'Offline Only', value: 'offline', icon: 'error' },
                    { label: 'Geo-Blocked', value: 'geo-blocked', icon: 'public_off' },
                  ]}
                  value={status}
                  onChange={setStatus}
                  placeholder="Any Status"
                />
              </div>
            </div>
          </div>

          {(search ||
            country ||
            category ||
            resolution ||
            language ||
            timezone ||
            subdivision ||
            city ||
            region ||
            blocklist ||
            favoritesOnly) && (
            <div className="pt-4">
              <button
                onClick={() => {
                  setSearch('');
                  setCountry('');
                  setCategory('');
                  setResolution('');
                  setLanguage('');
                  setTimezone('');
                  setSubdivision('');
                  setCity('');
                  setRegion('');
                  setBlocklist('');
                  setFavoritesOnly(false);
                  setSortBy('recommended');
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
