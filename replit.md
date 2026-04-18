# IPTVCloud.app

Production-ready IPTV SaaS — premium live TV browser built with Next.js 13 App Router, TypeScript, TailwindCSS v4, Prisma + PostgreSQL, Zustand, and HLS.js.

## Architecture

**Stack:**
- Next.js 13.4 (App Router) — server components + client components
- TypeScript (strict mode)
- TailwindCSS v4 with `@tailwindcss/postcss`
- Prisma ORM with PostgreSQL (Replit DB)
- Zustand with `persist` middleware for client state
- HLS.js for adaptive stream playback
- bcryptjs for password hashing (12 rounds)
- jsonwebtoken for JWT auth

**Port:** 5000 (`npm run dev` → `next dev -p 5000 -H 0.0.0.0`)

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/        login, register, logout, me
│   │   ├── user/        me (PATCH), settings (GET/PUT), history (GET/POST/DELETE)
│   │   ├── settings/    update (POST)
│   │   ├── admin/       users, suspend, refresh-channels, probe-channels
│   │   ├── channels/    GET (paginated)
│   │   ├── epg/         [id] GET
│   │   └── health/      GET
│   ├── admin/           Admin dashboard page
│   ├── login/           Login page
│   ├── register/        Register page
│   ├── profile/         Profile + watch history
│   ├── settings/        Settings page
│   ├── globals.css      Premium dark theme
│   ├── layout.tsx       Root layout with Navbar
│   └── page.tsx         Home — async server component loading channels
├── components/
│   ├── Navbar.tsx       Fixed nav with auth state (mounted guard)
│   ├── Player.tsx       HLS.js player with PiP, screenshot, theater mode, sleep timer
│   ├── ChannelBrowser.tsx  Full browser: hero, player, facets, grid/list, pagination
│   ├── ChannelCard.tsx  Grid + list mode cards
│   ├── AdminDashboard.tsx  Tabbed admin (users/channels/system)
│   └── EpgStrip.tsx     Now/Next EPG strip
├── hooks/
│   └── use-player-shortcuts.ts  Keyboard controls
├── lib/
│   ├── prisma.ts        Singleton PrismaClient
│   ├── rate-limit.ts    In-memory rate limiter
│   ├── cookies.ts       httpOnly JWT cookie helpers
│   └── m3uParser.ts     M3U parser (parses tvg-id for country, group-title for category)
├── services/
│   ├── auth-service.ts  Auth logic: hash, verify, sign JWT, authorize
│   ├── channel-service.ts  Fetch+cache+dedupe M3U channels
│   ├── cache-service.ts    In-memory / Upstash Redis cache
│   ├── epg-service.ts   XMLTV EPG fetching
│   └── health-service.ts   Stream health probing
├── store/
│   ├── auth-store.ts    User + token (Zustand persist)
│   ├── favorites-store.ts  Channel IDs (Zustand persist)
│   ├── history-store.ts    Watch history (Zustand persist)
│   ├── settings-store.ts   UI settings (Zustand persist)
│   └── player-store.ts     Selected channel + view mode
└── types/
    ├── auth.ts           AuthUser, AuthPayload, AuthResponse
    ├── channel.ts        Channel, ChannelDataset, PaginatedChannels
    ├── epg.ts            EpgProgram, EpgLookupResult
    └── settings.ts       UserSettings, ACCENT_COLORS, DEFAULT_SETTINGS
```

## Environment Variables

Required:
- `DATABASE_URL` — PostgreSQL connection URL (auto-set by Replit)
- `JWT_SECRET` — Secret for JWT signing
- `ADMIN_API_KEY` — Admin API key

Optional:
- `ADMIN_EMAILS` — Comma-separated emails auto-promoted to ADMIN on register
- `M3U_PRIMARY_URL` — Override default iptv-org M3U URL
- `M3U_CACHE_TTL` — Cache TTL in seconds (default: 600)
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` — Redis cache (falls back to in-memory)

## Auth Flow

1. `POST /api/auth/register` or `POST /api/auth/login` → returns JWT in httpOnly cookie + response body
2. Client stores token in Zustand persist store (localStorage)
3. All protected API routes call `authorizeRequest(req)` which checks: 1. httpOnly cookie, 2. Authorization header
4. `ADMIN_EMAILS` env var auto-sets role=ADMIN for listed emails on first register

## Channel Data

- Source: `https://iptv-org.github.io/iptv/index.m3u` (iptv-org)
- ~12,000 channels from 177 countries, 29 categories
- Parsed from M3U: `tvg-id` for EPG ID + country code extraction, `group-title` for category, `tvg-logo`, `tvg-language`
- Cached in-memory (or Redis) with 10-minute TTL
- Deduped by EPG ID or stream URL

## Database Schema

**User:** id, email, password (bcrypt), name, role (USER/ADMIN), suspendedAt, suspensionReason
**UserSettings:** userId FK, accentColor, playerLayout, defaultVolume, autoplay, performanceMode, language, darkMode, showEpg
**WatchHistory:** userId FK, channelId, channelName, channelLogo, watchedAt
**Favorite:** userId FK, channelId, channelName, channelLogo, createdAt
