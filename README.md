# IPTVCloud.app — Live TV Reimagined

Production-ready IPTV web application built with **Next.js 14**, **Prisma**, and **TailwindCSS**.

## 🚀 Features

- **SaaS Homepage:** Elegant centered hero banner with live channel background.
- **Pro Player:** YouTube-style overlay controls, context menus, and stats for nerds.
- **Global Search:** Instant suggestions and filtering by country, category, and resolution.
- **EPG Guide:** Full program schedules with images and automatic Wikipedia fallbacks.
- **Community:** Live chat on every stream with staff moderation and pinning.
- **Multi-Device Sync:** Synchronize favorites and watch history via secure account.

## 🛠️ Vercel Setup (Deployment)

### 1. Database

This project uses **Vercel Postgres** for production.

- Go to the **Storage** tab in your Vercel project.
- Create a new **Postgres** database.
- Click **Connect** to add the database environment variables automatically.

### 2. Environment Variables

Add these to your project settings:

- `DATABASE_URL`: (Auto-added by Vercel Postgres)
- `JWT_SECRET`: A long random string for authentication.
- `ADMIN_EMAILS`: Comma-separated emails for admin access (e.g., `you@example.com`).
- `M3U_PRIMARY_URL`: (Optional) Custom M3U playlist URL.

### 3. Deployment

The project is configured to automatically handle the database provider switch:

- **Build Command:** `npm run build`
- **Output Directory:** `.next`

After the first deployment, run `npx prisma db push` via the Vercel CLI or a temporary script to initialize your database schema.

## 💻 Local Development

1. Clone the repository.
2. Run `npm install`.
3. Run `npm run db:dev` to initialize the local **SQLite** database.
4. Run `npm run dev`.

---

Built with ❤️ by **ReinfyTeam**
