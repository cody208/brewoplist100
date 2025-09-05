# BrewOps Starter (Next.js + Supabase)

**Quickstart**
1) Install Node LTS and pnpm (or npm).
2) `pnpm install`
3) `cp .env.example .env.local` and fill with your Supabase creds.
4) In Supabase SQL editor, run `db/schema.sql` then `db/seed.sql`.
5) `pnpm dev` → http://localhost:3000

Pages:
- `/admin/templates` — create templates (MVP)
- `/work` — start a run and submit
- `/review` — approve a run (emails stubbed in `/app/api/notify/route.ts`)
